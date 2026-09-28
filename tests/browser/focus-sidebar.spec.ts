import { expect, type Locator, type Page, test } from "@playwright/test";

async function ensureSample(page: Page) {
  const terminal = page
    .locator(
      "#timeline-view .timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible",
    )
    .first();
  if (await terminal.count()) return terminal;
  await page.locator("#load-sample").evaluate((button: HTMLButtonElement) => button.click());
  await expect(terminal).toBeVisible();
  return terminal;
}

async function focusOccurrence(page: Page) {
  const terminal = await ensureSample(page);
  const card = terminal.locator("xpath=ancestor::luum-event-card[1]");
  await terminal.evaluate((button: HTMLButtonElement) => button.click());
  await terminal.evaluate((button: HTMLButtonElement) => button.click());
  const focus = card.locator(".timeline-event-detail");
  await expect(card).toHaveAttribute("data-expanded", "true");
  await expect(focus).toBeVisible();
  await expect(focus).toHaveAttribute("data-presentation-surface", "card");
  await expect(page.locator("#timeline-focus-view")).toBeHidden();
  await expect(page.locator("#app-shell")).toHaveClass(/is-event-card-focused/);
  return focus;
}

async function focusOccurrenceWithEvidence(
  page: Page,
  terminalSelector = "#timeline-view .timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible",
) {
  await page.locator("#load-sample").evaluate((button: HTMLButtonElement) => button.click());
  const terminals = page.locator(terminalSelector);
  const count = Math.min(await terminals.count(), 24);
  for (let index = 0; index < count; index += 1) {
    const terminal = terminals.nth(index);
    const card = terminal.locator("xpath=ancestor::luum-event-card[1]");
    await terminal.evaluate((button: HTMLButtonElement) => button.click());
    await terminal.evaluate((button: HTMLButtonElement) => button.click());
    const focus = card.locator(".timeline-event-detail");
    if (await focus.getByRole("tab", { name: "Evidence" }).count()) {
      await expect(focus).toBeVisible();
      return focus;
    }
  }
  throw new Error("Sample must expose a focused occurrence with evidence.");
}

async function focusOccurrenceWithEvidenceAndMultipleMedia(page: Page) {
  await page.locator("#load-sample").evaluate((button: HTMLButtonElement) => button.click());
  const terminals = page.locator(
    "#timeline-view .timeline-event-terminal:has(.timeline-event-art):visible",
  );
  const count = Math.min(await terminals.count(), 24);
  for (let index = 0; index < count; index += 1) {
    const terminal = terminals.nth(index);
    const card = terminal.locator("xpath=ancestor::luum-event-card[1]");
    await terminal.evaluate((button: HTMLButtonElement) => button.click());
    await terminal.evaluate((button: HTMLButtonElement) => button.click());
    const focus = card.locator(".timeline-event-detail");
    const evidence = focus.getByRole("tab", { name: "Evidence" });
    const deck = focus.locator("luum-occurrence-deck");
    if (!(await evidence.count()) || !(await deck.count())) continue;
    const frameCount = Number(await deck.getAttribute("data-frame-count"));
    if (frameCount >= 2) {
      await expect(focus).toBeVisible();
      return focus;
    }
  }
  throw new Error("Sample must expose an evidence-backed occurrence with multiple media frames.");
}

async function ensureOrientation(page: Page, orientation: "landscape" | "portrait") {
  const timeline = page.locator("#timeline-view");
  if ((await timeline.getAttribute("data-orientation")) !== orientation) {
    await page.locator("#timeline-orientation-toggle").click();
  }
  await expect(timeline).toHaveAttribute("data-orientation", orientation);
}

