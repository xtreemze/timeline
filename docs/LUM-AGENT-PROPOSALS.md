# Lūm agent change proposals

Tracking: #935  
Depends on: #931 / #936

Lūm's command-line agent workflow separates **proposal**, **candidate**, and **canonical project** state.

An AI agent never receives authority merely because it can emit structurally valid JSON.

```text
strict project
    ↓
lum agent context
    ↓
agent / human authors proposal
    ↓
lum agent validate-proposal
    ↓
reviewable typed operations
    ↓
lum agent apply
    ↓
separate candidate.lum.json
    ↓
strict Lūm validation + lint
    ↓
application/user verification
    ↓
canonical replacement only after explicit approval
```

## Proposal format

Proposal files conventionally use `.lum-proposal.json` and identify:

```json
{
  "$schema": "https://xtreemze.github.io/timeline/schemas/lum-change-proposal-v1.schema.json",
  "format": "lum-change-proposal",
  "version": 1,
  "projectKey": "case-a",
  "expectedRevision": 4,
  "verificationRequired": true,
  "instruction": "Add the documented warning occurrence.",
  "unresolvedFacts": [],
  "operations": []
}
```

The checked-in JSON Schema is structural. The executable CLI additionally verifies project revision, record existence, reference safety, composer parity, and the validity of the resulting candidate project.

A proposal is deliberately **not** a `.lum.json` project. It is provenance-bearing proposed work against one exact project revision.

## Typed operations

Supported collections:

- `entities`
- `relationships`
- `occurrences`
- `trajectories`
- `places`
- `sources`
- `categories`
- `stories`

Supported operations:

- `create` — record ID must not already exist;
- `replace` — record ID must already exist;
- `delete` — target ID must already exist and the resulting project must remain valid.

Raw JSON Patch is not the semantic authority. Operations name the Lūm collection and canonical record directly, so domain validation can run before a candidate is accepted.

## Composer cross-check

Relationship create/replace operations may include `composerSentence`.

Example:

```json
{
  "op": "create",
  "collection": "relationships",
  "composerSentence": "Alice warns Bob on 2026-09-28",
  "record": {
    "id": "rel-warning",
    "subjectId": "alice",
    "predicate": "warns",
    "objectId": "bob",
    "itemIds": [],
    "sourceIds": [],
    "confidence": 1,
    "time": {
      "type": "instant",
      "start": { "value": "2026-09-28" }
    },
    "attributes": {}
  }
}
```

The CLI runs the same occurrence composer parser used by the application and checks that subject, action, object, time, and representable place semantics agree with the proposed canonical record.

If category/tags are present in the composer sentence while the canonical project model cannot preserve them losslessly, validation fails rather than dropping them.

Until places are first-class in the consolidated project interchange, a composer place must use an explicit `@place-id` to be compared safely.

## Commands

Inspect bounded canonical context:

```sh
lum agent context project.lum.json --json
```

Create a proposal template tied to the current project key/revision:

```sh
lum agent scaffold-proposal \
  --project project.lum.json \
  --output change.lum-proposal.json
```

The scaffold is an editing template; add at least one real operation before validation.

Validate without modifying the project:

```sh
lum agent validate-proposal change.lum-proposal.json \
  --project project.lum.json \
  --json
```

Apply to a candidate:

```sh
lum agent apply change.lum-proposal.json \
  --project project.lum.json \
  --output candidate.lum.json \
  --json
```

If `--output` is omitted, Lūm derives a `.candidate.lum.json` path next to the source project.

The CLI refuses an output path equal to the source project.

## Concurrency and stale agents

Every proposal records `expectedRevision`.

If another human or agent has already changed the project, proposal validation fails with `stale-project-revision`. The agent must reload context and regenerate/rebase its proposal.

This prevents a limited-context agent from applying edits against an obsolete project snapshot.

## Unresolved facts and generation provenance

`unresolvedFacts` is explicit and structured. Uncertainty should remain unresolved rather than being converted into invented canonical fields.

Optional `generation` metadata may record provider/model/request provenance. It is proposal metadata only and does not become evidence or truth in the candidate project.

Credentials, prompts containing secrets, or provider tokens must never be stored in Lūm project/proposal files.

## Editor support

VS Code associates `*.lum-proposal.json` with the strict proposal schema and provides a `lum-proposal` snippet.

Proposal files remain JSON. Helix can edit them with its ordinary JSON grammar; project-aware proposal validation is intentionally performed through the CLI because it requires the source `.lum.json` revision.

## Guarantees

- proposal validation never repairs facts;
- source projects must already pass strict Lūm validation;
- stale revisions fail closed;
- create/replace/delete preconditions are deterministic;
- relationship composer text is cross-checked rather than trusted;
- candidate projects pass the ordinary Lūm project validator before success;
- apply is non-destructive by default;
- `verificationRequired` is always true;
- provider integrations remain adapters outside canonical semantics.
