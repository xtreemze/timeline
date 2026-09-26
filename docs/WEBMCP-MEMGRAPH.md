# WebMCP and Memgraph MCP interoperability

Timeline exposes its canonical in-browser project model to AI agents through the WebMCP API and provides a deterministic bridge to Memgraph MCP.

The integration intentionally reuses Timeline's normal state validation, persistence, and rendering. AI edits do not mutate a second data store and do not bypass the graph invariants.

## Standards and implementation status

WebMCP is currently a W3C Web Machine Learning Community Group Draft. The September 17, 2026 draft defines the imperative API on `document.modelContext`:

- `document.modelContext.registerTool(tool, { signal })`
- JSON Schema `inputSchema`
- asynchronous `execute(input, { signal })`
- annotations including `readOnlyHint` and `consequentialHint`
- aborting the registration signal unregisters the tool

Reference:

- https://webmachinelearning.github.io/webmcp/
- https://github.com/webmachinelearning/webmcp

Timeline uses only this standards-track surface. It does not depend on removed/non-standard `navigator.modelContext`, `callTool()`, or `unregisterTool()` APIs.

Because WebMCP is still preview browser functionality, Timeline feature-detects `document.modelContext`. A browser implementation or compatible bridge/polyfill such as MCP-B can provide that API. When unavailable, Timeline runs normally and reports that no WebMCP tools were registered.

WebMCP is an in-page tool registry, not a backend MCP server. It does not itself open an HTTP/SSE/stdio listener.

## Local LLM host (Ollama)

WebMCP defines the tool surface; an LLM runtime still needs a host that presents those tools to the model and executes requested calls. Lūm includes a browser-local host for Ollama so the active in-browser continuum remains the state authority.

The host reuses `toolDefinitions(agentApi)` directly. It does not maintain a second project copy and it does not create a parallel mutation API. Ollama tool calls are translated back to the canonical `timeline.*` tool definitions, whose existing graph-contract version checks, strict validation, persistence, and rendering remain authoritative.

The browser global is:

```js
TimelineLocalLLM
```

Read-only verification is the default:

```js
await TimelineLocalLLM.runOllama({
  model: "gpt-oss:20b",
  prompt: "Audit the current continuum. Read the graph contract and project, then report validation problems.",
  ollamaOptions: { num_ctx: 32768 },
});
```

Mutation tools are not even advertised to the model unless the caller opts in for that run:

```js
await TimelineLocalLLM.runOllama({
  model: "gpt-oss:20b",
  prompt:
    "Use the extracted evidence already attached to the project to reconcile supported entities and actions. Apply only supported facts, then audit and validate the final project.",
  allowMutations: true,
  ollamaOptions: { num_ctx: 32768 },
});
```

When mutation access is enabled, the model is instructed to follow the normal authoring workflow: read `timeline.get_graph_contract`, read `timeline.get_project`, reason from evidence, and write through `timeline.apply_transaction` with the exact contract version.

The host does not rely on the model to perform final verification. After the latest mutation and before accepting a final response, it runs `timeline.audit_graph` and `timeline.validate_project` itself. A failed canonical audit or validation aborts the local-agent run. The deterministic runtime also rejects invalid writes at mutation time.

### Ollama setup

Use a model that advertises tool support. Ollama exposes tool calling through its local chat API and recommends larger context windows for MCP/tool-heavy work.

Example:

```bash
ollama pull gpt-oss:20b
ollama show gpt-oss:20b
ollama serve
```

The browser must be allowed to call the local Ollama origin. For local Vite development, configure Ollama to allow the page origin before starting the server, for example:

```bash
OLLAMA_ORIGINS=http://localhost:5173 ollama serve
```

For a deployed Lūm page, use that page's exact origin instead. Do not use a wildcard origin for normal use.

The default endpoint is `http://127.0.0.1:11434/api/chat`. It can be overridden per run with `endpoint`.

The adapter converts MCP names such as `timeline.get_project` to Ollama-safe function names such as `timeline__get_project` only at the model boundary. Canonical WebMCP/MCP tool names are unchanged.

References:

- https://ollama.com/blog/tool-support
- https://ollama.com/blog/streaming-tool
- https://ollama.com/blog/building-llm-powered-web-apps

### External MCP clients using Ollama

