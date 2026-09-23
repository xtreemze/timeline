import test from "node:test";
import assert from "node:assert/strict";

import {
  createEvidenceExtraction,
  normalizeExtraction,
  pdfTextFromItems,
} from "../src/evidence-extraction-core.js";

function fakePdfjs(pages) {
  const GlobalWorkerOptions = { workerSrc: "" };
  return {
    GlobalWorkerOptions,
    getDocument() {
      const document = {
        numPages: pages.length,
        async getPage(pageNumber) {
          return pages[pageNumber - 1];
        },
        async destroy() {},
      };
      return {
        promise: Promise.resolve(document),
        destroy() {},
      };
    },
  };
}

function nativeTextPage(text) {
  return {
    async getTextContent() {
      return {
        items: text.split(" ").map((word, index, words) => ({
          str: word,
          hasEOL: index === words.length - 1,
        })),
      };
    },
    cleanup() {},
  };
}

function scannedPage() {
  return {
    async getTextContent() {
      return { items: [] };
    },
    getViewport({ scale }) {
      return { width: 800 * scale, height: 600 * scale };
    },
    render() {
      return { promise: Promise.resolve() };
    },
    cleanup() {},
  };
}

function fakeCanvasRoot(overrides = {}) {
  return {
    document: {
      baseURI: "https://example.test/timeline/",
      createElement(tag) {
        assert.equal(tag, "canvas");
        return {
          width: 0,
          height: 0,
          getContext() {
            return {};
          },
        };
      },
    },
    ...overrides,
  };
}

test("PDF text item joining preserves page reading flow", () => {
  assert.equal(
    pdfTextFromItems([
      { str: "Alice", hasEOL: false },
      { str: "called", hasEOL: false },
      { str: "Bob.", hasEOL: true },
      { str: "09:30", hasEOL: true },
    ]),
    "Alice called Bob.\n09:30",
  );
});

test("embedded PDF text is extracted before OCR and keeps a page locator", async () => {
  const pdfjs = fakePdfjs([
    nativeTextPage(
      "Alice called Bob from the Stockholm office at 09:30 and confirmed the transfer in writing.",
    ),
  ]);
  class ForbiddenTextDetector {
    constructor() {
      throw new Error("OCR should not run when embedded PDF text is sufficient.");
    }
  }
  const root = fakeCanvasRoot({ TextDetector: ForbiddenTextDetector });
  const extraction = createEvidenceExtraction({
    pdfjs,
    root,
    now: () => "2026-09-21T00:00:00Z",
  });

  const result = await extraction.extract(new Blob(["fake-pdf"], { type: "application/pdf" }), {
    fileName: "evidence.pdf",
  });

  assert.equal(result.status, "complete");
  assert.equal(result.segments.length, 1);
  assert.deepEqual(result.segments[0].locator, { kind: "page", page: 1 });
  assert.equal(result.segments[0].method, "pdf-text");
  assert.match(result.segments[0].text, /Alice called Bob/);
  assert.equal(pdfjs.GlobalWorkerOptions.workerSrc, "https://example.test/timeline/pdf.worker.mjs");
});

test("scanned PDF pages fall through to OCR and retain page provenance", async () => {
  const pdfjs = fakePdfjs([scannedPage()]);
  class TextDetector {
    async detect() {
      return [
        { rawValue: "Alice called Bob", boundingBox: { x: 10, y: 20 } },
        { rawValue: "at 09:30", boundingBox: { x: 10, y: 40 } },
      ];
    }
  }
  const extraction = createEvidenceExtraction({
    pdfjs,
    root: fakeCanvasRoot({ TextDetector }),
    now: () => "2026-09-21T00:00:00Z",
  });

  const result = await extraction.extract(new Blob(["scan"], { type: "application/pdf" }), {
    fileName: "scan.pdf",
  });

  assert.equal(result.segments.length, 1);
  assert.deepEqual(result.segments[0].locator, { kind: "page", page: 1 });
  assert.equal(result.segments[0].method, "text-detector");
  assert.equal(result.segments[0].text, "Alice called Bob\nat 09:30");
});

test("image evidence uses OCR and keeps image provenance", async () => {
  const pdfjs = fakePdfjs([]);
  class TextDetector {
    async detect(source) {
      assert.equal(source.type, "image/png");
      return [{ rawValue: "Invoice 42", boundingBox: { x: 0, y: 0 } }];
    }
  }
  const extraction = createEvidenceExtraction({
    pdfjs,
    root: { TextDetector },
    now: () => "2026-09-21T00:00:00Z",
  });

  const result = await extraction.extract(new Blob(["png"], { type: "image/png" }), {
    fileName: "invoice.png",
  });

  assert.deepEqual(result.segments[0].locator, { kind: "image", index: 1 });
  assert.equal(result.segments[0].method, "text-detector");
  assert.equal(result.segments[0].text, "Invoice 42");
});

test("built-in multimodal LanguageModel is the OCR fallback when native text detection is unavailable", async () => {
  const pdfjs = fakePdfjs([]);
  let createOptions = null;
  let promptInput = null;
  let destroyed = false;
  const LanguageModel = {
    async availability(options) {
      assert.ok(options.expectedInputs.some((input) => input.type === "image"));
      return "available";
    },
    async create(options) {
      createOptions = options;
      return {
        async prompt(input, options) {
          promptInput = input;
          assert.equal(options.responseConstraint.type, "object");
          return JSON.stringify({ text: "Visible serial 7A-42" });
        },
        destroy() {
          destroyed = true;
        },
      };
    },
  };
  const extraction = createEvidenceExtraction({
    pdfjs,
    root: { LanguageModel },
    now: () => "2026-09-21T00:00:00Z",
  });

  const result = await extraction.extract(new Blob(["photo"], { type: "image/jpeg" }), {
    fileName: "serial.jpg",
  });

  assert.equal(result.segments[0].method, "language-model-vision");
  assert.equal(result.segments[0].text, "Visible serial 7A-42");
  assert.ok(createOptions.expectedInputs.some((input) => input.type === "image"));
  assert.equal(promptInput[0].content.at(-1).type, "image");
  assert.equal(destroyed, true);
});

test("normalization preserves derived extraction locators without promoting unresolved text", () => {
  const normalized = normalizeExtraction({
    status: "partial",
    mimeType: "application/pdf",
    generatedAt: "2026-09-21T00:00:00Z",
    tool: { name: "Timeline Evidence Extraction", version: "1" },
    segments: [
      {
        id: "page-2",
        locator: { kind: "page", page: 2 },
        method: "pdf-text",
        text: "Confirmed transfer.",
        confidence: 1,
      },
    ],
    unresolved: [
      {
        locator: { kind: "page", page: 3 },
        reason: "No text recovered.",
      },
    ],
  });

  assert.equal(normalized.status, "partial");
  assert.equal(normalized.segments[0].locator.page, 2);
  assert.equal(normalized.unresolved[0].locator.page, 3);
});
