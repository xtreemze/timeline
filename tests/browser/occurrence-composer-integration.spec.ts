import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#occurrence-composer .compact")).toBeVisible();
});

test("composer keeps active suggestions visible across keyboard, wheel, and reset", async ({
  page,
}) => {
  const composer = page.locator("#occurrence-composer");
  await composer.locator(".compact").click();
  const input = composer.locator('input[role="combobox"]');
  const panel = composer.locator(".completion-panel");
  const listbox = composer.locator(".listbox");
  const options = composer.locator(".option");

  await expect(input).toBeVisible();
  await expect.poll(async () => options.count()).toBeGreaterThan(4);
  await listbox.evaluate((element: HTMLElement) => {
    element.style.maxBlockSize = "6rem";
  });

  const choiceGeometry = async () =>
    composer.evaluate((element) => {
      const root = element.shadowRoot;
      const panel = root?.querySelector<HTMLElement>(".completion-panel");
      const listbox = root?.querySelector<HTMLElement>(".listbox");
      const active = root?.querySelector<HTMLElement>('.option[aria-selected="true"]');
      if (!panel || !listbox || !active) {
        throw new Error("active composer suggestion unavailable");
      }
      const listboxRect = listbox.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      return {
        id: active.id,
        panelScrollTop: panel.scrollTop,
        listboxScrollTop: listbox.scrollTop,
        centerDelta:
          activeRect.top + activeRect.height / 2 -
          (listboxRect.top + listboxRect.height / 2),
      };
    });

  await input.press("ArrowDown");
  await input.press("ArrowDown");
  await input.press("ArrowDown");
  await expect.poll(async () => Math.abs((await choiceGeometry()).centerDelta)).toBeLessThanOrEqual(24);
  const keyboardState = await choiceGeometry();
  expect(keyboardState.listboxScrollTop).toBeGreaterThan(0);
  expect(keyboardState.panelScrollTop).toBe(0);

  await input.hover();
  await page.mouse.wheel(0, 120);
  await expect.poll(async () => (await choiceGeometry()).id).not.toBe(keyboardState.id);
  await expect.poll(async () => Math.abs((await choiceGeometry()).centerDelta)).toBeLessThanOrEqual(24);

  const beforeDiagonal = await choiceGeometry();
  const diagonalPrevented = await input.evaluate((element) => {
    const event = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaX: 120,
      deltaY: 100,
    });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(diagonalPrevented).toBe(false);
  await expect.poll(async () => (await choiceGeometry()).id).toBe(beforeDiagonal.id);

  for (let index = 0; index < 8; index += 1) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(95);
  }
  const lastIndex = (await options.count()) - 1;
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    `occurrence-composer-option-${lastIndex}`,
  );
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(95);
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    `occurrence-composer-option-${lastIndex}`,
  );

  await input.fill("");
  await expect.poll(async () => options.count()).toBeGreaterThan(4);
  await expect(input).toHaveAttribute("aria-activedescendant", "occurrence-composer-option-0");
  await expect.poll(async () => (await choiceGeometry()).listboxScrollTop).toBe(0);

  await input.fill("Alice");
  await input.press("Home");
  await expect
    .poll(() => input.evaluate((element: HTMLInputElement) => element.selectionStart))
    .toBe(0);
  await input.press("End");
  await expect
    .poll(() =>
      input.evaluate((element: HTMLInputElement) => ({
        selectionStart: element.selectionStart,
        length: element.value.length,
      })),
    )
    .toEqual({ selectionStart: 5, length: 5 });
});

test("selecting an occurrence through the visible card opens its composer-owned context", async ({ page }) => {
  const occurrence = page
    .locator(
      ".timeline-event:not(.timeline-cluster):not(.is-buffered) .timeline-event-terminal:visible",
    )
    .first();
  await expect(occurrence).toBeVisible();
  await occurrence.click();
  const composer = page.locator("#occurrence-composer");
  await expect(composer).toHaveAttribute("active", "");
  await expect(composer.locator(".composer-occurrence-card")).toBeVisible();
  await expect(composer.locator('input[role="combobox"]')).toBeVisible();
  await expect(composer.locator(".composer-world-preview")).toBeVisible();
  await expect(page.locator(".timeline-event-detail:visible")).toHaveCount(0);
  await expect(page.locator("#timeline-focus-view:visible")).toHaveCount(0);

  // Regression: once this occurrence is already selected/focused, closing the
  // composer and activating the same card again must reopen the composer rather
  // than falling back to the legacy detached timeline detail.
  await composer.getByRole("button", { name: "Close occurrence composer" }).click();
  await expect(composer.locator(".compact")).toBeVisible();
  await occurrence.click();
  await expect(composer).toHaveAttribute("active", "");
  await expect(composer.locator(".composer-occurrence-card")).toBeVisible();
  await expect(composer.locator('input[role="combobox"]')).toBeVisible();
  await expect(page.locator(".timeline-event-detail:visible")).toHaveCount(0);
});

