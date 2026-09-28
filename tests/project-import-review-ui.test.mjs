import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("generated proposal review is a bounded modal application sheet", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/spatial-shell.css", import.meta.url), "utf8"),
  ]);

  assert.match(
    html,
    /id="project-import-review-sheet"[\s\S]*role="dialog"[\s\S]*aria-modal="true"[\s\S]*aria-labelledby="project-import-review-title"/,
  );
  for (const id of [
    "project-import-review-summary",
    "project-import-review-sources",
    "project-import-review-unresolved",
    "project-import-review-findings",
    "project-import-review-notes",
    "project-import-review-instructions",
    "project-import-review-approve",
    "project-import-review-cancel",
    "project-import-review-close",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }

  assert.match(
    css,
    /#app-shell\[data-import-review-open="true"\]\s*>\s*\.project-import-review-sheet[\s\S]*position:\s*fixed[\s\S]*z-index:\s*1550[\s\S]*inset:/,
  );
  assert.match(css, /\.project-import-review-panel[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.project-import-review-actions[\s\S]*min-block-size:\s*44px/);
});

test("staging opens review and approval revalidates before canonical import", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

  assert.match(app, /function renderProjectImportReview/);
  assert.match(app, /function setProjectImportReviewOpen/);
  assert.match(
    app,
    /pendingProjectImportReview = staged;[\s\S]*renderProjectImportReview\(review\)[\s\S]*setProjectImportReviewOpen\(true\)/,
  );
  assert.match(
    app,
    /projectImportReviewApprove\.addEventListener\("click"[\s\S]*verifyStagedProjectImport\([\s\S]*applyImportedTimeline\(/,
  );
  assert.match(
    app,
    /projectImportReviewCancel\.addEventListener\("click"[\s\S]*pendingProjectImportReview = null/,
  );
  assert.match(
    app,
    /projectImportReviewClose\.addEventListener\("click"[\s\S]*pendingProjectImportReview = null/,
  );
  assert.match(
    app,
    /projectImportReviewApprove\.disabled\s*=\s*review\.status !== "ready-for-user-verification"/,
  );
});

test("review makes provenance, unresolved facts, and findings visible without exposing background controls", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

  assert.match(app, /review\.sources/);
  assert.match(app, /review\.unresolved/);
  assert.match(app, /review\.warnings/);
  assert.match(app, /review\.errors/);
  assert.match(app, /review\.generationNotes/);
  assert.match(app, /review\.verificationInstructions/);
  assert.match(app, /review\.fingerprint/);

  assert.match(
    app,
    /presentationStage\.inert = Boolean\([\s\S]*ui\.importReviewOpen/,
  );
  assert.match(app, /appToolDock\.inert = ui\.importReviewOpen/);
  assert.match(
    app,
    /if \(ui\.importReviewOpen\)[\s\S]*setProjectImportReviewOpen\(false/,
  );
});