The local host above is intended for a model served directly by Ollama in the browser workflow. If Ollama is used through an agent application that is already an MCP client (for example an Ollama-launched coding agent), keep using the normal WebMCP-to-MCP bridge path. Lūm does not require that external client to use the local host.

MCP-B and compatible bridges can translate Lūm's `document.modelContext` tools to standard MCP transports for those clients. The canonical tools and validation behavior are the same on both paths.

## Standard MCP clients: Codex, Claude, and ChatGPT

Lūm can expose the exact same live browser tools to ordinary MCP clients through the MCP-B local relay. This is a transport adapter only: the open browser tab remains the canonical project owner, and every relayed mutation still executes the same `timeline.*` implementation and deterministic validators.

The relay integration is opt-in. Lūm does not load third-party MCP-B runtime code during normal browsing. Enable it either by opening Lūm with:

```text
?mcp-relay=1
```

or explicitly in the browser console:

```js
await TimelineMCPRelay.connect();
```

The bridge pins MCP-B to `5.1.0`. If the browser does not already provide `document.modelContext`, the opt-in bridge first loads the pinned MCP-B WebMCP runtime and then loads the relay embed. Normal Lūm operation remains independent of those scripts.

### Local MCP configuration

The repository includes two equivalent local configurations:

- `.mcp.json` — native/local MCP-client configuration for Claude Code/Desktop and other clients that understand the common `mcpServers` layout;
- `plugin.json` + `mcp.json` — portable Agent Plugins packaging for clients such as Codex that support the Agent Plugins specification.

Both start the pinned local relay using stdio and restrict browser sources to the Lūm development/preview origins and the GitHub Pages origin:

```json
{
  "type": "stdio",
  "command": "npx",
  "args": [
    "-y",
    "@mcp-b/webmcp-local-relay@5.1.0",
    "--widget-origin",
    "http://localhost:5173,http://localhost:4173,https://xtreemze.github.io"
  ]
}
```

The relay binds to loopback and dynamically publishes tools from the open Lūm tab. Use `webmcp_list_sources` and `webmcp_list_tools` from the MCP client to inspect connected tabs and currently available tools.

If Lūm is hosted under another origin, copy the MCP configuration and change the `--widget-origin` allowlist rather than widening it to `*`.

References:

- https://github.com/WebMCP-org/npm-packages/tree/main/packages/webmcp-local-relay
- https://agent-plugins.org/specification

### ChatGPT chat

ChatGPT web does not attach directly to a localhost/stdio MCP process. For development or private use, run the same local relay and connect it to ChatGPT using OpenAI Secure MCP Tunnel. For a deployed/public integration, expose a Streamable HTTP MCP endpoint over HTTPS instead.

In ChatGPT, the user-facing integration should be treated as a **custom MCP app/plugin**. Current OpenAI packaging supports plugins that combine MCP configuration and optional skills, and ChatGPT and Codex share the plugin directory. The repository's portable `plugin.json` is therefore the local/package identity for Lūm, but the bundled local stdio relay is not itself suitable for public ChatGPT submission: public distribution requires a stable remote HTTPS MCP endpoint.

For private/developer-mode ChatGPT testing, start the relay directly with:

```bash
pnpm mcp:relay
```

or let Secure MCP Tunnel launch it as its stdio command. A typical tunnel profile points `--mcp-command` at:

```text
pnpm --dir /absolute/path/to/timeline run mcp:relay
```

After the tunnel is healthy, create a developer-mode app in ChatGPT Plugins and choose **Tunnel** as the connection. The tunnel is transport only: the Lūm browser tab still needs to be open with `?mcp-relay=1` (or have `TimelineMCPRelay.connect()` invoked) so the relay has a live WebMCP source.

The existing Lūm write annotations and graph-contract checks remain authoritative regardless of client. ChatGPT may add its own confirmation step for consequential/write actions; that confirmation is additional UX, not a replacement for Lūm validation.

## Registered Timeline tools

Timeline registers eight tools.

### `timeline.get_project`

Read-only. Returns the complete canonical project:

- categories
- chronology items
- stories
- durable entities
- reusable places
- directed action relationships
- evidence
- custody actions
- reasoning
- project extensions

### `timeline.get_graph_contract`

Read-only. Returns the authoritative versioned graph contract used by runtime validation and MCP mutation gates, including:

