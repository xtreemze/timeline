import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { createEvidenceExtraction } from "./evidence-extraction-core.js";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const TimelineEvidenceExtraction = Object.freeze(
  createEvidenceExtraction({
    pdfjs: { getDocument, GlobalWorkerOptions },
    root: globalThis,
  }),
);
