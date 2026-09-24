const EXTRACTION_SCHEMA_VERSION = "timeline-evidence-extraction-v1";
const TOOL_VERSION = "1";
const MIN_NATIVE_PDF_TEXT = 48;
const MAX_SEGMENT_TEXT = 20000;
const MAX_PDF_PAGES = 120;
const MAX_RENDER_PIXELS = 4_000_000;

function text(value, max = MAX_SEGMENT_TEXT) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function abortIfNeeded(signal) {
  if (!signal?.aborted) return;
  if (typeof globalThis.DOMException === "function")
    throw new globalThis.DOMException("The operation was aborted.", "AbortError");
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  throw error;
}

function cleanOcrText(value) {
  let result = text(value);
  result = result.replace(/^\s*```(?:text)?\s*/i, "").replace(/\s*```\s*$/, "");
  result = result.replace(/^\s*(?:transcription|text)\s*:\s*/i, "");
  return result.trim().slice(0, MAX_SEGMENT_TEXT);
}

function pdfTextFromItems(items) {
  let result = "";
  for (const item of Array.isArray(items) ? items : []) {
    const part = text(item?.str, 5000);
    if (!part) continue;
    if (result && !result.endsWith("\n") && !/^\s/.test(part)) result += " ";
    result += part;
    if (item?.hasEOL) result += "\n";
  }
  return result.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_SEGMENT_TEXT);
}

function normalizeLocator(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.kind === "page" && Number.isInteger(Number(raw.page)) && Number(raw.page) >= 1) {
    return { kind: "page", page: Number(raw.page) };
  }
  if (raw.kind === "image") {
    return { kind: "image", index: Math.max(1, Number(raw.index) || 1) };
  }
  return null;
}

function normalizeSegment(raw, index = 0) {
  if (!raw || typeof raw !== "object") return null;
  const content = text(raw.text);
  if (!content) return null;
  const locator = normalizeLocator(raw.locator);
  if (!locator) return null;
  const method = ["pdf-text", "text-detector", "language-model-vision"].includes(raw.method)
    ? raw.method
    : "pdf-text";
  const confidence =
    raw.confidence === null || raw.confidence === undefined || raw.confidence === ""
      ? null
      : Number.isFinite(Number(raw.confidence))
        ? Math.max(0, Math.min(1, Number(raw.confidence)))
        : null;
  return {
    id: text(raw.id, 120) || `segment-${index + 1}`,
    locator,
    method,
    text: content,
    confidence
  };
}

function normalizeExtraction(raw) {
  if (!raw || typeof raw !== "object") return null;
  const segments = (Array.isArray(raw.segments) ? raw.segments : [])
    .map(normalizeSegment)
    .filter(Boolean)
    .slice(0, MAX_PDF_PAGES);
  const unresolved = (Array.isArray(raw.unresolved) ? raw.unresolved : [])
    .map((entry) => ({
      locator: normalizeLocator(entry?.locator),
      reason: text(entry?.reason, 500)
    }))
    .filter((entry) => entry.locator && entry.reason)
    .slice(0, MAX_PDF_PAGES);
  if (!segments.length && !unresolved.length) return null;
  return {
    schemaVersion: EXTRACTION_SCHEMA_VERSION,
    status: ["complete", "partial", "empty", "failed"].includes(raw.status) ? raw.status : (unresolved.length ? "partial" : "complete"),
    mimeType: text(raw.mimeType, 120),
    generatedAt: text(raw.generatedAt, 80),
    tool: {
      name: text(raw.tool?.name, 120) || "Timeline Evidence Extraction",
      version: text(raw.tool?.version, 80) || TOOL_VERSION
    },
    segments,
    unresolved
  };
}

function visionOptions() {
  return {
    expectedInputs: [
      { type: "text", languages: ["en"] },
      { type: "image" }
    ],
    expectedOutputs: [{ type: "text", languages: ["en"] }]
  };
}

async function languageModelVisionAvailability(root = globalThis) {
  if (!root.LanguageModel || typeof root.LanguageModel.availability !== "function") {
    return "unavailable";
  }
  try {
    return String(await root.LanguageModel.availability(visionOptions()));
  } catch {
    return "unavailable";
  }
}