async function boxes(page: Page, focus: Locator) {
  const [focusBox, graphBox, timelineBox, stageBox, footerBox] = await Promise.all([
    focus.boundingBox(),
    page.locator("#graph-lens").boundingBox(),
    page.locator(".timeline-surface").boundingBox(),
    page.locator("#presentation-stage").boundingBox(),
    page.locator(".app-footer-bar").boundingBox(),
  ]);
  expect(focusBox).not.toBeNull();
  expect(graphBox).not.toBeNull();
  expect(timelineBox).not.toBeNull();
  expect(stageBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  if (!focusBox || !graphBox || !timelineBox || !stageBox || !footerBox) {
    throw new Error("Focused presentation surfaces must all have layout bounds.");
  }
  return { focusBox, graphBox, timelineBox, stageBox, footerBox };
}

function overlapArea(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#timeline-view")).toBeVisible();
});

test("landscape matches portrait timeline spacing at the physical edge", async ({ page }) => {
  const outerEdgePixels = async (orientation: "landscape" | "portrait") => {
    await ensureOrientation(page, orientation);
    const [surfaceBox, axisBox] = await Promise.all([
      page.locator(".timeline-surface").boundingBox(),
      page.locator(".timeline-axis").boundingBox(),
    ]);
    expect(surfaceBox).not.toBeNull();
    expect(axisBox).not.toBeNull();
    if (!surfaceBox || !axisBox)
      throw new Error(`${orientation} timeline geometry is unavailable.`);

    if (orientation === "landscape") {
      const axisCenter = axisBox.y + axisBox.height / 2;
      return surfaceBox.y + surfaceBox.height - axisCenter;
    }

    const axisCenter = axisBox.x + axisBox.width / 2;
    return surfaceBox.x + surfaceBox.width - axisCenter;
  };

  const portraitEdgePixels = await outerEdgePixels("portrait");
  const landscapeEdgePixels = await outerEdgePixels("landscape");

  expect(landscapeEdgePixels).toBeGreaterThanOrEqual(63);
  expect(landscapeEdgePixels).toBeLessThanOrEqual(94);
  expect(Math.abs(landscapeEdgePixels - portraitEdgePixels)).toBeLessThanOrEqual(2);
});

