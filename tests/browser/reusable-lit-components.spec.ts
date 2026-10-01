import { expect, test } from "@playwright/test";

test("composer supports filtered keyboard and multi-select interaction", async ({ page }) => {
  await page.goto("/component-lab.html");

  const composer = page.locator("component-lab-composer");
  const input = composer.getByRole("combobox");
  await input.fill("Ada");

  const option = composer.getByRole("option", { name: /Ada Lovelace/ });
  await expect(option).toBeVisible();
  await input.press("Space");

  await expect(composer.locator('[part="chip"]')).toContainText("Ada Lovelace");
  await expect(page.locator("[data-composer-output]")).toContainText("Ada Lovelace");
});

test("composer keeps active suggestion visible during navigation", async ({ page }) => {
  await page.goto("/component-lab.html");

  const input = page.locator("component-lab-composer").getByRole("combobox");
  await input.focus();
  await input.press("ArrowDown");
  await input.press("ArrowDown");

  const active = page.locator('component-lab-composer [part="option"][data-active="true"]');
  await expect(active).toBeVisible();
  await expect(active).toBeInViewport();
});

test("multiple composer instances own unique ARIA relationships", async ({ page }) => {
  await page.goto("/component-lab.html");

  await page.evaluate(() => {
    const first = document.querySelector("component-lab-composer");
    if (!first) throw new Error("missing composer");
    const second = document.createElement("component-lab-composer") as typeof first;
    (second as any).suggestions = (first as any).suggestions;
    first.parentElement?.append(second);
  });

  const composers = page.locator("component-lab-composer");
  await expect(composers).toHaveCount(2);

  const firstInput = composers.nth(0).getByRole("combobox");
  const secondInput = composers.nth(1).getByRole("combobox");
  const firstControls = await firstInput.getAttribute("aria-controls");
  const secondControls = await secondInput.getAttribute("aria-controls");

  expect(firstControls).toBeTruthy();
  expect(secondControls).toBeTruthy();
  expect(firstControls).not.toBe(secondControls);
  await expect(composers.nth(0).locator(`#${firstControls}`)).toHaveCount(1);
  await expect(composers.nth(1).locator(`#${secondControls}`)).toHaveCount(1);
});

test("IME composition never selects or commits intermediate text", async ({ page }) => {
  await page.goto("/component-lab.html");

  const composer = page.locator("component-lab-composer");
  const input = composer.getByRole("combobox");
  await input.focus();

  const result = await input.evaluate((element) => {
    let selections = 0;
    let commits = 0;
    element.closest("component-lab-composer")?.addEventListener("composer-selection-change", () => { selections += 1; });
    element.closest("component-lab-composer")?.addEventListener("composer-commit", () => { commits += 1; });

    element.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      composed: true,
      isComposing: true,
    }));
    element.dispatchEvent(new KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      composed: true,
      isComposing: true,
    }));

    return { selections, commits };
  });

  expect(result).toEqual({ selections: 0, commits: 0 });
});

test("keyboard navigation skips disabled suggestions and supports boundaries", async ({ page }) => {
  await page.goto("/component-lab.html");

  const composer = page.locator("component-lab-composer");
  await composer.evaluate((element: any) => {
    element.suggestions = [
      { id: "first", label: "First" },
      { id: "disabled", label: "Unavailable", disabled: true },
      { id: "last", label: "Last" },
    ];
    element.value = "";
  });

  const input = composer.getByRole("combobox");
  await input.focus();
  await input.press("ArrowDown");
  await expect(composer.locator('[part="option"][data-active="true"]')).toContainText("Last");

  await input.press("Home");
  await expect(composer.locator('[part="option"][data-active="true"]')).toContainText("First");

  await input.press("End");
  await expect(composer.locator('[part="option"][data-active="true"]')).toContainText("Last");
});

test("retained timeline controller populates the host without Lit scene reconciliation", async ({ page }) => {
  await page.goto("/component-lab.html");

  const timeline = page.locator("component-lab-timeline");
  await expect(timeline.locator(".demo-timeline-rail")).toBeVisible();
  await expect(timeline.getByRole("button")).toHaveCount(3);
});