test("multi-owned chronology item opens the exact rendered occurrence in the composer", async ({
  page,
}) => {
  const owners = await page.evaluate(() => {
    const project = (
      globalThis as typeof globalThis & {
        TimelineAgentAPI?: {
          getProject?: () => {
            relationships?: Array<{ id: string; itemIds?: string[] }>;
          };
        };
      }
    ).TimelineAgentAPI?.getProject?.();
    return (project?.relationships ?? [])
      .filter((relationship) => relationship.itemIds?.includes("pigs-childhood"))
      .map((relationship) => relationship.id);
  });
  expect(owners.length).toBeGreaterThan(1);

  await page.evaluate(() => {
    const root = document.querySelector("#timeline-view");
    if (!(root instanceof HTMLElement)) throw new Error("Timeline root unavailable.");
    const view = globalThis.TimelineView?.create(root);
    if (!view) throw new Error("Timeline controller unavailable.");
    view.focusItem("pigs-childhood", { moveViewport: false });
  });

  const composer = page.locator("#occurrence-composer");
  const input = composer.locator('input[role="combobox"]');
  await expect(composer).toHaveAttribute("active", "");
  await expect(composer.locator(".composer-occurrence-card")).toBeVisible();
  await expect(input).toHaveValue(/@pigs-mother raises @pigs-brothers/);
  await expect(composer.locator(".composer-context-deck")).toBeVisible();
  await expect(page.locator(".timeline-event-detail:visible")).toHaveCount(0);
  await expect(page.locator("#timeline-focus-view:visible")).toHaveCount(0);
});

test("selecting a World edge selects its timeline event and opens that event context", async ({ page }) => {
  await page.locator("#temporal-graph-view").evaluate((root) => {
    root.dispatchEvent(
      new CustomEvent("worldselectionchange", {
        bubbles: true,
        detail: {
          selection: {
            kind: "relationship",
            id: "rel-event-pigs-brick-build-action",
          },
        },
      }),
    );
  });

  const composer = page.locator("#occurrence-composer");
  await expect(composer).toHaveAttribute("active", "");
  await expect(composer.locator(".composer-card-heading")).toContainText(
    "Third Pig builds the brick house",
  );
  await expect(composer.locator("luum-occurrence-deck.composer-context-deck")).toHaveAttribute(
    "data-frame-count",
    "2",
  );
  await expect(
    page.locator('.timeline-semantic-occurrence[data-id="pigs-brick-build"]'),
  ).toHaveAttribute("data-selected", "");
  const renderedCard = page.locator('.timeline-event[data-id="pigs-brick-build"]');
  if (await renderedCard.count()) await expect(renderedCard).toHaveClass(/is-selected/);

  await composer.getByRole("button", { name: "Close occurrence composer" }).click();
  await page.locator("#temporal-graph-view").evaluate((root) => {
    root.dispatchEvent(
      new CustomEvent("worldselectionchange", {
        bubbles: true,
        detail: {
          selection: {
            kind: "relationship",
            id: "rel-event-pigs-brick-build-action",
          },
        },
      }),
    );
  });
  await expect(composer).toHaveAttribute("active", "");
  await expect(composer.locator(".composer-card-heading")).toContainText(
    "Third Pig builds the brick house",
  );
});