test("focused detail owns contextual actions without mutating the footer", async ({ page }) => {
  const focus = await focusOccurrence(page);
  await expect(focus).toHaveAttribute("data-presentation-surface", "card");
  await expect(focus).not.toHaveAttribute("popover", /.+/);
  await expect
    .poll(() => focus.evaluate((element) => element.matches(":popover-open")))
    .toBe(false);

  await expect(focus.locator(".timeline-focus-hero")).toBeVisible();
  await expect(focus.getByRole("tab", { name: "Context" })).toBeVisible();
  const evidenceTab = focus.getByRole("tab", { name: "Evidence" });
  if (await evidenceTab.count()) {
    await expect(focus.locator(".timeline-focus-evidence-card").first()).toBeAttached();
  }
  await expect(focus.locator(".timeline-focus-actions")).toHaveCount(0);
  await expect(focus.getByRole("region", { name: "Place" })).toHaveCount(0);
  await expect(focus.locator(".timeline-focus-edit")).toHaveCount(0);

  const headerActions = focus.locator(".timeline-focus-context-actions");
  await expect(headerActions).toBeVisible();
  for (const selector of [
    "#timeline-focus-prev",
    "#timeline-focus-next",
    "#timeline-related-zoom",
    "#timeline-related-fit",
  ]) {
    const action = headerActions.locator(selector);
    await expect(action).toBeVisible();
    const [buttonBox, iconBox] = await Promise.all([
      action.boundingBox(),
      action.locator(":scope > .semantic-icon").boundingBox(),
    ]);
    expect(buttonBox).not.toBeNull();
    expect(iconBox).not.toBeNull();
    if (!buttonBox || !iconBox) continue;
    expect(Math.abs(buttonBox.width - 44)).toBeLessThanOrEqual(1);
    expect(Math.abs(buttonBox.height - 44)).toBeLessThanOrEqual(1);
    expect(Math.abs(iconBox.width - 20)).toBeLessThanOrEqual(1);
    expect(Math.abs(iconBox.height - 20)).toBeLessThanOrEqual(1);
    expect(
      Math.abs(iconBox.x + iconBox.width / 2 - (buttonBox.x + buttonBox.width / 2)),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(iconBox.y + iconBox.height / 2 - (buttonBox.y + buttonBox.height / 2)),
    ).toBeLessThanOrEqual(1);
    const chrome = await action.evaluate((element) => {
      const style = getComputedStyle(element);
      const pseudo = getComputedStyle(element, "::before");
      return {
        radius: style.borderRadius,
        borderWidth: style.borderTopWidth,
        pseudoContent: pseudo.content,
      };
    });
    expect(chrome.radius).not.toBe("999px");
    expect(chrome.borderWidth).toBe("1px");
    expect(["none", "normal", '""']).toContain(chrome.pseudoContent);
  }
  await expect(page.locator(".app-footer-bar #timeline-focus-prev")).toHaveCount(0);
  await expect(page.locator(".app-footer-bar #timeline-related-zoom")).toHaveCount(0);
  await expect(page.locator("#timeline-focus-edit")).toHaveCount(0);
  await expect(page.locator("#editor-toggle")).toHaveAttribute("aria-label", "Edit timeline");
  await expect(page.locator("#editor-toggle")).toHaveAttribute("data-semantic-icon", "edit");
  await expect(page.locator("#editor-toggle")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#timeline-view-toolbar")).toBeVisible();

  await focus.locator(".timeline-focus-close").click();
  await expect(focus).toBeHidden();
});

test("composer opens from selected context without dismissing focus or activating Edit", async ({
  page,
}) => {
  const focus = await focusOccurrence(page);
  const composer = page.locator("#occurrence-composer");
  const compact = composer.locator(".compact");

  await expect(compact).toBeVisible();
  await compact.click();

  await expect(composer).toHaveAttribute("active", "");
  await expect(focus).toBeVisible();
  await expect(page.locator("#app-shell")).toHaveClass(/is-event-card-focused/);
  await expect(page.locator("#editor-toggle")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#editor-toggle")).toHaveAttribute("aria-label", "Edit timeline");

  await composer.locator("input").press("Escape");
  await expect(composer).not.toHaveAttribute("active", "");
  await expect(compact).toBeVisible();
  await expect(focus).toBeVisible();
});

test("occurrence sentence sections move the single composer into the retained card", async ({
  page,
}) => {
  await page.locator("#load-sample").evaluate((button: HTMLButtonElement) => button.click());
  const terminals = page.locator(
    "#timeline-view .timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible",
  );
  const count = Math.min(await terminals.count(), 16);
  let focus: Locator | null = null;
  let segment: Locator | null = null;

  for (let index = 0; index < count; index += 1) {
    const terminal = terminals.nth(index);
    await terminal.evaluate((button: HTMLButtonElement) => button.click());
    await terminal.evaluate((button: HTMLButtonElement) => button.click());
    const card = terminal.locator("xpath=ancestor::luum-event-card[1]");
    const candidateFocus = card.locator(".timeline-event-detail");
    const candidateSegment = candidateFocus.locator(".timeline-focus-composition-segment").first();
    if (await candidateSegment.count()) {
      focus = candidateFocus;
      segment = candidateSegment;
      break;
    }
  }

  expect(focus).not.toBeNull();
  expect(segment).not.toBeNull();
  if (!focus || !segment) throw new Error("Sample must expose an editable occurrence composition.");

  await expect(focus).toBeVisible();
  const sectionKind = await segment.getAttribute("data-composer-section-kind");
  const expectedText = (await segment.textContent())?.trim() ?? "";
  expect(sectionKind).toBeTruthy();
  expect(expectedText).not.toBe("");

  await segment.click();

  const composer = page.locator("#occurrence-composer");
  const cardHost = focus.locator("[data-occurrence-composer-host]");
  await expect(cardHost).toBeVisible();
  await expect(cardHost.locator("#occurrence-composer")).toHaveCount(1);
  await expect(page.locator("luum-occurrence-composer")).toHaveCount(1);
  await expect(page.getByRole("combobox")).toHaveCount(1);
  await expect(composer).toHaveAttribute("data-host", "card");
  await expect(page.locator(".occurrence-composer-proxy")).toBeVisible();

  const selection = await composer.locator("input").evaluate((input: HTMLInputElement) => ({
    value: input.value,
    start: input.selectionStart,
    end: input.selectionEnd,
  }));
  expect(selection.start).not.toBeNull();
  expect(selection.end).not.toBeNull();
  expect(selection.value.slice(selection.start ?? 0, selection.end ?? 0)).toBe(expectedText);

  await composer.locator("input").press("Escape");
  await expect(composer).not.toHaveAttribute("active", "");
  await expect(composer).toHaveAttribute("data-host", "footer");
  await expect(page.locator(".occurrence-composer-proxy")).toBeHidden();
});

test("clicking the selected card keeps its attached detail open", async ({ page }) => {
  const terminal = await ensureSample(page);
  const focus = await focusOccurrence(page);
  await terminal.evaluate((button: HTMLButtonElement) => button.click());
  await expect(focus).toBeVisible();
  await expect(page.locator("#app-shell")).toHaveClass(/is-event-card-focused/);
});

test("focused detail tabs use roving keyboard focus and proper tabpanel semantics", async ({
  page,
}) => {
  const focus = await focusOccurrenceWithEvidence(page);
  const contextTab = focus.getByRole("tab", { name: "Context" });
  const evidenceTab = focus.getByRole("tab", { name: "Evidence" });
  const contextPanel = focus.locator("#timeline-focus-context-panel");
  const evidencePanel = focus.locator("#timeline-focus-evidence-panel");

  await expect(contextTab).toHaveAttribute("aria-selected", "true");
  await expect(contextTab).toHaveAttribute("tabindex", "0");
  await expect(evidenceTab).toHaveAttribute("tabindex", "-1");
  await expect(contextPanel).toHaveAttribute("role", "tabpanel");
  await expect(contextPanel).toHaveAttribute("aria-labelledby", "timeline-focus-context-tab");
  await expect(evidencePanel).toHaveAttribute("aria-labelledby", "timeline-focus-evidence-tab");

  await contextTab.focus();
  await contextTab.press("ArrowRight");
  await expect(evidenceTab).toBeFocused();
  await expect(evidenceTab).toHaveAttribute("aria-selected", "true");
  await expect(evidenceTab).toHaveAttribute("tabindex", "0");
  await expect(contextTab).toHaveAttribute("tabindex", "-1");
  await expect(contextPanel).toBeHidden();
  await expect(evidencePanel).toBeVisible();
  const identity = focus.locator(".timeline-focus-identity");
  if (await identity.isVisible()) {
    await expect(identity).toBeVisible();
  }

  await evidenceTab.press("Home");
  await expect(contextTab).toBeFocused();
  await expect(contextTab).toHaveAttribute("aria-selected", "true");
  await expect(contextPanel).toBeVisible();
});

test("hero image changes preserve the active detail tab and keyboard focus", async ({ page }) => {
  const focus = await focusOccurrenceWithEvidenceAndMultipleMedia(page);
  await expect(focus).toBeVisible();
  const deck = focus.locator("luum-occurrence-deck");
  await expect(deck).toBeVisible();
  await expect(deck).toHaveAttribute("data-frame-count", /[2-9]/);
  const evidenceTab = focus.getByRole("tab", { name: "Evidence" });
  await evidenceTab.click();
  await expect(focus).toHaveAttribute("data-active-tab", "evidence");

  const next = focus.locator(".timeline-focus-media-control.is-next");
  await expect(next).toBeVisible();
  const before = await focus
    .locator(".timeline-focus-slide-dot.is-active")
    .getAttribute("data-slide-index");
  await next.click();

  await expect(focus).toHaveAttribute("data-active-tab", "evidence");
  await expect(focus.getByRole("tab", { name: "Evidence" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(focus.locator(".timeline-focus-media-control.is-next")).toBeFocused();
  const after = await focus
    .locator(".timeline-focus-slide-dot.is-active")
    .getAttribute("data-slide-index");
  expect(after).not.toBe(before);
});

test("focus edit affordances keep large hit targets with compact visible icons", async ({
  page,
}) => {
  const focus = await focusOccurrence(page);
  const edit = focus.locator(".timeline-focus-edit").first();
  await expect(edit).toBeVisible();
  const [buttonBox, iconBox] = await Promise.all([
    edit.boundingBox(),
    edit.locator(".semantic-icon").boundingBox(),
  ]);
  expect(buttonBox).not.toBeNull();
  expect(iconBox).not.toBeNull();
  if (!buttonBox || !iconBox) return;
  expect(buttonBox.width).toBeGreaterThanOrEqual(44);
  expect(buttonBox.height).toBeGreaterThanOrEqual(44);
  expect(iconBox.width).toBeLessThanOrEqual(20);
  expect(iconBox.height).toBeLessThanOrEqual(20);
});

test("semantic activation of the selected occurrence keeps explicit-close focus open", async ({
  page,
}) => {
  const focus = await focusOccurrence(page);
  const semantic = page.locator('.timeline-semantic-occurrence[aria-current="true"]').first();
  await semantic.evaluate((button: HTMLButtonElement) => button.click());
  await expect(focus).toBeVisible();
  await expect(page.locator("#app-shell")).toHaveClass(/is-event-card-focused/);
});

test("landscape keeps timeline and graph geometry stable while retained detail overlays the world", async ({
  page,
}) => {
  await ensureOrientation(page, "landscape");
  const [timelineBefore, graphBefore, stageBefore] = await Promise.all([
    page.locator(".timeline-surface").boundingBox(),
    page.locator("#graph-lens").boundingBox(),
    page.locator("#presentation-stage").boundingBox(),
  ]);
  expect(timelineBefore).not.toBeNull();
  expect(graphBefore).not.toBeNull();
  expect(stageBefore).not.toBeNull();

  const focus = await focusOccurrence(page);
  const { focusBox, graphBox, timelineBox, stageBox } = await boxes(page, focus);
  if (!timelineBefore || !graphBefore || !stageBefore) {
    throw new Error("Landscape baseline geometry is unavailable.");
  }

  for (const [before, after] of [
    [timelineBefore, timelineBox],
    [graphBefore, graphBox],
    [stageBefore, stageBox],
  ] as const) {
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(2);
  }

  expect(overlapArea(focusBox, graphBox)).toBeGreaterThan(100);
  expect(focusBox.x).toBeGreaterThanOrEqual(stageBox.x - 1);
  expect(focusBox.y).toBeGreaterThanOrEqual(stageBox.y - 1);
  expect(focusBox.x + focusBox.width).toBeLessThanOrEqual(stageBox.x + stageBox.width + 1);
  expect(focusBox.y + focusBox.height).toBeLessThanOrEqual(stageBox.y + stageBox.height + 1);
});

test("portrait keeps timeline and graph geometry stable while retained detail overlays the world", async ({
  page,
}) => {
  await ensureOrientation(page, "portrait");
  const [timelineBefore, graphBefore, stageBefore] = await Promise.all([
    page.locator(".timeline-surface").boundingBox(),
    page.locator("#graph-lens").boundingBox(),
    page.locator("#presentation-stage").boundingBox(),
  ]);
  expect(timelineBefore).not.toBeNull();
  expect(graphBefore).not.toBeNull();
  expect(stageBefore).not.toBeNull();

  const focus = await focusOccurrence(page);
  const { focusBox, graphBox, timelineBox, stageBox } = await boxes(page, focus);
  if (!timelineBefore || !graphBefore || !stageBefore) {
    throw new Error("Portrait baseline geometry is unavailable.");
  }

  for (const [before, after] of [
    [timelineBefore, timelineBox],
    [graphBefore, graphBox],
    [stageBefore, stageBox],
  ] as const) {
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(2);
  }

  expect(overlapArea(focusBox, graphBox)).toBeGreaterThan(100);
  expect(focusBox.x).toBeGreaterThanOrEqual(stageBox.x - 1);
  expect(focusBox.y).toBeGreaterThanOrEqual(stageBox.y - 1);
  expect(focusBox.x + focusBox.width).toBeLessThanOrEqual(stageBox.x + stageBox.width + 1);
  expect(focusBox.y + focusBox.height).toBeLessThanOrEqual(stageBox.y + stageBox.height + 1);
});

test("focused detail stays compact and physically attached to its selected occurrence card", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });

  for (const orientation of ["landscape", "portrait"] as const) {
    await page.goto("/");
    await ensureOrientation(page, orientation);
    const terminal = await ensureSample(page);
    const card = terminal.locator("xpath=ancestor::luum-event-card[1]");
    await terminal.evaluate((button: HTMLButtonElement) => button.click());
    await terminal.evaluate((button: HTMLButtonElement) => button.click());

    const focus = card.locator(".timeline-event-detail");
    await expect(focus).toBeVisible();
    await expect(focus).toHaveAttribute("data-anchor-side", /^(above|below|left|right)$/);

    const [focusBox, terminalBox, stageBox, heroBox] = await Promise.all([
      focus.boundingBox(),
      terminal.boundingBox(),
      page.locator("#presentation-stage").boundingBox(),
      focus.locator(".timeline-focus-hero").boundingBox(),
    ]);
    expect(focusBox).not.toBeNull();
    expect(terminalBox).not.toBeNull();
    expect(stageBox).not.toBeNull();
    expect(heroBox).not.toBeNull();
    if (!focusBox || !terminalBox || !stageBox || !heroBox) {
      throw new Error("Focused occurrence attachment geometry is unavailable.");
    }

    expect(focusBox.width).toBeLessThanOrEqual(514);
    expect(focusBox.height).toBeLessThanOrEqual(450);
    expect(focusBox.width * focusBox.height).toBeLessThan(stageBox.width * stageBox.height * 0.5);
    expect(heroBox.height).toBeLessThanOrEqual(184);

    const side = await focus.getAttribute("data-anchor-side");
    const edgeGap =
      side === "above"
        ? terminalBox.y - (focusBox.y + focusBox.height)
        : side === "below"
          ? focusBox.y - (terminalBox.y + terminalBox.height)
          : side === "left"
            ? terminalBox.x - (focusBox.x + focusBox.width)
            : focusBox.x - (terminalBox.x + terminalBox.width);
    expect(edgeGap).toBeGreaterThanOrEqual(4);
    expect(edgeGap).toBeLessThanOrEqual(14);

    const style = await focus.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        borderColor: computed.borderTopColor,
        left: computed.left,
        top: computed.top,
      };
    });
    expect(style.borderColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(style.left).not.toBe("auto");
    expect(style.top).not.toBe("auto");
  }
});

test("Browse and persistent View controls do not discard the focused occurrence", async ({
  page,
}) => {
  await focusOccurrence(page);

  await page.locator("#timeline-browser-toggle").click();
  await expect(page.locator("#app-shell")).toHaveAttribute("data-browser-open", "true");
  await expect(page.locator("#app-shell")).toHaveClass(/is-event-card-focused/);
  await page.locator("#timeline-browser-close").click();

  await expect(page.locator("#timeline-view-controls")).toBeVisible();
  await expect(page.locator("#app-shell")).toHaveClass(/is-event-card-focused/);
});
