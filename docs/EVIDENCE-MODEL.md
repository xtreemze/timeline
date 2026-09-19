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
- `note` — text note such as an interview, observation, analyst note or transcription;
- `document` — generic record or documentary source.

## PDF storage boundary

A PDF selected from the event editor is stored as a Blob in IndexedDB. JSON stores only:

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
- a JSON export alone does not carry the local uploaded PDF;
- importing the metadata on another browser does not imply that the binary is present;
- the focused view reports when a local blob is unavailable rather than pretending the exhibit exists;
- externally hosted evidence can use a validated HTTP(S) URL instead.

A future evidence package exporter can explicitly bundle JSON plus blobs in a signed archive; that should be a deliberate format rather than an implicit JSON behavior.

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