async function ocrWithTextDetector(source, root = globalThis) {
  if (typeof root.TextDetector !== "function") return null;
  try {
    const detections = await new root.TextDetector().detect(source);
    const ordered = [...(Array.isArray(detections) ? detections : [])].sort((a, b) => {
      const ay = Number(a?.boundingBox?.y) || 0;
      const by = Number(b?.boundingBox?.y) || 0;
      if (Math.abs(ay - by) > 4) return ay - by;
      return (Number(a?.boundingBox?.x) || 0) - (Number(b?.boundingBox?.x) || 0);
    });
    const result = ordered
      .map((entry) => text(entry?.rawValue ?? entry?.text ?? entry?.value, 4000))
      .filter(Boolean)
      .join("\n")
      .trim();
    return result ? { text: result.slice(0, MAX_SEGMENT_TEXT), method: "text-detector", confidence: null } : null;
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    return null;
  }
}

async function ocrWithLanguageModel(source, options = {}) {
  const root = options.root || globalThis;
  const model = options.languageModel || root.LanguageModel;
  if (!model || typeof model.create !== "function") return null;
  const availability =
    typeof model.availability === "function"
      ? String(await model.availability(visionOptions()).catch(() => "unavailable"))
      : "unavailable";
  if (availability === "unavailable") return null;

  abortIfNeeded(options.signal);
  const session = await model.create({
    ...visionOptions(),
    initialPrompts: [{
      role: "system",
      content: "You are an OCR transcription engine. Transcribe only text visibly present in the supplied image. Preserve reading order and line breaks. Never infer missing words, names, numbers, or context."
    }],
    signal: options.signal,
    monitor(monitor) {
      monitor.addEventListener("downloadprogress", (event) => {
        options.onProgress?.({
          phase: "model-download",
          loaded: Number(event.loaded) || 0
        });
      });
    }
  });

  try {
    const response = await session.prompt([
      {
        role: "user",
        content: [
          {
            type: "text",
            value: "Transcribe every legible visible character. Return an empty text field if no text is legible."
          },
          { type: "image", value: source }
        ]
      }
    ], {
      responseConstraint: {
        type: "object",
        additionalProperties: false,
        properties: { text: { type: "string" } },
        required: ["text"]
      },
      omitResponseConstraintInput: true,
      signal: options.signal
    });
    const parsed = JSON.parse(response);
    const result = cleanOcrText(parsed?.text);
    return result ? { text: result, method: "language-model-vision", confidence: null } : null;
  } finally {
    session.destroy?.();
  }
}

async function ocrImage(source, options = {}) {
  abortIfNeeded(options.signal);
  const root = options.root || globalThis;
  options.onProgress?.({ phase: "ocr", method: "text-detector" });
  const native = await ocrWithTextDetector(source, root);
  if (native?.text) return native;

  abortIfNeeded(options.signal);
  options.onProgress?.({ phase: "ocr", method: "language-model-vision" });
  return ocrWithLanguageModel(source, options);
}

function renderScaleForViewport(viewport) {
  const pixels = Math.max(1, Number(viewport?.width) || 1) * Math.max(1, Number(viewport?.height) || 1);
  if (pixels <= MAX_RENDER_PIXELS) return 1;
  return Math.sqrt(MAX_RENDER_PIXELS / pixels);
}