test("mobile composer fills one viewport lane, follows pan, and snaps centered", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const footer = page.locator(".app-footer-bar");
  const composer = page.locator("#occurrence-composer");
  await composer.locator(".compact").click();
  await expect(composer).toHaveAttribute("active", "");
  await expect(composer.locator('input[role="combobox"]')).toBeVisible();
  await expect(composer.locator(".completion-panel")).toBeVisible();

  const geometry = async () =>
    page.evaluate(() => {
      const footer = document.querySelector<HTMLElement>(".app-footer-bar");
      const composer = document.querySelector<HTMLElement>("#occurrence-composer");
      const shell = composer?.shadowRoot?.querySelector<HTMLElement>(".input-shell");
      const panel = composer?.shadowRoot?.querySelector<HTMLElement>(".completion-panel");
      if (!footer || !shell || !panel) throw new Error("mobile composer geometry unavailable");
      const shellRect = shell.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const viewportLeft = window.visualViewport?.offsetLeft ?? 0;
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      return {
        viewportWidth,
        viewportCenter: viewportLeft + viewportWidth / 2,
        footerOverflowX: getComputedStyle(footer).overflowX,
        footerSnapType: getComputedStyle(footer).scrollSnapType,
        footerClientWidth: footer.clientWidth,
        footerScrollWidth: footer.scrollWidth,
        footerScrollLeft: footer.scrollLeft,
        shellLeft: shellRect.left,
        shellCenter: shellRect.left + shellRect.width / 2,
        shellWidth: shellRect.width,
        shellSnapAlign: getComputedStyle(shell).scrollSnapAlign,
        shellSnapStop: getComputedStyle(shell).scrollSnapStop,
        panelLeft: panelRect.left,
        panelCenter: panelRect.left + panelRect.width / 2,
        panelWidth: panelRect.width,
      };
    });

  const initial = await geometry();
  expect(initial.footerOverflowX).toMatch(/auto|scroll/);
  expect(initial.footerSnapType).toMatch(/^x(?: proximity)?$/);
  expect(initial.shellSnapAlign).toContain("center");
  expect(initial.shellSnapStop).toBe("always");
  expect(initial.footerScrollWidth).toBeGreaterThan(initial.footerClientWidth);
  expect(Math.abs(initial.shellWidth - initial.viewportWidth)).toBeLessThanOrEqual(2);
  expect(Math.abs(initial.panelWidth - initial.viewportWidth)).toBeLessThanOrEqual(2);
  expect(Math.abs(initial.panelLeft - initial.shellLeft)).toBeLessThanOrEqual(2);
  expect(Math.abs(initial.shellCenter - initial.viewportCenter)).toBeLessThanOrEqual(2);
  expect(Math.abs(initial.panelCenter - initial.viewportCenter)).toBeLessThanOrEqual(2);

  await footer.evaluate((element: HTMLElement) => {
    // Programmatic scrollLeft is immediately snapped by Chromium when a
    // mandatory target is already centered. Disable snapping only while
    // sampling the in-progress pan geometry, then restore the authored rule.
    element.style.scrollSnapType = "none";
    const available = element.scrollWidth - element.clientWidth;
    element.scrollLeft = Math.min(96, Math.max(1, available));
  });
  await expect
    .poll(async () => (await geometry()).shellLeft)
    .toBeLessThan(initial.shellLeft - 1);

  const panned = await geometry();
  expect(panned.footerScrollLeft).toBeGreaterThan(0);
  expect(panned.panelLeft).toBeLessThan(initial.panelLeft - 1);
  expect(Math.abs(panned.panelLeft - panned.shellLeft)).toBeLessThanOrEqual(2);

  await footer.evaluate((element: HTMLElement) => {
    element.style.removeProperty("scroll-snap-type");
  });
  await composer.evaluate((element: HTMLElement & { revealMobileInputLane?: () => void }) => {
    element.revealMobileInputLane?.();
  });
  await expect
    .poll(async () => {
      const centered = await geometry();
      return Math.abs(centered.shellCenter - centered.viewportCenter);
    })
    .toBeLessThanOrEqual(2);

  const snapped = await geometry();
  expect(Math.abs(snapped.panelCenter - snapped.viewportCenter)).toBeLessThanOrEqual(2);
  expect(Math.abs(snapped.panelLeft - snapped.shellLeft)).toBeLessThanOrEqual(2);

  // Android keyboard geometry may change after focus. Lifting the footer must not
  // lose the horizontally centered composer lane.
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--app-visual-viewport-bottom", "128px");
  });
  await composer.evaluate((element: HTMLElement & { revealMobileInputLane?: () => void }) => {
    element.revealMobileInputLane?.();
  });
  await expect
    .poll(async () => {
      const box = await footer.boundingBox();
      return box ? Math.round(844 - (box.y + box.height)) : -1;
    })
    .toBe(128);
  const lifted = await geometry();
  expect(Math.abs(lifted.shellCenter - lifted.viewportCenter)).toBeLessThanOrEqual(2);
  expect(Math.abs(lifted.panelCenter - lifted.viewportCenter)).toBeLessThanOrEqual(2);
  await expect(composer.locator('input[role="combobox"]')).toBeFocused();
  await expect(composer.locator('input[role="combobox"]')).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.removeProperty("--app-visual-viewport-bottom");
  });

  const approve = composer.getByRole("button", { name: "Approve occurrence" });
  await approve.scrollIntoViewIfNeeded();
  await expect(approve).toBeVisible();
});

