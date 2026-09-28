import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("human-facing project copy uses Lūm/project/occurrence terminology", async () => {
  const [html, app, inference, manifest] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/graph-inference.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/public/manifest.webmanifest", import.meta.url), "utf8"),
  ]);

  for (const stale of [
    "Timeline project",
    "Timeline title",
    "Untitled timeline",
    "Local timeline file and workspace actions",
    "Clear timeline",
    "Previous story event",
    "Next story event",
  ]) {
    assert.doesNotMatch(html, new RegExp(stale));
  }

  assert.doesNotMatch(app, /Untitled timeline/);
  assert.doesNotMatch(inference, /Add event context/);

  const pwa = JSON.parse(manifest);
  const addOccurrence = pwa.shortcuts.find((shortcut) => shortcut.url === "./?shortcut=new-event");
  assert.equal(addOccurrence?.name, "Add occurrence");
  assert.equal(addOccurrence?.short_name, "Add occurrence");
  assert.match(addOccurrence?.description ?? "", /occurrence/i);
});

test("new portable project integration uses .lum.json while legacy .luum remains import-compatible", async () => {
  const [html, app, platformSource, manifestSource] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/platform-capabilities.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/public/manifest.webmanifest", import.meta.url), "utf8"),
  ]);

  assert.match(app, /\.lum\.json/);
  assert.doesNotMatch(app, /canonicalProjectFilename[\s\S]{0,160}\.luum/);

  assert.match(html, /application\/vnd\.lum\.project\+json/);
  assert.match(html, /\.lum\.json/);
  assert.match(html, /\.luum/);

  assert.match(platformSource, /\.lum\.json/);
  assert.match(platformSource, /\.luum/);
  assert.match(platformSource, /project\.lum\.json/);

  const pwa = JSON.parse(manifestSource);
  const accepted = pwa.file_handlers?.[0]?.accept?.["application/json"] ?? [];
  assert.ok(accepted.includes(".lum.json"));
  assert.ok(accepted.includes(".luum"));
});