- one durable entity per node;
- two different entity endpoints per relationship;
- action-only predicates with no embedded entity/place/time/context;
- one directed action fact per edge;
- canonical time/place placement;
- chronology-only categories and non-topological stories;
- event narrative named-entity coverage;
- the required authoring/audit workflow and valid/invalid examples.

### `timeline.audit_graph`

Read-only. Audits the supplied project, or active project when omitted, without mutation. It returns all graph validation errors plus duplicate/orphan/mirrored structural diagnostics. Agents should use it before and after non-trivial graph authoring.

### `timeline.validate_project`

Read-only. Runs the same normalization and strict graph validation used by the application. If no project is supplied, validates the active project. Validation includes narrative entity coverage: known canonical entities named in event title/description, descriptive image alt text, or attached evidence notes must participate in a meaningful action edge linked to that event.

### `timeline.apply_transaction`

Full AI editing surface. It atomically applies up to 500 operations and commits only after the complete resulting project passes strict Timeline validation.

Supported record collections:

- `categories`
- `items`
- `stories`
- `entities`
- `places`
- `relationships`
- `evidence`
- `custodyActions`

Supported operations:

- `upsert`: create or replace one stable-ID record
- `patch`: recursively patch one stable-ID record
- `delete`: delete one record with referential cleanup
- `set`: set a top-level `title`, `extensions`, or `reasoning` value

Example:

```json
{
  "graphContractVersion": "2026-09-21.1",
  "operations": [
    {
      "op": "upsert",
      "collection": "entities",
      "id": "person-alice",
      "value": {
        "type": "person",
        "name": "Alice",
        "attributes": {}
      }
    },
    {
      "op": "upsert",
      "collection": "entities",
      "id": "person-bob",
      "value": {
        "type": "person",
        "name": "Bob",
        "attributes": {}
      }
    },
    {
      "op": "upsert",
      "collection": "relationships",
      "id": "rel-alice-calls-bob",
      "value": {
        "subjectId": "person-alice",
        "predicate": "calls",
        "objectId": "person-bob",
        "itemIds": [],
        "attributes": {}
      }
    }
  ]
}
```

Related operations belong in one transaction. This is particularly important for the canonical graph: creating an entity and the meaningful edge that connects it can happen in one validated commit rather than leaving an orphan entity between tool calls.

Every graph-capable mutation (`timeline.apply_transaction`, `timeline.replace_project`, and `timeline.memgraph_import`) requires the exact `graphContractVersion` currently returned by `timeline.get_graph_contract`. A stale/missing version is rejected before mutation. This is a compatibility gate, not a substitute for validation.

For narrative changes, agents must extract newly named durable entities before mutation. Runtime validation can match canonical names/aliases already in the project, including story-scoped duplicate names, but it cannot safely infer arbitrary previously unknown proper nouns without risking invented topology. The repository skill `.agents/skills/timeline-graph-authoring/SKILL.md` standardizes that semantic extraction workflow.

Deletion cleanup follows application semantics before strict validation:

- deleting an item removes story and edge context references;
- deleting an entity removes incident relationships;
- deleting a place clears edge `placeId` references;
- deleting a relationship removes event relation-change references;
- deleting evidence removes item attachments and matching custody records;
- deleting a category reassigns its items to another existing category.

### `timeline.replace_project`

Replaces the complete project, validates it strictly, persists it to local storage, and rerenders Timeline.

### `timeline.memgraph_export`

Returns a `timeline-memgraph-v1` bundle containing:

- lossless canonical records;
- optional Memgraph schema/index setup Cypher;
- namespace-scoped full-replacement cleanup Cypher;
- ordered upsert/create Cypher statements;
- read-back Cypher queries for each Timeline collection;
- instructions suitable for an agent connected to Memgraph MCP.

### `timeline.memgraph_import`

Accepts either:

- a Timeline Memgraph export bundle; or
- collections of rows returned by the generated Memgraph read-back queries.

Supplied collections replace the corresponding Timeline collections. Collections omitted from the payload remain unchanged. The merged project is then validated and committed through the same application pipeline.

## Human-control annotations

Read-only tools use `readOnlyHint: true` and `openWorldHint: false`.