test("one native composer input decorates semantic ranges inline and keeps exact editing spans", async ({
  page,
}) => {
  const composer = page.locator("#occurrence-composer");
  await composer.locator(".compact").click();
  const input = composer.locator('input[role="combobox"]');
  await input.fill("Alice(icon: pi");
  await expect(composer.locator(".composer-world-preview .preview-node").first()).toContainText(
    "Alice",
  );
  const before = await composer
    .locator(".composer-world-preview .preview-node img")
    .first()
    .getAttribute("src");
  const iconOption = composer.locator(".option").filter({ hasText: "icon: pig" });
  await expect(iconOption).toBeVisible();
  await expect(iconOption.locator(".option-detail")).toHaveClass(/composer-chip/);
  await iconOption.hover();
  const after = await composer
    .locator(".composer-world-preview .preview-node img")
    .first()
    .getAttribute("src");
  expect(after).not.toBe(before);
  expect(decodeURIComponent(after ?? "")).toContain("<svg");

  await input.fill("@alice meets @bob at Stockholm on 2026-09-29 [category: Family, tags: important]");
  await expect(composer.locator(".context-row")).toHaveCount(0);
  const tokens = composer.locator(".input-token");
  await expect(tokens).not.toHaveCount(0);
  await expect(composer.locator('.input-token[data-kind="subject"]')).toHaveText("@alice");
  await expect(composer.locator('.input-token[data-kind="predicate"]')).toHaveText("meets");
  await expect(composer.locator('.input-token[data-kind="object"]')).toHaveText("@bob");
  await expect(composer.locator('.input-token[data-kind="place"]')).toHaveText("Stockholm");
  await expect(composer.locator('.input-token[data-kind="time"]')).toContainText("2026-09-29");
  await expect(composer.locator('.input-token[data-kind="category"]')).toHaveText("Family");
  await expect(composer.locator('.input-token[data-kind="tag"]')).toHaveText("important");

  const setCaretIn = async (needle: string) => {
    await input.evaluate((element: HTMLInputElement, text) => {
      const start = element.value.indexOf(text);
      if (start < 0) throw new Error(`Missing composer token: ${text}`);
      const offset = start + Math.max(1, Math.floor(text.length / 2));
      element.focus();
      element.setSelectionRange(offset, offset);
      element.dispatchEvent(new Event("select", { bubbles: true }));
    }, needle);
  };
  await setCaretIn("Stockholm");
  await expect(composer.locator('.input-token[data-kind="place"]')).toHaveAttribute(
    "data-active",
    "true",
  );
  await expect(composer.locator(".stage")).toHaveText("place");

  await setCaretIn("meets");
  await expect(composer.locator('.input-token[data-kind="predicate"]')).toHaveAttribute(
    "data-active",
    "true",
  );
  await expect(composer.locator(".stage")).toHaveText("action");

  const typography = await composer.locator(".input-shell").evaluate((shell) => {
    const input = shell.querySelector("input");
    const decoration = shell.querySelector(".input-decoration");
    if (!(input instanceof HTMLInputElement) || !(decoration instanceof HTMLElement)) {
      throw new Error("composer input decoration missing");
    }
    const inputStyle = getComputedStyle(input);
    const decorationStyle = getComputedStyle(decoration);
    return {
      inputFont: inputStyle.font,
      decorationFont: decorationStyle.font,
      inputPaddingLeft: inputStyle.paddingLeft,
      decorationPaddingLeft: decorationStyle.paddingLeft,
      decorationAriaHidden: decoration.getAttribute("aria-hidden"),
    };
  });
  expect(typography.decorationFont).toBe(typography.inputFont);
  expect(typography.decorationPaddingLeft).toBe(typography.inputPaddingLeft);
  expect(typography.decorationAriaHidden).toBe("true");

  await composer.evaluate((element) => {
    (element as HTMLElement & { focusSection(field: "place"): void }).focusSection("place");
  });
  await expect.poll(() =>
    input.evaluate((element: HTMLInputElement) =>
      element.value.slice(element.selectionStart ?? 0, element.selectionEnd ?? 0),
    ),
  ).toBe("Stockholm");
  await composer.evaluate((element) => {
    (element as HTMLElement & { focusSection(field: "tag"): void }).focusSection("tag");
  });
  await expect.poll(() =>
    input.evaluate((element: HTMLInputElement) =>
      element.value.slice(element.selectionStart ?? 0, element.selectionEnd ?? 0),
    ),
  ).toBe("important");

  await input.fill(
    "@alice meets @bob at Stockholm on 2026-09-29 [category: Family, tags: important|investigation|long-context-token]",
  );
  const scrollState = await input.evaluate((element: HTMLInputElement) => {
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
    element.scrollLeft = element.scrollWidth;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
    const content = element.parentElement?.querySelector<HTMLElement>(".input-decoration-content");
    return {
      scrollLeft: element.scrollLeft,
      transform: content?.style.transform ?? "",
    };
  });
  expect(scrollState.scrollLeft).toBeGreaterThan(0);
  expect(scrollState.transform).toBe(`translateX(-${scrollState.scrollLeft}px)`);
  await expect(composer.locator('input[role="combobox"]')).toHaveCount(1);
});