test("retained timeline destroys and recreates its controller across disconnects", async ({ page }) => {
  await page.goto("/component-lab.html");

  const timeline = page.locator("component-lab-timeline");
  await expect(timeline.locator(".demo-timeline-rail")).toBeVisible();
  const firstGeneration = await timeline.getAttribute("data-controller-generation");
  expect(firstGeneration).toBeTruthy();

  await timeline.evaluate((element) => {
    const parent = element.parentElement;
    if (!parent) throw new Error("timeline has no parent");
    element.remove();
    (window as any).__detachedTimeline = element;
    (window as any).__timelineParent = parent;
  });

  await expect.poll(async () =>
    page.evaluate(() => (window as any).__detachedTimeline?.dataset.controllerDestroyed),
  ).toBe("true");

  await page.evaluate(() => {
    (window as any).__timelineParent.append((window as any).__detachedTimeline);
  });

  await expect(timeline.locator(".demo-timeline-rail")).toBeVisible();
  await expect(timeline.getByRole("button")).toHaveCount(3);
  await expect.poll(() => timeline.getAttribute("data-controller-generation")).not.toBe(firstGeneration);
  await expect(timeline.locator(".demo-timeline-rail")).toHaveCount(1);
});

test("semantic hue keeps range and number values synchronized", async ({ page }) => {
  await page.goto("/component-lab.html");
  const hue = page.locator("component-lab-hue");
  const number = hue.locator('input[type="number"]');
  const range = hue.locator('input[type="range"]');
  await number.fill("275");
  await expect(range).toHaveValue("275");
  await expect(hue.locator("output")).toHaveText("275°");
});

test("media viewer supports keyboard zoom and reset", async ({ page }) => {
  await page.goto("/component-lab.html");
  const viewer = page.locator("component-lab-media-viewer");
  const viewport = viewer.locator('[part="viewport"]');
  await viewport.focus();
  await viewport.press("+");
  await expect(viewer.locator('[part="zoom-level"]')).not.toHaveText("100%");
  await viewport.press("0");
  await expect(viewer.locator('[part="zoom-level"]')).toHaveText("100%");
});

test("occurrence media deck uses native non-autoplay audio and video controls", async ({ page }) => {
  await page.goto("/component-lab.html");

  await page.evaluate(() => {
    const deck = document.createElement("luum-occurrence-deck") as HTMLElement & {
      setDeck(input: unknown): void;
    };
    deck.id = "native-media-deck";
    // The contract is the native control surface, not codec decoding. Keep the
    // intentionally empty data URLs from racing the component's error fallback.
    deck.addEventListener("error", (event) => event.stopImmediatePropagation(), true);
    document.body.append(deck);
    deck.setDeck({
      occurrenceId: "occ-media",
      frames: [
        { kind: "video", src: "data:video/mp4;base64,", alt: "Video evidence" },
        {
          kind: "audio",
          blob: new Blob([], { type: "audio/mpeg" }),
          mimeType: "audio/mpeg",
          sha256: "a".repeat(64),
          alt: "Audio evidence",
        },
      ],
    });
  });

  const deck = page.locator("#native-media-deck");
  const video = deck.locator("video");
  await expect(video).toHaveCount(1);
  const videoState = await video.evaluate((element) => {
    const media = element as HTMLVideoElement;
    return {
      controls: media.controls,
      autoplay: media.autoplay,
      playsInline: media.playsInline,
      preload: media.preload,
    };
  });
  expect(videoState).toEqual({
    controls: true,
    autoplay: false,
    playsInline: true,
    preload: "metadata",
  });

  await deck.getByRole("button", { name: "Next frame" }).click();
  const audio = deck.locator("audio");
  await expect(audio).toHaveCount(1);
  const audioState = await audio.evaluate((element) => {
    const media = element as HTMLAudioElement;
    return {
      controls: media.controls,
      autoplay: media.autoplay,
      preload: media.preload,
    };
  });
  expect(audioState).toEqual({
    controls: true,
    autoplay: false,
    preload: "metadata",
  });
  const audioSource = await audio.getAttribute("src");
  expect(audioSource).toMatch(/^blob:/);

  await deck.evaluate((element) => element.remove());
  const revoked = await page.evaluate(async (source) => {
    if (!source) return false;
    try {
      await fetch(source);
      return false;
    } catch {
      return true;
    }
  }, audioSource);
  expect(revoked).toBe(true);
});
