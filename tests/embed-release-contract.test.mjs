import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("embed entry is a versioned, framework-neutral public custom-element surface", async () => {
  const [entry, declarations, docs, config] = await Promise.all([
    readFile(new URL("../site/embed-entry.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/embed-public.d.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/EMBEDDING.md", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
  ]);

  assert.match(entry, /LUUM_EMBED_VERSION\s*=\s*"0\.3\.0"/);
  assert.match(entry, /customElements\.define\("luum-embed-timeline"/);
  assert.match(entry, /customElements\.define\("luum-embed-graph"/);
  assert.match(config, /embed\/luum-embed\.js/);
  assert.match(declarations, /interface EmbedTimelineItem/);
  assert.match(declarations, /interface EmbedGraphNode/);
  assert.match(declarations, /interface LuumEmbedSelectDetail/);
  assert.match(docs, /Lūm project remains the source of truth/);
  assert.match(docs, /must never be written back as geographic or temporal evidence/);
});