export function createEvidenceExtraction({
  pdfjs,
  pdfWorkerUrl = "",
  root = globalThis,
  now = () => new Date().toISOString(),
} = {}) {
  if (!pdfjs || typeof pdfjs.getDocument !== "function") {
    throw new Error("PDF.js getDocument() is required.");
  }

  function configurePdfWorker() {
    const workerOptions = pdfjs.GlobalWorkerOptions;
    if (!workerOptions || !root.document?.baseURI) return;
    workerOptions.workerSrc =
      pdfWorkerUrl || new URL("./pdf.worker.mjs", root.document.baseURI).href;
  }

  async function renderPdfPage(page, options = {}) {
    if (!root.document?.createElement) return null;
    const initial = page.getViewport({ scale: 1.75 });
    const scale = renderScaleForViewport(initial);
    const viewport = scale === 1 ? initial : page.getViewport({ scale: 1.75 * scale });
    const canvas = root.document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return null;
    await page.render({ canvasContext: context, viewport }).promise;
    abortIfNeeded(options.signal);
    return canvas;
  }

  async function extractPdf(blob, options = {}) {
    configurePdfWorker();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    abortIfNeeded(options.signal);
    const loadingTask = pdfjs.getDocument({ data: bytes });
    const document = await loadingTask.promise;
    const pageCount = Math.min(Number(document.numPages) || 0, options.maxPages || MAX_PDF_PAGES);
    const segments = [];
    const unresolved = [];

    try {
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        abortIfNeeded(options.signal);
        options.onProgress?.({ phase: "pdf-page", page: pageNumber, total: pageCount });
        const page = await document.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const nativeText = pdfTextFromItems(textContent?.items);
        if (nativeText.length >= MIN_NATIVE_PDF_TEXT) {
          segments.push({
            id: `page-${pageNumber}`,
            locator: { kind: "page", page: pageNumber },
            method: "pdf-text",
            text: nativeText,
            confidence: 1
          });
          page.cleanup?.();
          continue;
        }

        const canvas = await renderPdfPage(page, options);
        const ocr = canvas ? await ocrImage(canvas, { ...options, root }) : null;
        if (ocr?.text) {
          segments.push({
            id: `page-${pageNumber}`,
            locator: { kind: "page", page: pageNumber },
            method: ocr.method,
            text: ocr.text,
            confidence: ocr.confidence
          });
        } else if (nativeText) {
          segments.push({
            id: `page-${pageNumber}`,
            locator: { kind: "page", page: pageNumber },
            method: "pdf-text",
            text: nativeText,
            confidence: 1
          });
        } else {
          unresolved.push({
            locator: { kind: "page", page: pageNumber },
            reason: "No embedded text was found and OCR was unavailable or returned no legible text."
          });
        }
        if (canvas) {
          canvas.width = 1;
          canvas.height = 1;
        }
        page.cleanup?.();
      }
    } finally {
      await document.destroy?.();
      loadingTask.destroy?.();
    }

    return normalizeExtraction({
      status: unresolved.length ? (segments.length ? "partial" : "empty") : "complete",
      mimeType: blob.type || "application/pdf",
      generatedAt: now(),
      tool: { name: "Timeline Evidence Extraction", version: TOOL_VERSION },
      segments,
      unresolved
    });
  }

  async function extractImage(blob, options = {}) {
    options.onProgress?.({ phase: "image", page: 1, total: 1 });
    const ocr = await ocrImage(blob, { ...options, root });
    return normalizeExtraction({
      status: ocr?.text ? "complete" : "empty",
      mimeType: blob.type || "image/*",
      generatedAt: now(),
      tool: { name: "Timeline Evidence Extraction", version: TOOL_VERSION },
      segments: ocr?.text ? [{
        id: "image-1",
        locator: { kind: "image", index: 1 },
        method: ocr.method,
        text: ocr.text,
        confidence: ocr.confidence
      }] : [],
      unresolved: ocr?.text ? [] : [{
        locator: { kind: "image", index: 1 },
        reason: "OCR was unavailable or returned no legible text."
      }]
    });
  }

  async function extract(blob, options = {}) {
    if (!(blob instanceof Blob)) throw new TypeError("Evidence extraction requires a Blob.");
    const mimeType = String(options.mimeType || blob.type || "").toLowerCase();
    if (mimeType === "application/pdf" || /\.pdf$/i.test(options.fileName || "")) {
      return extractPdf(blob, options);
    }
    if (mimeType.startsWith("image/")) return extractImage(blob, options);
    throw new Error("Text extraction supports PDF and image evidence.");
  }

  async function availability() {
    return {
      pdfText: true,
      textDetector: typeof root.TextDetector === "function",
      languageModelVision: await languageModelVisionAvailability(root)
    };
  }

  return Object.freeze({
    schemaVersion: EXTRACTION_SCHEMA_VERSION,
    normalizeExtraction,
    pdfTextFromItems,
    extract,
    extractPdf,
    extractImage,
    availability
  });
}

export {
  EXTRACTION_SCHEMA_VERSION,
  MIN_NATIVE_PDF_TEXT,
  cleanOcrText,
  normalizeExtraction,
  normalizeSegment,
  pdfTextFromItems,
  visionOptions
};
