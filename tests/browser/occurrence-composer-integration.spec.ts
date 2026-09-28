import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#occurrence-composer .compact")).toBeVisible();
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
  await expect(page.locator(".timeline-event-detail:visible")).toHaveCount(0);
});

test("one composer card previews incomplete icons and chips select exact grammar spans", async ({
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
  await iconOption.hover();
  const after = await composer
    .locator(".composer-world-preview .preview-node img")
    .first()
    .getAttribute("src");
  expect(after).not.toBe(before);
  expect(decodeURIComponent(after ?? "")).toContain("<svg");
  await input.fill("@alice meets @bob [category: Dec");
  const categoryOption = composer.locator(".option").filter({ hasText: "Decision / Choice" }).first();
  await categoryOption.hover();
  await expect(composer.locator(".composer-world-preview")).toHaveAttribute(
    "style", /--preview-accent:\s*#[0-9a-f]{3,8}/i,
  );
  await input.fill("@alice meets @bob at Stockholm");
  const place = composer.locator('.grammar-chip[aria-label^="Edit place:"]');
  await place.click();
  await expect
    .poll(() =>
      input.evaluate((element: HTMLInputElement) =>
        element.value.slice(element.selectionStart ?? 0, element.selectionEnd ?? 0),
      ),
    )
    .toBe("Stockholm");
  await expect(composer.locator('input[role="combobox"]')).toHaveCount(1);
  await input.fill("@alice meets @bob [category: Family, tags: important]");
  await composer.getByRole("button", { name: "Edit tag: important" }).last().click();
  await expect.poll(() => input.evaluate((element: HTMLInputElement) =>
    element.value.slice(element.selectionStart ?? 0, element.selectionEnd ?? 0),
  )).toBe("important");
});

test("unresolved clue remains editable and cannot be approved as a fact", async ({ page }) => {
  const composer = page.locator("#occurrence-composer");
  await composer.locator(".compact").click();
  const input = composer.locator('input[role="combobox"]');
  await input.fill("man? calls @alice");
  const clue = composer.locator(".qualifier-chip");
  await expect(clue).toHaveCount(1);
  await clue.click();
  await expect
    .poll(() =>
      input.evaluate((element: HTMLInputElement) =>
        element.value.slice(element.selectionStart ?? 0, element.selectionEnd ?? 0),
      ),
    )
    .toBe("man?");
  await composer.getByRole("button", { name: "Approve occurrence" }).click();
  await expect(composer.locator(".diagnostic")).toContainText("Resolve or persist");
  await expect(input).toHaveValue("man? calls @alice");
  await expect(composer.getByRole("button", { name: "Ask this question" })).toBeVisible();
  await expect(composer.getByRole("table", { name: "Candidate comparison" })).toBeVisible();
  await expect(composer.locator(".candidate-row")).not.toHaveCount(0);
  await expect(composer.getByRole("button", { name: "Compare candidates" })).toBeVisible();
  await expect(composer.locator(".option")).toHaveCount(0);
  await expect(composer.locator('.candidate-row[data-active="true"]')).toHaveCount(1);
  const firstCandidate = await composer.locator('.candidate-row[data-active="true"]').textContent();
  await input.press("ArrowDown");
  const secondCandidate = await composer.locator('.candidate-row[data-active="true"]').textContent();
  expect(secondCandidate).not.toBe(firstCandidate);
  await input.press("End");
  await expect(composer.locator('.candidate-row[data-active="true"]')).toContainText(
    "None of the currently known candidates",
  );
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

  const clues = composer.locator(".qualifier-chip");
  await expect(clues).toHaveCount(3);
  for (const expected of ["man?", '"red jacket"?', '"Central Station"?']) {
    const clue = clues.filter({ hasText: expected });
    await clue.click();
    await expect
      .poll(() =>
        input.evaluate((element: HTMLInputElement) =>
          element.value.slice(element.selectionStart ?? 0, element.selectionEnd ?? 0),
        ),
      )
      .toBe(expected);
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
  await expect(deck).toHaveAttribute("data-frame-count", "3");
  await expect(deck.locator(".timeline-focus-hero-image")).toHaveAttribute("alt", "Updated evidence A");
  await deck.getByRole("button", { name: "Next frame" }).click();
  await expect(deck.locator(".timeline-focus-hero-image")).toHaveAttribute("alt", "Updated evidence B");
  await deck.getByRole("button", { name: "Next frame" }).click();
  await expect(deck.locator(".timeline-occurrence-deck-context-body")).toHaveText("Updated description");
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
  await expect(pending).toContainText("Use selected context");

  await pending.click();
  await expect(input).toHaveValue("@bob meets @alice");
  await expect(composer.locator("#occurrence-investigation-panel")).toHaveCount(0);
  await expect(composer.locator(".composer-card-heading")).toContainText("Occurrence B");
});
