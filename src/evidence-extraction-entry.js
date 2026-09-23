import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { createEvidenceExtraction } from "./evidence-extraction-core.js";

const api = createEvidenceExtraction({
  pdfjs: { getDocument, GlobalWorkerOptions },
  root: globalThis
});

globalThis.TimelineEvidenceExtraction = api;
