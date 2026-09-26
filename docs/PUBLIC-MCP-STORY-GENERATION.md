# Public MCP and document-to-story generation

Lūm provides a deployable, stateless Streamable HTTP MCP endpoint for provider-neutral story generation from user-supplied documents and text.

The public endpoint complements the live browser WebMCP surface. It does not replace it.

## Responsibilities

The public MCP endpoint is responsible for:

- publishing Lūm's source-first document-to-story authoring guidance;
- publishing the current graph contract and a blank project template;
- accepting a complete structured Lūm project proposal;
- deterministically preflighting project/story references and canonical graph structure;
- returning the proposal with unresolved facts and explicit user-verification instructions.

The public endpoint is **not** responsible for:

- storing source documents;
- storing user projects;
- owning the canonical browser project;
- geocoding unsupported locations;
- inventing missing dates, relationships, or identities;
- deciding that a model-generated claim is true;
- silently committing generated content to a user's Lūm project.

## End-to-end generation flow

The intended provider-neutral flow is:

```text
uploaded documents / supplied text
              |
              v
       host LLM reads sources
              |
              v
lum.get_story_authoring_guide
              |
              v
  extract source-grounded facts
              |
              v
complete Lūm project proposal
              |
              v
   lum.stage_story_project
              |
       structural preflight
              |
              v
 ready-for-user-verification
              |
              v
      user opens/imports Lūm
              |
       +------+------+
       |             |
timeline.audit_graph |
       |      timeline.validate_project
       +------+------+
              |
              v
       human verification
```

The host model should read uploaded files directly using the host's normal document/file capabilities. Raw document binaries and full source text are not required by the public Lūm endpoint. The staging request contains the structured project plus a compact source manifest and unresolved facts.

This keeps the public endpoint stateless and limits unnecessary transfer of source material.

## MCP tools

### `lum.get_story_authoring_guide`

Use this before creating a project from scratch. It returns:

- the source-first authoring guide;
- the current Lūm graph contract;
- a blank project template;
- the staging schema version;
- the endpoint trust boundary.

### `lum.stage_story_project`

Use this after constructing the complete proposed project.

Inputs:

- `project` — complete Lūm project proposal;
- `sources` — compact manifest of source IDs/titles/media types/locators/digests;
- `unresolved` — facts or modeling questions that should not be canonicalized yet;
- `generationNotes` — short source-scope/assumption notes.

The tool runs portable preflight checks including:

- canonical graph validation;
- stable/unique canonical graph IDs;
- no self-loops, orphan canonical entities, duplicate facts, or mirrored duplicates;
- action-only relationship predicates;
- story-to-item references;
- item-to-evidence references;
- relationship-to-item references;
- primary story references;
- canonical place geometry requirements;
- named contextual entity coverage through item-linked action relationships.

A successful result is `ready-for-user-verification`, not `verified`.

## Initial model guidance

The portable Agent Plugins skill is:

```text
skills/document-to-lum-story/SKILL.md
```

It instructs compatible clients to:

1. read all uploaded material first;
2. treat supplied documents/text as the factual authority;
3. call the authoring-guide tool;
4. preserve uncertainty and contradictions;
5. avoid invented dates, coordinates, identities, or relationships;
6. construct the full project, not a sequence of piecemeal mutations;
7. stage and repair the project until structural preflight passes;
8. return the complete proposal and unresolved facts;
9. tell the user the proposal is not yet factually verified;
10. perform final verification in the live Lūm application.

This skill is intentionally distinct from `.agents/skills/timeline-graph-authoring/SKILL.md`, which governs editing an already-open canonical project through `timeline.*`.

## Streamable HTTP endpoint

The reference endpoint is:

```text
POST /mcp
```

Implementation:

```text
mcp/public/server.ts
```

The server is stateless. It supports the current modern MCP discovery flow and legacy Streamable HTTP initialization for interoperability with clients that have not migrated yet.

The deployment wrapper is:

```text
mcp/cloudflare-worker.ts
```

Additional routes:

- `GET /healthz` — deployment health check;
- `GET /.well-known/openai-apps-challenge` — returns the configured OpenAI domain-verification challenge.

## Cloudflare Workers reference deployment

The repository includes:

```text
mcp/wrangler.jsonc
```

Local development:

```bash
pnpm mcp:public:dev
```

Deployment:

```bash
pnpm mcp:public:deploy
```

The deployment command requires the developer's Cloudflare account authorization. Lūm does not store cloud deployment credentials in the repository.

For OpenAI public plugin verification, configure the challenge value supplied by OpenAI as a Worker secret:

```bash
npx -y wrangler@4.141.0 secret put OPENAI_APPS_CHALLENGE --config mcp/wrangler.jsonc
```

Then verify:

```text
https://<public-host>/.well-known/openai-apps-challenge
https://<public-host>/healthz
https://<public-host>/mcp
```

Use a stable custom HTTPS hostname for public distribution rather than depending permanently on a generated development hostname.

## Plugin configuration

Until a stable public hostname exists, the repository keeps its executable local MCP configuration in `mcp.json` and provides a remote template:

```text
mcp.public.template.json
```

After deployment, replace the placeholder URL with the stable endpoint:

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  "mcpServers": {
    "lum_public": {
      "type": "streamable-http",
      "url": "https://mcp.example.com/mcp"
    }
  }
}
```

The portable `plugin.json` and `skills/` content remain provider-neutral.

## Live verification boundary

The remote preflight deliberately cannot claim parity with all browser application normalization because it does not own the user's live project state. After import/open, use the live tools:

1. `timeline.get_graph_contract`;
2. `timeline.audit_graph`;
3. `timeline.validate_project`.

The user should then inspect source/evidence locators, chronology ordering, dates/ranges, entity resolution, action direction, place geometry, and unresolved facts.

Only the live browser project is canonical for the user's accepted work.

## Security and privacy

The reference public MCP service has no mutation tools and no project persistence. Its tools are read-only from the service's perspective: they return guidance and transform/preflight data supplied in the current request.

The endpoint:

- does not need cookies or a browser session;
- does not require raw uploaded files;
- uses no server-side project database;
- applies a request-size limit;
- returns no durable session ID;
- exposes only public, idempotent generation-support tools.

If future public tools access private projects or perform server-side writes, add authentication/authorization and revisit CORS, session, logging, retention, and confirmation behavior before deployment.

## Standards references

- Model Context Protocol Streamable HTTP: https://modelcontextprotocol.io/specification/
- OpenAI MCP server deployment guidance: https://developers.openai.com/
- Agent Plugins specification: https://agent-plugins.org/specification
- Cloudflare Workers: https://developers.cloudflare.com/workers/
