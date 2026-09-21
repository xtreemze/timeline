# Built-in AI graph inference

Timeline can use the browser's built-in Prompt API to propose canonical graph structure from event context and attached evidence notes without sending the content to an application-owned cloud inference service.

## Provider

The browser integration uses the standards-track `LanguageModel` Prompt API when it is available.

- capability detection: `LanguageModel.availability()`
- session creation: `LanguageModel.create()`
- structured output: `session.prompt(..., { responseConstraint })`
- lifecycle: the short-lived inference session is destroyed after each extraction
- model download is initiated only from the explicit **Infer entities, places & actions** user action

Reference: https://developer.chrome.com/docs/ai/prompt-api

Timeline does not silently fall back to a remote model or require an API key. When the built-in model is unavailable, the inference action is disabled and normal manual/MCP graph authoring continues to work.

## Evidence/context boundary

The inference prompt contains only explicitly supplied authoring context:

- event title;
- event description;
- descriptive image alt text;
- explicit location-form text/coordinates;
- attached evidence `note` text;
- extracted PDF page text;
- OCR text derived from scanned PDF pages and attached images.

The following are not treated as semantic evidence for inference:

- image provenance/credit captions;
- evidence source/publisher metadata;
- evidence URL or filename;
- forensic metadata;
- raw PDF/image binary bytes.

Attached files pass through an explicit evidence-extraction layer before their text becomes inference context. PDF.js extracts embedded text first. Pages with insufficient embedded text and image attachments then use OCR: Timeline tries the browser `TextDetector` when it is actually available and falls back to the built-in multimodal `LanguageModel` vision input. Every extracted segment keeps a page/image locator and extraction method.

## Trust boundary

Inference is a proposal layer, not a write authority.

The model returns JSON constrained to `timeline-graph-inference-v1` with four collections:

- `entities[]`
- `places[]`
- `relationships[]`
- `unresolved[]`

The application then deterministically reconciles that proposal:

1. resolve entity candidates against canonical names/aliases, preferring the active story scope;
2. validate new entity kinds through `TimelineGraph.validateEntityNode()`;
3. resolve place candidates against canonical places;
4. create a new place only when both latitude and longitude appear in the cited source fragment;
5. validate every action predicate through `TimelineGraph.validateActionPredicate()`;
6. reject self-loops and mirrored same-action copies;
7. detect duplicate directed action facts and convert them into context/provenance merges instead of parallel edges;
8. require at least one valid source-fragment reference for every inferred relationship;
9. require user review of proposed actions;
10. commit the selected actions and their required nodes/usable places in the same draft as the event;
11. run the normal strict graph contract before persistence.

The model cannot bypass the canonical graph validator.

## Evidence extraction and OCR

Evidence extraction is deterministic-first and page-addressable:

1. PDF.js reads the embedded PDF text layer.
2. Each PDF page with useful embedded text becomes a `pdf-text` segment.
3. Pages without enough embedded text are rendered to an in-memory canvas.
4. OCR first attempts the platform `TextDetector` when supported.
5. If native OCR is unavailable or returns no text, the built-in multimodal Prompt API is asked to transcribe only visibly present characters.
6. Image attachments go directly through the same OCR path.
7. OCR/transcription never overwrites the user-authored evidence note.

Derived extraction metadata is stored on the evidence record:

- extraction schema version and status;
- source MIME type;
- generated timestamp;
- extractor name/version;
- page/image locator;
- extraction method;
- extracted text;
- optional confidence;
- unresolved pages/images.

Graph inference cites precise refs such as `evidence:<id>:page:3` or `evidence:<id>:image:1`. When selected facts are committed, those segment refs resolve to the parent evidence ID for relationship provenance.

Original PDF/image blobs remain browser-local in IndexedDB. Derived extracted text is ordinary evidence metadata and is included in Timeline JSON/interchange export so it can be audited and reused without re-running OCR.

## Location inference

Locations are extracted separately from entity nodes.

A place may be:

- reconciled to an existing canonical place by name, geographic identifier, or address;
- proposed as a new canonical place only when explicit coordinates are present in the cited source;
- shown as **Needs coordinates** when the text names a location but does not provide geometry.

Timeline deliberately does not geocode from the language model's world knowledge. A named place without explicit geometry remains a review candidate until the user supplies coordinates or another trusted geocoding workflow resolves it.

## Event lifecycle

Inference can run before a new event has been saved.

Timeline assigns stable draft IDs to the event and any evidence-note records needed for provenance, but no graph mutation is persisted at inference time.

The proposal is fingerprinted from:

- event identity/time;
- title/description;
- media alt text;
- evidence notes;
- explicit location input.

If those inputs change after inference, the staged proposal becomes stale and must be rerun or cleared before inferred facts can be saved.

On event save, selected inferred relationships are applied atomically to a draft project. New nodes are created only when required by a selected action edge, preventing orphan inferred entities.

## User review

The event editor shows:

- extracted entities, marked as existing/new;
- extracted places, marked as existing/new/needs geometry;
- action candidates with confidence and cited source references;
- duplicate-action merges;
- rejected mirrored actions;
- unresolved or invalid candidates.

Only selected action candidates are applied. Required entity/place records are derived from those selections.

## Privacy and availability

Built-in model inference is browser/device capability-dependent. The feature must remain optional and capability-detected.

As of the current Chrome documentation, foundation-model APIs such as Prompt API run on supported desktop Chrome environments and are not supported on Android/iOS. Timeline therefore keeps manual graph editing and WebMCP authoring as first-class alternatives. OCR itself is progressive: embedded PDF text extraction remains available without the language model; platform `TextDetector` is attempted when present; built-in vision transcription is the final local fallback.

## External LLM / agent use

An external agent connected through WebMCP can already perform the same semantic extraction using:

1. `timeline.get_graph_contract`;
2. `timeline.get_project`;
3. its own LLM reasoning;
4. `timeline.apply_transaction`;
5. `timeline.audit_graph`;
6. `timeline.validate_project`.

The repo-local `.agents/skills/timeline-graph-authoring/SKILL.md` remains the workflow contract for that path. Browser built-in inference and external-agent inference intentionally converge on the same deterministic graph rules instead of maintaining separate ontologies.
