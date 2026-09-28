import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("composer owns the card and incremental world preview with interactive grammar chips", async () => {
  const source = await readFile(
    new URL("../site/components/occurrence-composer.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /projectComposerPreview\(\s*this\.value/);
  assert.match(source, /class="composer-occurrence-card"/);
  assert.match(source, /selectionContext\?\.description/);
  assert.match(source, /selectionContext\?\.media/);
  assert.match(source, /class="composer-world-preview"/);
  assert.match(source, /class="mini-world-pin"/);
  assert.match(source, /composerEditableSections\(this\.value\)/);
  assert.match(source, /selectSection\(section\.start, section\.end\)/);
  assert.match(source, /input\.setSelectionRange\(start, end\)/);
  assert.match(source, /aria-label="Approve occurrence"/);
  assert.match(source, /projectInvestigativeQualifiers\(this\.value\)/);
  assert.match(source, /previewCategory\?\.color/);
});

test("investigative question travels to application reasoning authority", async () => {
  const [composer, app] = await Promise.all([
    readFile(new URL("../site/components/occurrence-composer.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);
  assert.match(composer, /occurrenceinvestigationactionrequest/);
  assert.match(app, /addEventListener\("occurrenceinvestigationactionrequest"/);
  assert.match(app, /caseReasoning\s*\.validateReasoning\(next/);
  assert.match(app, /applyInvestigationReasoning\(next/);
});

test("expanded timeline detail yields to the composer-owned card while editing", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  assert.match(css, /:has\(#occurrence-composer\[active\]\) \.timeline-event-detail/);
});