Mutation tools use `readOnlyHint: false`, `destructiveHint: true`, `openWorldHint: false`, and `consequentialHint: true`. Whole-project replacement and Memgraph import additionally advertise `idempotentHint: true`; general transactions remain non-idempotent because the operation batch may include deletes or context-sensitive patches.

These annotations describe tool behavior for hosts and approval UX. They are hints, not the enforcement boundary. Timeline's deterministic graph contract version check and strict runtime validation remain authoritative.

Timeline does not opt tools into cross-origin exposure. Standard same-document/same-origin and browser-agent visibility applies unless the embedding environment deliberately delegates WebMCP tool access.

## Memgraph representation

Timeline's internal canonical graph remains:

```
entities[] + places[] + relationships[]
```

with events/stories/categories outside entity topology.

The Memgraph interchange layer stores full application records losslessly while keeping this distinction explicit.

Canonical topology:

- durable Timeline entities become `:TimelineEntity` nodes;
- action predicates become directed relationship types such as `:CALLS`, `:SEARCHES_FOR`, or `:DANCES_WITH`;
- every action edge retains the original canonical `predicate` property;
- source/target direction is preserved.

Context/application records can additionally be stored under separate labels:

- `:TimelinePlace`
- `:TimelineItem`
- `:TimelineStory`
- `:TimelineCategory`
- `:TimelineEvidence`
- `:TimelineCustodyAction`
- `:TimelineProject`

Those records are interchange/storage envelopes, not canonical Timeline entity nodes. They do not acquire synthetic action relationships merely because Memgraph stores them as labelled records.

Each record carries:

- `timelineId`
- `timelineProjectId`
- namespace-scoped `timelineKey`
- complete canonical `recordJson`

Selected scalar fields such as name/title/type are duplicated as query-friendly Memgraph properties, while `recordJson` remains the round-trip source of truth.

## Memgraph MCP workflow

The current Memgraph MCP server can expose graph query and analysis tools over Streamable HTTP or stdio. Its production server supports a read-only mode that blocks Cypher writes; set `MCP_READ_ONLY=false` when a user deliberately wants an agent to synchronize Timeline into Memgraph.

References:

- https://memgraph.com/blog/pushing-mcp-forward
- https://memgraph.com/blog/memgraph-mcp-server-on-docker-hub
- https://github.com/memgraph/mcp-memgraph

A client connected to both Timeline WebMCP and Memgraph MCP can synchronize without custom DOM automation.

### Timeline → Memgraph

1. Call `timeline.memgraph_export` with a namespace.
2. For a full mirror, execute `replacePrelude` with Memgraph MCP.
3. Optionally execute reviewed `setupCypher` once.
4. Execute each returned `statements[]` query in order through Memgraph MCP.
5. Leave `replacePrelude` out for non-destructive upsert-only synchronization.

The namespace isolates one Timeline project inside a shared Memgraph database. Stable `timelineKey = namespace:id` values prevent different projects with the same local record IDs from colliding.

### Memgraph → Timeline

1. Call `timeline.memgraph_export` only to obtain the namespace-specific `queries`, or construct equivalent queries.
2. Execute the desired queries through Memgraph MCP.
3. Group returned rows under their collection names.
4. Pass the grouped object to `timeline.memgraph_import`.

The generated queries return `recordJson`, allowing exact reconstruction of Timeline records rather than heuristically rebuilding them from visualization properties.

## Security boundaries

- WebMCP tools operate on the currently open Timeline project and reuse the page's existing local-storage authority.
- No Memgraph credentials are stored in Timeline.
- Timeline never connects directly to a Memgraph Bolt or MCP endpoint.
- The AI/MCP client is the orchestration layer between the WebMCP page and Memgraph MCP.
- Memgraph write access is controlled by Memgraph MCP configuration; Timeline cannot override `MCP_READ_ONLY`.
- All imported/mutated Timeline state is normalized and strictly validated before commit.
- Graph self-loops, duplicate action facts, mirrored duplicates, invalid endpoints, orphan canonical entities, invalid action predicates, and invalid place references remain rejected.

## Source files

- `site/webmcp.ts` — WebMCP tool definitions, transaction engine, registration.
- `site/memgraph-interchange.ts` — Memgraph record/Cypher round trip.
- `site/app.ts` — live state adapter, validation, persistence, rerendering.
- `tests/webmcp.test.mjs` — tool registration, transaction cleanup, Memgraph round trip, runtime wiring.
