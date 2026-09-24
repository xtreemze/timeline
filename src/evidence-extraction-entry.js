import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { createEvidenceExtraction } from "./evidence-extraction-core.js";

export const TimelineEvidenceExtraction = createEvidenceExtraction({
  pdfjs: { getDocument, GlobalWorkerOptions },
  pdfWorkerUrl,
  root: globalThis,
});
