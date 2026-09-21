# Evidence model

Timeline distinguishes chronology claims from the sources offered to support them.

## Data shape

Evidence is stored once at the document root:

```json
{
  "evidence": [
    {
      "id": "evidence-a",
      "type": "article",
      "title": "Public report",
      "sourceName": "Publisher",
      "url": "https://example.org/report",
      "publishedAt": "2026-09-19",
      "note": "Supports the claim that publication occurred on this date.",
      "file": null
    }
  ]
}
```

An event or range references records by ID:

```json
{
  "id": "event-a",
  "evidenceIds": ["evidence-a"]
}
```

This permits one source to support several chronology items without duplication.

## Source types

Current source types are:

- `article` — news, reporting, web publication or comparable external source;
- `pdf` — uploaded or externally linked PDF exhibit;
- `image` — uploaded image evidence such as a photographed document, screenshot or scene image;
- `note` — text note such as an interview, observation, analyst note or transcription;
- `document` — generic record or documentary source.

## Binary attachment and derived-text boundary

A PDF or image selected from the event editor is stored as a Blob in IndexedDB. JSON stores file metadata plus any derived text extraction metadata, but never the binary bytes themselves.

```json
{
  "file": {
    "blobKey": "evidence:evidence-a",
    "name": "exhibit-a.pdf",
    "mimeType": "application/pdf",
    "size": 4096
  }
}
```

Consequences:

- normal JSON and interchange exports remain compact and inspectable;
- a JSON export alone does not carry the local uploaded PDF/image;
- importing the metadata on another browser does not imply that the binary is present;
- the focused view reports when a local blob is unavailable rather than pretending the exhibit exists;
- externally hosted evidence can use a validated HTTP(S) URL instead.

A future evidence package exporter can explicitly bundle JSON plus blobs in a signed archive; that should be a deliberate format rather than an implicit JSON behavior.

### Derived text extraction

Evidence may carry an `extraction` object containing derived text segments. PDF.js reads embedded PDF text first. Scanned PDF pages and image evidence use OCR when available. Each segment records:

- page or image locator;
- extraction method (`pdf-text`, `text-detector`, or `language-model-vision`);
- extracted text;
- optional confidence;
- extraction tool/version and timestamp.

Extraction text is derived evidence metadata, not a replacement for the human-authored `note`. It is portable in JSON/interchange so downstream inference can cite exact page/image segments, while the original attachment remains browser-local.

## Evidentiary semantics

Attachment does not equal proof.

`evidenceIds` means that a source is associated with and offered in support of the event or claim. Timeline must keep separate concepts available for future work:

- provenance;
- source identity;
- authenticity/integrity;
- chain of custody;
- reliability/credibility assessment;
- conflicting evidence;
- interpretation/analysis;
- legal or organizational evidentiary weight.

The current evidence note is the human-readable place to state what the source supports and any caveats.

## Focused presentation

Every focused-event grid variant renders the same evidence records. Layout changes emphasis, not semantics:

- Hero split keeps evidence below the primary context;
- Evidence dossier gives evidence a dominant reading field;
- Editorial mosaic balances evidence against place, relations, media and narrative context.


## Forensic metadata

Evidence can optionally carry a `forensic` object. Ordinary timeline sources do not need it.

```json
{
  "id": "evidence-disk-copy",
  "type": "document",
  "title": "Forensic disk image",
  "forensic": {
    "recordClass": "acquired-copy",
    "sourceFilename": "drive.E01",
    "sourceLocator": "locker-4/device-2",
    "exhibitNumber": "C001-HD1",
    "rootExhibitNumber": "Collection-001",
    "acquiredAt": "2026-09-19T09:15:00+02:00",
    "acquiredByEntityId": "person-examiner",
    "acquisitionMethod": "Forensic image acquisition",
    "acquisitionPlaceEntityId": "place-lab",
    "sourceItemId": "device-2",
    "tool": {
      "name": "Acquisition Tool",
      "version": "5.4.1"
    },
    "digests": [
      {
        "algorithm": "sha-256",
        "value": "…",
        "encoding": "hex"
      }
    ],
    "derivedFromIds": ["device-2"]
  }
}
```

The initial record classes are `source`, `acquired-copy`, and `derived-artifact`. They describe lineage; they do not assert authenticity or admissibility. Digest values are preserved exactly with their algorithm (and optional encoding). Timeline never fabricates a digest when none was supplied.

This structure is intended to support later CASE/UCO `ProvenanceRecord` / `InvestigativeAction` adapters and W3C PROV-O mappings. It is standards-aligned data modeling, not a claim that Timeline or a case record is ISO-certified.

## Custody actions

Custody is modeled as a list of timestamped actions at the timeline-document root rather than as a mutable `currentCustodian` field:

```json
{
  "custodyActions": [
    {
      "id": "custody-1",
      "actionType": "transferred",
      "evidenceIds": ["evidence-disk-copy"],
      "occurredAt": "2026-09-19T10:00:00+02:00",
      "fromEntityId": "person-examiner",
      "toEntityId": "person-custodian",
      "placeEntityId": "place-vault",
      "recorderEntityId": "person-recorder",
      "reason": "Secure storage",
      "note": "",
      "sourceEvidenceIds": ["custody-form-1"]
    }
  ]
}
```

Every action keeps the evidence IDs it applies to and its own occurrence time. Transfers therefore add records instead of overwriting previous custody history. The canonical document now preserves these actions through import, local persistence, and JSON export; a dedicated custody editor and stronger audit/signature layer remain separate work.

## Standards boundary

The forensic fields are shaped to make later mappings practical for:

- ISO 21043 forensic-process vocabulary and recording/reporting concepts;
- ISO/IEC 27037 digital-evidence identification, collection, acquisition and preservation;
- ISO/IEC 27041/27042/27043 investigation-method and analysis/interpretation continuity;
- CASE/UCO evidence provenance and investigative actions;
- W3C PROV-O entity/activity/agent provenance.

Browser `localStorage` and IndexedDB remain mutable application storage. Preserving forensic metadata does not make the browser a tamper-evident evidence repository. Tamper-evident export bundles, signatures, verification and threat-model documentation remain tracked separately.