test("Space toggles multiple categories and tags while Enter advances option parts", async ({ page }) => {
  const composer = page.locator("#occurrence-composer");
  await composer.locator(".compact").click();
  await composer.evaluate((element) => {
    const api = element as HTMLElement & {
      setData(data: unknown): void;
    };
    api.setData({
      entities: [],
      places: [],
      categories: [
        { id: "observation", name: "Observation" },
        { id: "conflict", name: "Conflict" },
      ],
      tags: ["work", "urgent"],
      predicates: ["meets"],
    });
  });

  const input = composer.locator('input[role="combobox"]');
  await input.fill("@alice meets @bob [categories: ]");

  const categoryOptions = composer.locator('.option[data-multiselect="true"]');
  await expect(composer.locator("#occurrence-composer-listbox")).toHaveAttribute(
    "aria-multiselectable",
    "true",
  );
  await expect(categoryOptions.filter({ hasText: "Observation" })).toBeVisible();
  await input.press(" ");
  await expect(input).toHaveValue(/\[category: Observation\]$/);
  await expect(categoryOptions.filter({ hasText: "Observation" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await input.press("ArrowDown");
  await input.press(" ");
  await expect(input).toHaveValue(/\[categories: Observation\|Conflict\]$/);
  await expect(categoryOptions.filter({ hasText: "Conflict" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await input.press("Enter");
  await expect(input).toHaveValue(/\[categories: Observation\|Conflict, tags: \]$/);
  await expect(composer.locator('.option[data-multiselect="true"]').filter({ hasText: "work" })).toBeVisible();

  await input.press(" ");
  await expect(input).toHaveValue(/tags: work\]$/);
  await input.press("ArrowDown");
  await input.press(" ");
  await expect(input).toHaveValue(/tags: work\|urgent\]$/);

  await input.press("Enter");
  await expect(input).toHaveValue(
    "@alice meets @bob [categories: Observation|Conflict, tags: work|urgent]",
  );
  await expect(composer.locator(".stage")).toHaveText("ready");
});

test("composer uses chips for atomic metadata and live defaults without duplicating sentence text", async ({
  page,
}) => {
  const composer = page.locator("#occurrence-composer");
  await composer.locator(".compact").click();
  await composer.evaluate((element) => {
    const api = element as HTMLElement & { setSelectionContext(context: unknown): void };
    api.setSelectionContext({
      selectedOccurrenceId: "occ-chip-context",
      composition: "@alice meets @bob",
      title: "Chip context",
      metadata: {
        role: "witness",
        initialState: "inactive",
        sourceIds: ["source-a", "source-b"],
        confidence: 0.82,
      },
      relationship: { subjectId: "alice", objectId: "bob" },
    });
  });

  const input = composer.locator('input[role="combobox"]');
  await expect(input).toHaveValue("@alice meets @bob");
  await expect(composer.locator(".composer-card-meta-chips")).toBeVisible();
  await expect(composer.locator('[data-chip-kind="role"]')).toHaveText("witness");
  await expect(composer.locator('[data-chip-kind="state"]')).toHaveText("inactive");
  await expect(composer.locator('[data-chip-kind="confidence"]')).toContainText("82%");
  await expect(composer.locator('[data-chip-kind="source"]')).toHaveCount(2);
  await expect(composer.locator('[data-chip-kind="source"]').nth(0)).toContainText("source-a");
  await expect(composer.locator('[data-chip-kind="source"]').nth(1)).toContainText("source-b");

  const hints = composer.locator(".composer-context-hints");
  await expect(hints).toBeVisible();
  await expect(hints.locator('[data-chip-kind="live-place"]')).toContainText("live place");
  await expect(hints.locator('[data-chip-kind="live-time"]')).toContainText("live time");

  await expect(composer.locator(".composer-card-heading .card-status-chip")).toBeVisible();
  await expect(composer.locator(".composer-card-heading .card-status-chip")).toContainText("Draft");
  await expect(composer.locator(".context-row")).toHaveCount(0);
});

test("unresolved clue remains editable and cannot be approved as a fact", async ({ page }) => {
  const composer = page.locator("#occurrence-composer");
  await composer.locator(".compact").click();
  const input = composer.locator('input[role="combobox"]');
  await input.fill("man? calls @alice");
  const clue = composer.locator('.input-token[data-investigative="true"]');
  await expect(clue).toHaveCount(1);
  await expect(clue).toHaveText("man?");
  const coarsePointer = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  await input.evaluate((element: HTMLInputElement) => {
    const offset = element.value.indexOf("man?") + 1;
    element.focus();
    element.setSelectionRange(offset, offset);
    element.dispatchEvent(new Event("select", { bubbles: true }));
  });
  await expect(clue).toHaveAttribute("data-active", "true");
  await expect(composer.locator(".stage")).toHaveText("investigate");
  if (!coarsePointer) {
    await input.evaluate((element: HTMLInputElement) => {
      element.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    });
    await expect
      .poll(() =>
        input.evaluate((element: HTMLInputElement) =>
          element.value.slice(element.selectionStart ?? 0, element.selectionEnd ?? 0),
        ),
      )
      .toBe("man?");
  }
  await composer.getByRole("button", { name: "Approve occurrence" }).click();
  await expect(composer.locator(".diagnostic")).toContainText("Resolve or persist");
  await expect(input).toHaveValue("man? calls @alice");
  const askQuestion = composer.getByRole("button", { name: "Ask this question" });
  await expect(askQuestion).toBeVisible();
  await expect(askQuestion).toHaveClass(/composer-chip/);
  await expect(composer.locator(".candidate-assessment").first()).toHaveClass(/composer-chip/);
  await expect(composer.getByRole("table", { name: "Candidate comparison" })).toBeVisible();
  await expect(composer.locator(".candidate-row")).not.toHaveCount(0);
  await expect(composer.getByRole("button", { name: "Compare candidates" })).toBeVisible();
  await expect(composer.locator(".option")).toHaveCount(0);
  await expect(composer.locator('.candidate-row[data-active="true"]')).toHaveCount(1);
  const candidateMatrix = composer.locator(".candidate-matrix");
  await candidateMatrix.evaluate((element: HTMLElement) => {
    element.style.maxBlockSize = "5rem";
  });
  const firstCandidate = await composer.locator('.candidate-row[data-active="true"]').textContent();
  await input.press("ArrowDown");
  const secondCandidate = await composer.locator('.candidate-row[data-active="true"]').textContent();
  expect(secondCandidate).not.toBe(firstCandidate);
  await input.press("End");
  const activeCandidate = composer.locator('.candidate-row[data-active="true"]');
  await expect(activeCandidate).toContainText("None of the currently known candidates");
  await expect
    .poll(() => candidateMatrix.evaluate((element: HTMLElement) => element.scrollTop))
    .toBeGreaterThan(0);
  const activeCandidateId = await activeCandidate.getAttribute("id");
  expect(activeCandidateId).toBeTruthy();
  await expect(input).toHaveAttribute("aria-activedescendant", activeCandidateId ?? "");

  const lastCandidateId = await composer.locator(".candidate-row").last().getAttribute("id");
  await input.hover();
  await page.mouse.wheel(0, -120);
  await expect.poll(async () => activeCandidate.getAttribute("id")).not.toBe(lastCandidateId);
  const interpretationBefore = await composer
    .locator('.interpretation-chip[aria-pressed="true"]')
    .textContent();
  await input.press("ArrowRight");
  const interpretationAfter = await composer
    .locator('.interpretation-chip[aria-pressed="true"]')
    .textContent();
  expect(interpretationAfter).not.toBe(interpretationBefore);
  const pointerCandidate = (await composer.locator(".candidate-select").first().textContent()) ?? "";
  await composer.locator(".candidate-select").first().click();
  await expect(composer.locator('.candidate-row[data-active="true"]')).toContainText(
    pointerCandidate,
  );
  await input.press("Escape");
  await expect(composer.locator(".compact")).toBeVisible();
});


test("multiple investigative qualifiers retain exact ranges and exit without damaging the sentence", async ({
  page,
}) => {
  const composer = page.locator("#occurrence-composer");
  await composer.locator(".compact").click();
  const input = composer.locator('input[role="combobox"]');
  const sentence = 'man? observes "red jacket"? at "Central Station"? on 2026-09-14';
  await input.fill(sentence);

  const clues = composer.locator('.input-token[data-investigative="true"]');
  await expect(clues).toHaveCount(3);
  const coarsePointer = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  for (const expected of ["man?", '"red jacket"?', '"Central Station"?']) {
    const clue = clues.filter({ hasText: expected });
    await expect(clue).toHaveCount(1);
    await input.evaluate((element: HTMLInputElement, clueText) => {
      const offset = element.value.indexOf(clueText) + Math.max(1, Math.floor(clueText.length / 2));
      element.focus();
      element.setSelectionRange(offset, offset);
      element.dispatchEvent(new Event("select", { bubbles: true }));
    }, expected);
    await expect(clue).toHaveAttribute("data-active", "true");
    if (!coarsePointer) {
      await input.evaluate((element: HTMLInputElement) => {
        element.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      });
      await expect
        .poll(() =>
          input.evaluate((element: HTMLInputElement) =>
            element.value.slice(element.selectionStart ?? 0, element.selectionEnd ?? 0),
          ),
        )
        .toBe(expected);
    }
    await expect(input).toHaveValue(sentence);
  }

  await input.fill('man observes "red jacket" at "Central Station" on 2026-09-14');
  await expect(composer.locator("#occurrence-investigation-panel")).toHaveCount(0);
  await expect(input).not.toHaveAttribute("aria-controls", "occurrence-investigation-panel");
});

test("investigation stays inside the visual viewport and announces active state", async ({ page }) => {
  const composer = page.locator("#occurrence-composer");
  await composer.locator(".compact").click();
  const input = composer.locator('input[role="combobox"]');
  await input.fill("man? calls @alice");

  await expect(input).toHaveAttribute("aria-controls", "occurrence-investigation-panel");
  await expect(input).toHaveAttribute("aria-expanded", "true");
  const status = composer.locator("#occurrence-investigation-status");
  await expect(status).toContainText("Investigation");
  await expect(status).toContainText("Candidate");

  const containment = await page.evaluate(() => {
    const panel = document
      .querySelector("#occurrence-composer")
      ?.shadowRoot?.querySelector(".completion-panel");
    const rect = panel?.getBoundingClientRect();
    const visual = window.visualViewport;
    const top = visual?.offsetTop ?? 0;
    const height = visual?.height ?? window.innerHeight;
    return {
      panelTop: rect?.top ?? Number.NaN,
      panelBottom: rect?.bottom ?? Number.NaN,
      visualTop: top,
      visualBottom: top + height,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    };
  });
  expect(containment.panelTop).toBeGreaterThanOrEqual(containment.visualTop - 2);
  expect(containment.panelBottom).toBeLessThanOrEqual(containment.visualBottom + 2);
  expect(containment.scrollWidth).toBeLessThanOrEqual(containment.innerWidth + 2);
  expect(containment.scrollHeight).toBeLessThanOrEqual(containment.innerHeight + 2);

  const activeBefore = await composer.locator('.candidate-row[data-active="true"]').getAttribute("aria-label");
  await input.press("ArrowDown");
  const activeAfter = await composer.locator('.candidate-row[data-active="true"]').getAttribute("aria-label");
  expect(activeAfter).not.toBe(activeBefore);
  await expect(status).toContainText("Candidate");
  await expect(status).not.toContainText(/Candidate \\d+ of \\d+/);
  await expect(input).toHaveValue("man? calls @alice");
});


test("IME composition cannot accept or commit investigative text before compositionend", async ({
  page,
}) => {
  const composer = page.locator("#occurrence-composer");
  await composer.locator(".compact").click();
  const input = composer.locator('input[role="combobox"]');

  await input.evaluate((element: HTMLInputElement) => {
    element.dispatchEvent(new CompositionEvent("compositionstart", {
      bubbles: true,
      data: "man?",
    }));
    element.value = "man? calls @alice";
    element.setSelectionRange(element.value.length, element.value.length);
    element.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      data: "?",
      inputType: "insertCompositionText",
    }));
  });

  await input.press("Enter");
  await expect(input).toHaveValue("man? calls @alice");
  await expect(composer.locator("#occurrence-investigation-panel")).toHaveCount(0);

  await input.evaluate((element: HTMLInputElement) => {
    element.dispatchEvent(new CompositionEvent("compositionend", {
      bubbles: true,
      data: "man?",
    }));
  });
  await expect(composer.locator("#occurrence-investigation-panel")).toBeVisible();
  await expect(input).toHaveValue("man? calls @alice");
  await expect(composer.locator('input[role="combobox"]')).toHaveCount(1);
});


test("same-occurrence media and context refresh preserve a dirty investigative draft", async ({
  page,
}) => {
  const composer = page.locator("#occurrence-composer");
  await composer.locator(".compact").click();
  const input = composer.locator('input[role="combobox"]');

  await composer.evaluate((element) => {
    const api = element as HTMLElement & {
      setSelectionContext(context: unknown): void;
    };
    api.setSelectionContext({
      selectedOccurrenceId: "occ-context-refresh",
      composition: "@alice calls @bob",
      title: "Initial context",
      description: "Initial description",
      media: [{
        src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
        alt: "Initial evidence",
        caption: "Initial caption",
      }],
      relationship: { subjectId: "alice", objectId: "bob" },
    });
  });
  await input.fill("man? calls @alice");
  await expect(composer.locator("#occurrence-investigation-panel")).toBeVisible();

  await composer.evaluate((element) => {
    const api = element as HTMLElement & {
      setSelectionContext(context: unknown): void;
    };
    api.setSelectionContext({
      selectedOccurrenceId: "occ-context-refresh",
      composition: "@alice calls @bob",
      title: "Updated context",
      description: "Updated description",
      media: [
        {
          src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
          alt: "Updated evidence A",
          caption: "Updated caption A",
        },
        {
          src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
          alt: "Updated evidence B",
          caption: "Updated caption B",
        },
      ],
      relationship: { subjectId: "alice", objectId: "bob" },
    });
  });

  await expect(input).toHaveValue("man? calls @alice");
  await expect(composer.locator("#occurrence-investigation-panel")).toBeVisible();
  await expect(composer.locator(".composer-card-heading")).toContainText("Updated context");
  const deck = composer.locator("luum-occurrence-deck.composer-context-deck");
  await expect(deck).toHaveAttribute("data-frame-count", "2");
  const mediaImage = deck.locator(".timeline-focus-hero-image");
  await expect(mediaImage).toHaveAttribute("alt", "Updated evidence A");
  await expect
    .poll(() => mediaImage.evaluate((element) => getComputedStyle(element).objectFit))
    .toBe("contain");
  const zoomIn = deck.getByRole("button", { name: "Zoom image in" });
  const zoomOut = deck.getByRole("button", { name: "Zoom image out" });
  await expect(zoomIn).toBeVisible();
  await expect(zoomOut).toBeEnabled();
  await expect(deck.locator(".timeline-occurrence-deck-zoom-level")).toHaveText("100%");
  await zoomOut.click();
  await expect(deck.locator(".timeline-occurrence-deck-zoom-level")).toHaveText("75%");
  await zoomOut.click();
  await expect(deck.locator(".timeline-occurrence-deck-zoom-level")).toHaveText("50%");
  await expect(zoomOut).toBeDisabled();
  await expect(mediaImage).toHaveAttribute("style", /--occurrence-image-zoom:\s*0\.5/);
  await zoomIn.click();
  await expect(deck.locator(".timeline-occurrence-deck-zoom-level")).toHaveText("75%");
  await zoomIn.click();
  await expect(deck.locator(".timeline-occurrence-deck-zoom-level")).toHaveText("100%");
  await zoomIn.click();
  await expect(deck.locator(".timeline-occurrence-deck-zoom-level")).toHaveText("125%");
  await expect(zoomOut).toBeEnabled();
  await expect(mediaImage).toHaveAttribute("style", /--occurrence-image-zoom:\s*1\.25/);

  const imageViewport = deck.locator(".timeline-occurrence-deck-image-viewport");
  await expect(imageViewport).toBeVisible();
  await expect(imageViewport).toHaveAttribute("tabindex", "0");

  await imageViewport.evaluate((viewport) => {
    const emit = (type: string, init: PointerEventInit) =>
      viewport.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, ...init }));
    emit("pointerdown", { pointerId: 11, pointerType: "mouse", button: 0, clientX: 120, clientY: 90 });
    emit("pointermove", { pointerId: 11, pointerType: "mouse", button: 0, clientX: 154, clientY: 112 });
    emit("pointerup", { pointerId: 11, pointerType: "mouse", button: 0, clientX: 154, clientY: 112 });
  });
  await expect
    .poll(() =>
      mediaImage.evaluate((element) => ({
        x: element.style.getPropertyValue("--occurrence-image-pan-x"),
        y: element.style.getPropertyValue("--occurrence-image-pan-y"),
      })),
    )
    .not.toEqual({ x: "0px", y: "0px" });

  await imageViewport.evaluate((viewport) => {
    viewport.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: -120,
        clientX: 150,
        clientY: 100,
      }),
    );
  });
  await expect
    .poll(() =>
      mediaImage.evaluate((element) =>
        Number(element.style.getPropertyValue("--occurrence-image-zoom") || "1"),
      ),
    )
    .toBeGreaterThan(1.25);

  await imageViewport.focus();
  await imageViewport.press("0");
  await expect(mediaImage).toHaveAttribute("style", /--occurrence-image-zoom:\s*1(?:;|$)/);
  await imageViewport.press("-");
  await expect(deck.locator(".timeline-occurrence-deck-zoom-level")).toHaveText("75%");
  await imageViewport.press("-");
  await expect(deck.locator(".timeline-occurrence-deck-zoom-level")).toHaveText("50%");
  await imageViewport.press("0");
  await expect(deck.locator(".timeline-occurrence-deck-zoom-level")).toHaveText("100%");

  await imageViewport.evaluate((viewport) => {
    const emit = (type: string, init: PointerEventInit) =>
      viewport.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, ...init }));
    emit("pointerdown", { pointerId: 21, pointerType: "touch", clientX: 100, clientY: 100 });
    emit("pointerdown", { pointerId: 22, pointerType: "touch", clientX: 200, clientY: 100 });
    emit("pointermove", { pointerId: 22, pointerType: "touch", clientX: 260, clientY: 100 });
    emit("pointerup", { pointerId: 22, pointerType: "touch", clientX: 260, clientY: 100 });
    emit("pointerup", { pointerId: 21, pointerType: "touch", clientX: 100, clientY: 100 });
  });
  await expect
    .poll(() =>
      mediaImage.evaluate((element) =>
        Number(element.style.getPropertyValue("--occurrence-image-zoom") || "1"),
      ),
    )
    .toBeGreaterThan(1);
  await imageViewport.press("0");

  await imageViewport.evaluate((viewport) => {
    const emit = (type: string, x: number) =>
      viewport.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 31,
          pointerType: "touch",
          clientX: x,
          clientY: 100,
        }),
      );
    emit("pointerdown", 190);
    emit("pointermove", 90);
    emit("pointerup", 90);
  });
  await expect(deck.locator(".timeline-focus-hero-image")).toHaveAttribute("alt", "Updated evidence B");
  await deck.getByRole("button", { name: "Previous frame" }).click();
  await expect(deck.locator(".timeline-focus-hero-image")).toHaveAttribute("alt", "Updated evidence A");

  const context = composer.locator(".composer-card-context");
  await expect(context).toContainText("Updated description");
  const layout = await composer.locator(".composer-card-details").evaluate((details) => {
    const media = details.querySelector(".composer-card-media")?.getBoundingClientRect();
    const contextPane = details.querySelector(".composer-card-context")?.getBoundingClientRect();
    return {
      width: window.innerWidth,
      media: media ? { x: media.x, y: media.y, right: media.right, bottom: media.bottom } : null,
      context: contextPane
        ? { x: contextPane.x, y: contextPane.y, right: contextPane.right, bottom: contextPane.bottom }
        : null,
    };
  });
  expect(layout.media).not.toBeNull();
  expect(layout.context).not.toBeNull();
  if (layout.width >= 721) {
    expect(layout.context!.x).toBeGreaterThanOrEqual(layout.media!.right - 2);
    expect(Math.abs(layout.context!.y - layout.media!.y)).toBeLessThanOrEqual(2);
  } else {
    expect(layout.context!.y).toBeGreaterThanOrEqual(layout.media!.bottom - 2);
  }
  await deck.getByRole("button", { name: "Next frame" }).click();
  await expect(deck.locator(".timeline-focus-hero-image")).toHaveAttribute("alt", "Updated evidence B");
  await deck.getByRole("button", { name: "Next frame" }).click();
  await expect(deck.locator(".timeline-focus-hero-image")).toHaveAttribute("alt", "Updated evidence A");
  await expect(context).toContainText("Updated description");
});


