import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("retained event card keeps legacy detail markup as dormant compatibility structure", async () => {
  const card = await readFile(
    new URL("../site/components/timeline-event-card.ts", import.meta.url),
    "utf8",
  );

  assert.match(card, /class LuumEventCardElement extends LitElement/);
  assert.match(card, /get detailHost\(\): HTMLElement \| null/);
  assert.match(card, /setExpanded\(expanded: boolean\)/);
  assert.match(card, /timeline-event-detail/);
  assert.match(card, /data-occurrence-detail/);
  assert.doesNotMatch(card, /aria-controls="timeline-focus-view"/);
});

test("timeline focus routes occurrence detail to the composer instead of expanding the retained card", async () => {
  const [view, presentation] = await Promise.all([
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/occurrence-interaction-session.ts", import.meta.url), "utf8"),
  ]);

  const ensureStart = view.indexOf("  ensureFocusPopover(): void");
  const ensureEnd = view.indexOf("\n  closeFocus(): void", ensureStart);
  const ensureBody = view.slice(ensureStart, ensureEnd);

  assert.match(ensureBody, /timelineoccurrenceeditrequest/);
  assert.match(ensureBody, /relationshipId: item\?\.relationshipId/);
  assert.doesNotMatch(ensureBody, /setPresentation\([^\n]*"expanded"/);
  assert.doesNotMatch(ensureBody, /explicitDetailOpen = true/);

  const resolverStart = presentation.indexOf("export function resolveOccurrencePresentation");
  const resolverEnd = presentation.indexOf(
    "\nexport function setComposerDraft",
    resolverStart,
  );
  const resolver = presentation.slice(resolverStart, resolverEnd);
  assert.match(resolver, /viewport\.focused \? "focused" : "selected"/);
  assert.doesNotMatch(resolver, /return setPresentation\([^\n]*"expanded"/);
  assert.doesNotMatch(resolver, /selectedIsVisible|logicalHasOther|hasDemotionBlocker/);
});

test("rendered timeline occurrence carries the canonical relationship identity used by its sentence", async () => {
  const [app, view] = await Promise.all([
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
  ]);

  assert.match(
    app,
    /const primaryRelationship = state\.relationships\.find[\s\S]*relationshipId: primaryRelationship \? String\(primaryRelationship\.id\) : undefined,[\s\S]*composition: primaryRelationship/,
  );
  assert.match(view, /interface TimelineItem[\s\S]*relationshipId\?: string/);
  assert.match(
    view,
    /timelinefocuschange[\s\S]*relationshipId: item\.relationshipId[\s\S]*presentationSurface: "card"/,
  );
  assert.match(
    view,
    /timelineoccurrenceeditrequest[\s\S]*relationshipId: item\.relationshipId/,
  );
});

test("card focus does not engage the old workspace-resizing focus layout", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

  assert.match(app, /presentationSurface === "card"/);
  assert.match(app, /classList\.toggle\("is-event-card-focused"/);
  assert.match(app, /classList\.toggle\("is-event-focused", focused && !cardFocused\)/);
  assert.match(app, /recenterGraph: !cardFocused/);
});