test("different occurrence selection cannot overwrite a dirty investigative draft", async ({ page }) => {
  const composer = page.locator("#occurrence-composer");
  await composer.locator(".compact").click();
  const input = composer.locator('input[role="combobox"]');

  await composer.evaluate((element) => {
    const api = element as HTMLElement & { setSelectionContext(context: unknown): void };
    api.setSelectionContext({
      selectedOccurrenceId: "occ-a",
      composition: "@alice calls @bob",
      title: "Occurrence A",
      relationship: { subjectId: "alice", objectId: "bob" },
    });
  });
  await input.fill("man? calls @alice");
  await expect(composer.locator("#occurrence-investigation-panel")).toBeVisible();

  await composer.evaluate((element) => {
    const api = element as HTMLElement & { setSelectionContext(context: unknown): void };
    api.setSelectionContext({
      selectedOccurrenceId: "occ-b",
      composition: "@bob meets @alice",
      title: "Occurrence B",
      relationship: { subjectId: "bob", objectId: "alice" },
    });
  });

  await expect(input).toHaveValue("man? calls @alice");
  await expect(composer.locator("#occurrence-investigation-panel")).toBeVisible();
  const pending = composer.locator('[data-context-kind="pending-selection"]');
  await expect(pending).toBeVisible();
  await expect(pending).toHaveClass(/composer-chip/);
  await expect(pending).toContainText("Use selected context");

  await pending.click();
  await expect(input).toHaveValue("@bob meets @alice");
  await expect(composer.locator("#occurrence-investigation-panel")).toHaveCount(0);
  await expect(composer.locator(".composer-card-heading")).toContainText("Occurrence B");
});
