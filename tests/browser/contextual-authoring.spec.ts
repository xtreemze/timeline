import { expect, type Locator, type Page, test } from "@playwright/test";
import { WORLD_TOUCH_HOLD_MS } from "../../src/interaction/world-touch-hold.ts";
import { touchscreen } from "../support/touch-gestures.ts";

type FractionPoint = { readonly x: number; readonly y: number };

/** Loose shapes of agent-API project JSON read inside page.evaluate (type-only, erased). */
interface ProjectRecord {
  id?: unknown;
  kind?: unknown;
  title?: unknown;
  start?: unknown;
  predicate?: unknown;
  confidence?: unknown;
  itemIds?: unknown[];
  time?: { start?: { value?: unknown }; end?: { value?: unknown } } | null;
  attributes?: { semanticReview?: unknown };
}

interface ProjectSnapshot {
  items?: ProjectRecord[];
  relationships?: ProjectRecord[];
  stories?: ProjectRecord[];
}

async function certifyWebGlWorld(page: Page): Promise<boolean> {
  await page.goto("/");
  const webgl2 = await page.evaluate(() => {
    try {
      return Boolean(document.createElement("canvas").getContext("webgl2"));
    } catch {
      return false;
    }
  });
  if (webgl2) {
    await expect(page.locator(".temporal-graph-canvas canvas").first()).toBeVisible();
  }
  return webgl2;
}

async function canvasPoint(page: Page, fraction: FractionPoint) {
  const box = await page.locator(".temporal-graph-canvas canvas").first().boundingBox();
  if (!box) throw new Error("World canvas has no live bounds.");
  return {
    x: box.x + box.width * fraction.x,
    y: box.y + box.height * fraction.y,
  };
}

async function installContextRecorder(page: Page): Promise<void> {
  await page.evaluate(() => {
    const world = document.querySelector(".temporal-graph-canvas");
    if (!world) throw new Error("World surface root is missing.");
    (
      globalThis as typeof globalThis & {
        __contextAuthoringRequests?: unknown[];
      }
    ).__contextAuthoringRequests = [];
    world.addEventListener("worldcontextrequest", (event) => {
      const request = event as CustomEvent<{
        source?: string;
        position?: { longitude?: number; latitude?: number; altitudeMeters?: number };
      }>;
      (
        globalThis as typeof globalThis & {
          __contextAuthoringRequests?: unknown[];
        }
      ).__contextAuthoringRequests?.push({
        source: request.detail?.source ?? null,
        position: request.detail?.position
          ? {
              longitude: Number(request.detail.position.longitude),
              latitude: Number(request.detail.position.latitude),
              altitudeMeters: Number(request.detail.position.altitudeMeters ?? 0),
            }
          : null,
      });
    });
  });
}

async function contextRequests(page: Page) {
  return page.evaluate(
    () =>
      (
        globalThis as typeof globalThis & {
          __contextAuthoringRequests?: Array<{
            source: string | null;
            position: {
              longitude: number;
              latitude: number;
              altitudeMeters: number;
            } | null;
          }>;
        }
      ).__contextAuthoringRequests ?? [],
  );
}

async function closeComposer(page: Page): Promise<void> {
  const composer = page.locator("#occurrence-composer");
  if ((await composer.getAttribute("active")) === null) return;
  await composer.locator("input").press("Escape");
  await expect(composer).not.toHaveAttribute("active", "");
}

async function discoverEmptyWorldPoint(page: Page): Promise<FractionPoint> {
  const composer = page.locator("#occurrence-composer");
  const candidates: readonly FractionPoint[] = [
    { x: 0.12, y: 0.18 },
    { x: 0.88, y: 0.18 },
    { x: 0.12, y: 0.82 },
    { x: 0.88, y: 0.82 },
    { x: 0.5, y: 0.16 },
    { x: 0.5, y: 0.84 },
    { x: 0.22, y: 0.5 },
    { x: 0.78, y: 0.5 },
    { x: 0.5, y: 0.5 },
  ];

  for (const candidate of candidates) {
    const point = await canvasPoint(page, candidate);
    await page.mouse.click(point.x, point.y, { button: "right" });
    if ((await composer.getAttribute("active")) !== null) return candidate;
  }
  throw new Error("Could not find empty WorldSurface space through real context-menu input.");
}

interface RelationshipFocus {
  readonly focusId: string;
  readonly relationshipId: string;
  readonly subjectId: string;
  readonly objectId: string;
  readonly predicate: string;
}

async function relationshipFocuses(page: Page): Promise<RelationshipFocus[]> {
  await expect.poll(() => page.locator(".timeline-semantic-occurrence").count()).toBeGreaterThan(0);
  return page.evaluate(() => {
    const agentAPI = (
      window as typeof window & {
        TimelineAgentAPI?: {
          getProject?: () => {
            relationships?: Array<{
              id?: unknown;
              subjectId?: unknown;
              objectId?: unknown;
              predicate?: unknown;
              itemIds?: unknown[];
            }>;
          };
        };
      }
    ).TimelineAgentAPI;
    const relationships = agentAPI?.getProject?.()?.relationships ?? [];
    const focusIds = new Set(
      [...document.querySelectorAll<HTMLElement>(".timeline-semantic-occurrence")]
        .map((button) => button.dataset.id ?? "")
        .filter(Boolean),
    );

    const itemOwnerCounts = new Map<string, number>();
    for (const relationship of relationships) {
      for (const itemId of relationship.itemIds ?? []) {
        const id = String(itemId);
        itemOwnerCounts.set(id, (itemOwnerCounts.get(id) ?? 0) + 1);
      }
    }

    return relationships
      .map((relationship) => {
        const relationshipId = String(relationship.id ?? "");
        const exactRelationshipFocus = focusIds.has(relationshipId) ? relationshipId : "";
        const uniqueItemFocus =
          (relationship.itemIds ?? [])
            .map((itemId) => String(itemId))
            .find((itemId) => focusIds.has(itemId) && itemOwnerCounts.get(itemId) === 1) ?? "";
        const focusId = exactRelationshipFocus || uniqueItemFocus;
        return {
          focusId,
          relationshipId,
          subjectId: String(relationship.subjectId ?? ""),
          objectId: String(relationship.objectId ?? ""),
          predicate: String(relationship.predicate ?? ""),
        };
      })
      .filter(
        (relationship) =>
          relationship.focusId &&
          relationship.relationshipId &&
          relationship.subjectId &&
          relationship.objectId &&
          relationship.predicate,
      );
  });
}

async function focusRelationship(page: Page, relationship: RelationshipFocus): Promise<void> {
  const semantic = page.locator(`.timeline-semantic-occurrence[data-id="${relationship.focusId}"]`);
  await semantic.evaluate((button: HTMLButtonElement) => button.click());
  await expect(semantic).toHaveAttribute("data-selected", "");
}

async function openPersistentComposer(page: Page): Promise<Locator> {
  const composer = page.locator("#occurrence-composer");
  if ((await composer.getAttribute("active")) === null) {
    await composer.locator("button.compact").click();
  }
  await expect(composer).toHaveAttribute("active", "");
  await expect(composer.locator("input")).toBeFocused();
  return composer;
}

async function assertComposerInsideFooter(page: Page): Promise<void> {
  const composer = page.locator("#occurrence-composer");
  const input = composer.locator("input");
  const footer = page.locator(".app-tool-dock.app-footer-bar");
  await expect(composer).toHaveAttribute("active", "");
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();

  const [footerBox, inputBox] = await Promise.all([footer.boundingBox(), input.boundingBox()]);
  if (!footerBox || !inputBox) {
    throw new Error("Contextual composer footer geometry is unavailable.");
  }
  expect(inputBox.x).toBeGreaterThanOrEqual(footerBox.x - 1);
  expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(footerBox.x + footerBox.width + 1);
  expect(inputBox.y).toBeGreaterThanOrEqual(footerBox.y - 1);
  expect(inputBox.y + inputBox.height).toBeLessThanOrEqual(footerBox.y + footerBox.height + 1);

  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Browser project has no viewport.");
  const documentSize = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));
  expect(documentSize.width).toBeLessThanOrEqual(viewport.width + 2);
  expect(documentSize.height).toBeLessThanOrEqual(viewport.height + 2);
}

async function selectEntityWithTimelineContext(page: Page): Promise<string> {
  const outline = page.getByRole("navigation", { name: "World objects" });
  const entities = outline
    .locator("h2", { hasText: "Entities" })
    .locator("xpath=following-sibling::ul[1]//button");
  await expect.poll(() => entities.count()).toBeGreaterThan(0);

  for (let index = 0; index < (await entities.count()); index += 1) {
    const button = entities.nth(index);
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-pressed", "true");

    const selectedChronology = page.locator(
      '.timeline-semantic-occurrence[data-selected][aria-label^="Selected:"]',
    );
    if ((await selectedChronology.count()) === 0) continue;

    const id = await page.locator('.temporal-graph-canvas [role="status"]').evaluate((status) => {
      const match = status.textContent?.match(/Selected entity ([^\s(]+)/);
      return match?.[1] ?? "";
    });
    if (id) return id;
  }

  throw new Error("No accessible World entity projected to selected chronology context.");
}

/** Rewrite the focused occurrence's action in the sentence input; returns the new action. */
async function rewriteFocusedPredicate(
  composer: Locator,
  relationship: RelationshipFocus,
): Promise<string> {
  const input = composer.locator("input");
  const initial = await input.inputValue();
  const replacement = relationship.predicate === "reframes" ? "recounts" : "reframes";
  const edited = initial.replace(
    `@${relationship.subjectId} ${relationship.predicate} @${relationship.objectId}`,
    `@${relationship.subjectId} ${replacement} @${relationship.objectId}`,
  );
  expect(edited).not.toBe(initial);
  await input.fill(edited);
  await expect(input).toHaveValue(edited);
  return replacement;
}

async function relationshipPredicate(page: Page, relationshipId: string): Promise<string> {
  return page.evaluate((id) => {
    const project = (
      window as typeof window & {
        TimelineAgentAPI?: {
          getProject?: () => { relationships?: Array<{ id?: unknown; predicate?: unknown }> };
        };
      }
    ).TimelineAgentAPI?.getProject?.();
    const match = (project?.relationships ?? []).find((candidate) => String(candidate.id) === id);
    return String(match?.predicate ?? "");
  }, relationshipId);
}

/** Double-click the inline decoration token for a sentence section, as a mouse user would. */
async function selectSentenceSection(
  page: Page,
  composer: Locator,
  kind: string,
  index = 0,
): Promise<void> {
  const token = composer.locator(`.input-token[data-kind="${kind}"]`).nth(index);
  // Long sentences scroll horizontally inside the one-line input; bring the token into view.
  await token.evaluate((element: HTMLElement) => {
    const input = element.closest(".input-shell")?.querySelector("input");
    if (!input) throw new Error("Composer input is missing beside its decoration.");
    input.scrollLeft = Math.max(0, element.offsetLeft - 24);
    input.dispatchEvent(new Event("scroll"));
  });
  await expect(token).toBeVisible();
  const box = await token.boundingBox();
  if (!box) throw new Error(`Inline ${kind} token has no live bounds.`);
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe("contextual world authoring certification", () => {
  test("real empty-world context menu opens the footer composer at a world coordinate", async ({
    page,
  }) => {
    test.skip(!(await certifyWebGlWorld(page)), "WebGL2 unavailable; WorldSurface is not active.");
    await installContextRecorder(page);

    await discoverEmptyWorldPoint(page);
    await assertComposerInsideFooter(page);

    const request = (await contextRequests(page)).at(-1);
    expect(request?.position).not.toBeNull();
    expect(Number.isFinite(request?.position?.longitude)).toBe(true);
    expect(Number.isFinite(request?.position?.latitude)).toBe(true);
  });

  test("stationary empty-world long press opens authoring while quick movement does not", async ({
    page,
  }, testInfo) => {
    test.skip(!testInfo.project.use.hasTouch, "Requires a touch-enabled browser project.");
    test.skip(!(await certifyWebGlWorld(page)), "WebGL2 unavailable; WorldSurface is not active.");

    const empty = await discoverEmptyWorldPoint(page);
    await closeComposer(page);

    const start = await canvasPoint(page, empty);
    const swipeFinger = await touchscreen(page);
    await swipeFinger.move([start]);
    const inwardDx = empty.x > 0.5 ? -54 : 54;
    await swipeFinger.move([{ x: start.x + inwardDx, y: start.y }]);
    await page.waitForTimeout(WORLD_TOUCH_HOLD_MS + 120);
    await expect(page.locator("#occurrence-composer")).not.toHaveAttribute("active", "");
    await swipeFinger.end();

    const settled = await canvasPoint(page, empty);
    const holdFinger = await touchscreen(page);
    await holdFinger.move([settled]);
    await expect
      .poll(() => page.locator("#occurrence-composer").getAttribute("active"), {
        timeout: WORLD_TOUCH_HOLD_MS + 1_500,
      })
      .not.toBeNull();
    await holdFinger.end();

    await assertComposerInsideFooter(page);
  });

  test("Shift+F10 launches contextual authoring from the keyboard on the current world", async ({
    page,
  }) => {
    test.skip(!(await certifyWebGlWorld(page)), "WebGL2 unavailable; WorldSurface is not active.");
    await installContextRecorder(page);

    const world = page.locator(".temporal-graph-canvas");
    await world.focus();
    await page.keyboard.press("Shift+F10");

    await assertComposerInsideFooter(page);
    const request = (await contextRequests(page)).at(-1);
    expect(request?.source).toBe("keyboard");
    expect(Number.isFinite(request?.position?.longitude)).toBe(true);
    expect(Number.isFinite(request?.position?.latitude)).toBe(true);
  });

  test("accepting an action advances the live combobox to the object stage", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    const entityIds = await page.evaluate(() => {
      const project = (
        window as typeof window & {
          TimelineAgentAPI?: {
            getProject?: () => { entities?: Array<{ id?: unknown }> };
          };
        }
      ).TimelineAgentAPI?.getProject?.();
      return (project?.entities ?? [])
        .map((entity) => String(entity.id ?? ""))
        .filter(Boolean)
        .slice(0, 2);
    });
    test.skip(entityIds.length < 2, "Example project needs at least two entities.");

    const composer = await openPersistentComposer(page);
    const input = composer.locator("input");
    const stage = composer.locator(".stage");
    const [subjectId] = entityIds;
    if (!subjectId) return test.skip(true, "Example project needs at least two entities.");

    await input.fill(`@${subjectId} rece`);
    await expect(stage).toHaveAttribute("data-stage", "predicate");
    const keyboardAction = composer
      .getByRole("option")
      .filter({ hasText: /^\s*receives\b/ })
      .first();
    await expect(keyboardAction).toBeVisible();
    await input.press("Enter");

    await expect(input).toHaveValue(`@${subjectId} receives `);
    await expect(stage).toHaveAttribute("data-stage", "object");
    await expect(composer.getByRole("option").first()).toBeVisible();

    await input.fill(`@${subjectId} rece`);
    const pointerAction = composer
      .getByRole("option")
      .filter({ hasText: /^\s*receives\b/ })
      .first();
    await expect(pointerAction).toBeVisible();
    if (testInfo.project.use.hasTouch) {
      await pointerAction.tap();
    } else {
      await pointerAction.click();
    }

    await expect(input).toHaveValue(`@${subjectId} receives `);
    await expect(stage).toHaveAttribute("data-stage", "object");
  });

  test("selected occurrence composition edits the canonical relationship in place", async ({
    page,
  }) => {
    await page.goto("/");
    const [relationship] = await relationshipFocuses(page);
    if (!relationship)
      return test.skip(true, "Example project exposes no focusable relationship occurrence.");

    await focusRelationship(page, relationship);
    const composer = await openPersistentComposer(page);
    const input = composer.locator("input");
    const initial = await input.inputValue();
    expect(initial).toContain(
      `@${relationship.subjectId} ${relationship.predicate} @${relationship.objectId}`,
    );

    const beforeCount = await page.evaluate(
      () =>
        (
          window as typeof window & {
            TimelineAgentAPI?: { getProject?: () => { relationships?: unknown[] } };
          }
        ).TimelineAgentAPI?.getProject?.()?.relationships?.length ?? 0,
    );
    const replacementPredicate = relationship.predicate === "reframes" ? "recounts" : "reframes";
    // Editing happens in the one sentence input: rewrite the action in place and commit.
    const edited = initial.replace(
      `@${relationship.subjectId} ${relationship.predicate} @${relationship.objectId}`,
      `@${relationship.subjectId} ${replacementPredicate} @${relationship.objectId}`,
    );
    expect(edited).not.toBe(initial);
    await input.fill(edited);
    await expect(input).toHaveValue(edited);
    await input.press("Enter");

    await expect
      .poll(async () =>
        page.evaluate((relationshipId) => {
          const project = (
            window as typeof window & {
              TimelineAgentAPI?: {
                getProject?: () => {
                  relationships?: Array<{ id?: unknown; predicate?: unknown }>;
                };
              };
            }
          ).TimelineAgentAPI?.getProject?.();
          const relationships = project?.relationships ?? [];
          return {
            count: relationships.length,
            predicate: String(
              relationships.find((candidate) => String(candidate.id) === relationshipId)
                ?.predicate ?? "",
            ),
          };
        }, relationship.relationshipId),
      )
      .toEqual({
        count: beforeCount,
        predicate: replacementPredicate,
      });

    const persisted = await page.evaluate((relationshipId) => {
      const relationships =
        (
          window as typeof window & {
            TimelineAgentAPI?: {
              getProject?: () => {
                relationships?: Array<{ id?: unknown; predicate?: unknown }>;
              };
            };
          }
        ).TimelineAgentAPI?.getProject?.()?.relationships ?? [];
      return relationships.filter((candidate) => String(candidate.id) === relationshipId);
    }, relationship.relationshipId);
    expect(persisted).toHaveLength(1);
    expect(String(persisted[0]?.predicate)).toBe(replacementPredicate);
    expect(await input.inputValue()).toContain(
      `@${relationship.subjectId} ${replacementPredicate} @${relationship.objectId}`,
    );
  });

  test("double-clicking an inline sentence token selects its exact span for out-of-order edits", async ({
    page,
  }, testInfo) => {
    test.skip(
      Boolean(testInfo.project.use.hasTouch),
      "Section double-click is the fine-pointer affordance; touch keeps native text selection.",
    );
    await page.goto("/");
    const composer = await openPersistentComposer(page);
    const input = composer.locator("input");
    const sentence =
      "Alice meets Bob at Stockholm on 2026-09-28 [category: Observation, tags: work|urgent]";
    await input.fill(sentence);

    const selectedText = () =>
      input.evaluate((field: HTMLInputElement) =>
        field.value.slice(field.selectionStart ?? 0, field.selectionEnd ?? 0),
      );

    await selectSentenceSection(page, composer, "predicate");
    await expect(input).toBeFocused();
    await expect.poll(selectedText).toBe("meets");

    // Replace the selected action with another offered action from the live suggestions.
    const alternative = composer
      .getByRole("option")
      .filter({ has: page.locator(".option-label").filter({ hasNotText: /^meets$/ }) })
      .first();
    await expect(alternative).toBeVisible();
    const action = ((await alternative.locator(".option-label").textContent()) ?? "").trim();
    expect(action).not.toBe("");
    await alternative.click();
    await expect(input).toHaveValue(
      `Alice ${action} Bob at Stockholm on 2026-09-28 [category: Observation, tags: work|urgent]`,
    );

    await selectSentenceSection(page, composer, "tag", 1);
    await expect.poll(selectedText).toBe("urgent");
    await page.keyboard.type("travel");
    await expect(input).toHaveValue(
      `Alice ${action} Bob at Stockholm on 2026-09-28 [category: Observation, tags: work|travel]`,
    );

    await selectSentenceSection(page, composer, "category");
    await expect.poll(selectedText).toBe("Observation");
    await page.keyboard.type("Incident");
    await expect(input).toHaveValue(
      `Alice ${action} Bob at Stockholm on 2026-09-28 [category: Incident, tags: work|travel]`,
    );

    const geometry = await composer.evaluate((host) => {
      const root = host.shadowRoot;
      const panel = root?.querySelector<HTMLElement>(".completion-panel");
      const option = root?.querySelector<HTMLElement>(".option");
      if (!panel) return null;
      const box = panel.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        optionHeight: option?.getBoundingClientRect().height ?? 44,
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
      };
    });
    const viewport = page.viewportSize();
    if (!viewport || !geometry) throw new Error("Composer responsive geometry is unavailable.");
    expect(geometry.left).toBeGreaterThanOrEqual(-1);
    expect(geometry.right).toBeLessThanOrEqual(viewport.width + 1);
    expect(geometry.top).toBeGreaterThanOrEqual(-1);
    expect(geometry.bottom).toBeLessThanOrEqual(viewport.height + 1);
    expect(geometry.optionHeight).toBeGreaterThanOrEqual(43);
    expect(geometry.documentWidth).toBeLessThanOrEqual(viewport.width + 2);
    expect(geometry.documentHeight).toBeLessThanOrEqual(viewport.height + 2);
  });

  test("strict project validation accepts shipped legacy chronology context links", async ({
    page,
  }) => {
    await page.goto("/");
    const result = await page.evaluate(() => {
      const api = (
        window as typeof window & {
          TimelineAgentAPI?: {
            validateProject?: (project: ProjectSnapshot) => {
              valid?: boolean;
              errors?: string[];
            };
          };
          TimelineSampleCase?: ProjectSnapshot;
        }
      ).TimelineAgentAPI;
      const sample = structuredClone(
        (window as typeof window & { TimelineSampleCase?: ProjectSnapshot }).TimelineSampleCase,
      );
      if (!sample || !api?.validateProject) return null;

      type TimedRecord = {
        id?: unknown;
        time?: { start?: { value?: unknown }; end?: { value?: unknown } };
      };
      const itemsById = new Map<string, TimedRecord>(
        (Array.isArray(sample.items) ? (sample.items as TimedRecord[]) : []).map((item) => [
          String(item.id),
          item,
        ]),
      );
      let divergentContextLinks = 0;
      for (const relationship of Array.isArray(sample.relationships) ? sample.relationships : []) {
        if (!relationship?.time || !Array.isArray(relationship.itemIds)) continue;
        for (const itemId of relationship.itemIds) {
          const item = itemsById.get(String(itemId));
          if (!item?.time) continue;
          const relationshipStart = relationship.time?.start?.value ?? null;
          const relationshipEnd = relationship.time?.end?.value ?? null;
          const itemStart = item.time?.start?.value ?? null;
          const itemEnd = item.time?.end?.value ?? null;
          if (relationshipStart !== itemStart || relationshipEnd !== itemEnd) {
            divergentContextLinks += 1;
          }
        }
      }

      return {
        divergentContextLinks,
        validation: api.validateProject(sample),
      };
    });
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.divergentContextLinks).toBeGreaterThan(0);
    expect(result.validation.valid, result.validation.errors?.join("\n")).toBe(true);
  });

  test("material occurrence edits surface semantic-support review and invalidate confidence", async ({
    page,
  }) => {
    await page.goto("/");
    const [relationship] = await relationshipFocuses(page);
    if (!relationship)
      return test.skip(true, "Example project exposes no focusable relationship occurrence.");

    await page.evaluate((relationshipId) => {
      const api = (
        window as typeof window & {
          TimelineAgentAPI?: {
            getProject?: () => ProjectSnapshot;
            replaceProject?: (project: ProjectSnapshot) => unknown;
          };
        }
      ).TimelineAgentAPI;
      const project = api?.getProject?.();
      if (!project || !api?.replaceProject) throw new Error("Timeline agent API is unavailable.");
      const candidate = (project.relationships ?? []).find(
        (entry: ProjectRecord) => String(entry.id) === relationshipId,
      );
      if (!candidate) throw new Error("Relationship fixture disappeared.");
      candidate.confidence = 0.91;
      api.replaceProject(project);
    }, relationship.relationshipId);

    await focusRelationship(page, relationship);
    const composer = await openPersistentComposer(page);
    const input = composer.locator("input");
    const initial = await input.inputValue();
    const replacementPredicate = relationship.predicate === "reframes" ? "recounts" : "reframes";
    const edited = initial.replace(
      `@${relationship.subjectId} ${relationship.predicate} @${relationship.objectId}`,
      `@${relationship.subjectId} ${replacementPredicate} @${relationship.objectId}`,
    );
    expect(edited).not.toBe(initial);

    await input.fill(edited);
    await input.press("Enter");

    await expect(page.locator("#status")).toContainText(
      "Review its evidence, confidence, and semantic context",
    );
    await expect
      .poll(async () =>
        page.evaluate((relationshipId) => {
          const relationship = (
            window as typeof window & {
              TimelineAgentAPI?: { getProject?: () => ProjectSnapshot };
            }
          ).TimelineAgentAPI?.getProject?.()?.relationships?.find(
            (candidate: ProjectRecord) => String(candidate.id) === relationshipId,
          );
          return {
            confidence: relationship?.confidence ?? null,
            review: relationship?.attributes?.semanticReview ?? null,
          };
        }, relationship.relationshipId),
      )
      .toEqual({
        confidence: null,
        review: {
          required: true,
          reasons: ["predicate-changed"],
        },
      });
  });

  test("editing canonical time from one timeline projection updates every linked projection", async ({
    page,
  }) => {
    await page.goto("/");

    const fixture = await page.evaluate(() => {
      const api = (
        window as typeof window & {
          TimelineAgentAPI?: {
            getProject?: () => ProjectSnapshot;
            replaceProject?: (project: ProjectSnapshot) => unknown;
          };
        }
      ).TimelineAgentAPI;
      const project = api?.getProject?.();
      if (!project || !api?.replaceProject) return null;

      const items = Array.isArray(project.items) ? project.items : [];
      const relationships = Array.isArray(project.relationships) ? project.relationships : [];
      const relationship = relationships.find((candidate: ProjectRecord) => {
        const ids = Array.isArray(candidate.itemIds) ? candidate.itemIds.map(String) : [];
        if (ids.length !== 1 || candidate.time?.end) return false;
        const item = items.find((entry: ProjectRecord) => String(entry.id) === ids[0]);
        return item?.kind === "event" && Boolean(candidate.time?.start?.value ?? item?.start);
      });
      if (!relationship) return null;

      const sourceId = String(relationship.itemIds[0]);
      const sourceItem = items.find((entry: ProjectRecord) => String(entry.id) === sourceId);
      if (!sourceItem) return null;
      const copyId = `${sourceId}-temporal-projection-test`;
      project.items = items.filter((entry: ProjectRecord) => String(entry.id) !== copyId);
      project.items.push({
        ...structuredClone(sourceItem),
        id: copyId,
        title: `${String(sourceItem.title ?? sourceId)} projection`,
      });
      relationship.itemIds = [sourceId, copyId];
      for (const story of Array.isArray(project.stories) ? project.stories : []) {
        const storyItemIds = Array.isArray(story.itemIds) ? story.itemIds.map(String) : [];
        if (storyItemIds.includes(sourceId) && !storyItemIds.includes(copyId)) {
          story.itemIds = [...storyItemIds, copyId];
        }
      }
      api.replaceProject(project);
      return {
        relationshipId: String(relationship.id),
        sourceId,
        copyId,
        oldStart: String(relationship.time?.start?.value ?? sourceItem.start),
      };
    });
    if (!fixture)
      return test.skip(true, "Example project needs a simple event-backed relationship.");

    await page.evaluate((itemId) => {
      const root = document.querySelector("#timeline-view");
      if (!(root instanceof HTMLElement)) throw new Error("Timeline root unavailable.");
      const view = (
        globalThis as typeof globalThis & {
          TimelineView?: { create(root: HTMLElement): { focusItem(id: string): void } };
        }
      ).TimelineView?.create(root);
      if (!view) throw new Error("Timeline controller unavailable.");
      view.focusItem(itemId);
    }, fixture.copyId);

    await expect
      .poll(async () =>
        page
          .locator(`.timeline-semantic-occurrence[data-id="${fixture.copyId}"][data-selected]`)
          .count(),
      )
      .toBeGreaterThan(0);

    const composer = await openPersistentComposer(page);
    const input = composer.locator("input");
    const initial = await input.inputValue();
    expect(initial).toContain(` on ${fixture.oldStart}`);

    const replacementStart = "2099-01-15";
    const edited = initial.replace(` on ${fixture.oldStart}`, ` on ${replacementStart}`);
    expect(edited).not.toBe(initial);
    await input.fill(edited);
    await input.press("Enter");

    await expect
      .poll(async () =>
        page.evaluate(
          ({ relationshipId, itemIds }) => {
            const project = (
              window as typeof window & {
                TimelineAgentAPI?: { getProject?: () => ProjectSnapshot };
              }
            ).TimelineAgentAPI?.getProject?.();
            const relationship = (project?.relationships ?? []).find(
              (candidate: ProjectRecord) => String(candidate.id) === relationshipId,
            );
            return {
              relationshipStart: String(relationship?.time?.start?.value ?? ""),
              items: itemIds.map((itemId: string) => {
                const item = (project?.items ?? []).find(
                  (candidate: ProjectRecord) => String(candidate.id) === itemId,
                );
                return {
                  id: itemId,
                  start: String(item?.start ?? ""),
                  timeStart: String(item?.time?.start?.value ?? ""),
                };
              }),
            };
          },
          {
            relationshipId: fixture.relationshipId,
            itemIds: [fixture.sourceId, fixture.copyId],
          },
        ),
      )
      .toEqual({
        relationshipStart: replacementStart,
        items: [
          { id: fixture.sourceId, start: replacementStart, timeStart: replacementStart },
          { id: fixture.copyId, start: replacementStart, timeStart: replacementStart },
        ],
      });
  });

  test("dirty composer draft requires explicit adoption of a newly selected occurrence", async ({
    page,
  }) => {
    await page.goto("/");
    const relationships = await relationshipFocuses(page);
    test.skip(relationships.length < 2, "Example project needs two focusable relationships.");
    const [first] = relationships;
    if (!first) return test.skip(true, "Example project needs two focusable relationships.");
    const second = relationships.find(
      (relationship) => relationship.relationshipId !== first.relationshipId,
    );
    if (!second)
      return test.skip(true, "Example project needs two distinct focusable relationships.");

    await focusRelationship(page, first);
    const composer = await openPersistentComposer(page);
    const input = composer.locator("input");
    const baseline = await input.inputValue();
    const dirty = `${baseline} `;
    await input.fill(dirty);
    await input.press("Escape");
    await expect(composer).not.toHaveAttribute("active", "");

    await focusRelationship(page, second);
    await openPersistentComposer(page);

    await expect(input).toHaveValue(dirty);
    const pending = composer.locator('[data-context-kind="pending-selection"]');
    await expect(pending).toBeVisible();
    await expect(pending).toContainText("Use selected context");

    await pending.click();
    await expect(input).not.toHaveValue(dirty);
    const adopted = await input.inputValue();
    expect(adopted).toContain(`@${second.subjectId} ${second.predicate} @${second.objectId}`);
  });

  test("canonical World selection propagates to timeline and survives as the composer @id seed", async ({
    page,
  }) => {
    test.skip(!(await certifyWebGlWorld(page)), "WebGL2 unavailable; WorldSurface is not active.");

    const entityId = await selectEntityWithTimelineContext(page);
    await expect(
      page.locator('.timeline-semantic-occurrence[data-selected][aria-label^="Selected:"]'),
    ).not.toHaveCount(0);

    const world = page.locator(".temporal-graph-canvas");
    await world.focus();
    await page.keyboard.press("Shift+F10");

    const input = page.locator("#occurrence-composer input");
    await expect(input).toHaveValue("@" + entityId + " ");
    const canonicalExists = await page.evaluate((id) => {
      const agentAPI = (
        window as typeof window & { TimelineAgentAPI?: { getProject?: () => unknown } }
      ).TimelineAgentAPI;
      const project = agentAPI?.getProject?.();
      return Boolean(project?.entities?.some((entity) => String(entity.id) === id));
    }, entityId);
    expect(canonicalExists).toBe(true);

    await input.press("Escape");
    await expect(page.locator("#occurrence-composer")).not.toHaveAttribute("active", "");
    await expect(
      page.locator('.timeline-semantic-occurrence[data-selected][aria-label^="Selected:"]'),
    ).not.toHaveCount(0);
  });

  test("closing contextual authoring restores its World invoker without changing selection or scroll", async ({
    page,
  }) => {
    test.skip(!(await certifyWebGlWorld(page)), "WebGL2 unavailable; WorldSurface is not active.");

    const entityId = await selectEntityWithTimelineContext(page);
    const selectedChronology = page.locator(
      '.timeline-semantic-occurrence[data-selected][aria-label^="Selected:"]',
    );
    await expect(selectedChronology).not.toHaveCount(0);

    const world = page.locator(".temporal-graph-canvas");
    await world.focus();
    await expect(world).toBeFocused();

    const beforeScroll = await page.evaluate(() => ({
      x: globalThis.scrollX,
      y: globalThis.scrollY,
    }));

    await page.keyboard.press("Shift+F10");
    const composer = page.locator("#occurrence-composer");
    const input = composer.locator("input");
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("@" + entityId + " ");

    await input.press("Escape");
    await expect(composer).not.toHaveAttribute("active", "");
    await expect(world).toBeFocused();
    await expect(selectedChronology).not.toHaveCount(0);

    const afterScroll = await page.evaluate(() => ({
      x: globalThis.scrollX,
      y: globalThis.scrollY,
    }));
    expect(afterScroll).toEqual(beforeScroll);
  });

  test("live place and time defaults stay visible until the sentence pins its own context", async ({
    page,
  }) => {
    await page.goto("/");
    const composer = await openPersistentComposer(page);
    await composer.evaluate((element) => {
      const live = element as HTMLElement & {
        setWorldContext?: (longitude: number, latitude: number, zoom: number) => void;
        setTimelineViewport?: (start: number, end: number) => void;
      };
      live.setWorldContext?.(18.0686, 59.3293, 12);
      const center = Date.UTC(2026, 8, 28, 12, 0, 0);
      live.setTimelineViewport?.(center - 3_600_000, center + 3_600_000);
    });
    const livePlace = composer.locator('[data-chip-kind="live-place"]');
    const liveTime = composer.locator('[data-chip-kind="live-time"]');
    await expect(livePlace).toBeVisible();
    await expect(livePlace).toContainText("live place");
    await expect(liveTime).toBeVisible();
    await expect(liveTime).toContainText("live time");

    const input = composer.locator("input");
    await input.fill("Alice meets Bob at Stockholm");
    await expect(livePlace).toHaveCount(0);
    await expect(liveTime).toBeVisible();

    await input.fill("Alice meets Bob at Stockholm on 2026-09-28");
    await expect(livePlace).toHaveCount(0);
    await expect(liveTime).toHaveCount(0);
  });

  test("visible Approve control commits an occurrence edit without pressing Enter", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    const [relationship] = await relationshipFocuses(page);
    if (!relationship)
      return test.skip(true, "Example project exposes no focusable relationship occurrence.");

    await focusRelationship(page, relationship);
    const composer = await openPersistentComposer(page);
    const replacementPredicate = await rewriteFocusedPredicate(composer, relationship);

    const approve = composer.getByRole("button", { name: "Approve occurrence" });
    await expect(approve).toBeVisible();
    if (testInfo.project.use.hasTouch) await approve.tap();
    else await approve.click();

    await expect
      .poll(() => relationshipPredicate(page, relationship.relationshipId))
      .toBe(replacementPredicate);
  });

  test("Ctrl+Enter finalizes the same composer transaction without consuming a suggestion", async ({
    page,
  }) => {
    await page.goto("/");
    const [relationship] = await relationshipFocuses(page);
    if (!relationship)
      return test.skip(true, "Example project exposes no focusable relationship occurrence.");

    await focusRelationship(page, relationship);
    const composer = await openPersistentComposer(page);
    const replacementPredicate = await rewriteFocusedPredicate(composer, relationship);
    const input = composer.locator('input[role="combobox"]');
    const edited = await input.inputValue();
    // Put the caret inside the action so a suggestion is highlighted; Ctrl+Enter must not apply it.
    await input.evaluate((field: HTMLInputElement, text: string) => {
      const offset = field.value.indexOf(text) + 2;
      field.setSelectionRange(offset, offset);
      field.dispatchEvent(new Event("select", { bubbles: true }));
    }, replacementPredicate);
    await expect(composer.getByRole("option").first()).toBeVisible();
    await input.press("Control+Enter");

    await expect
      .poll(() => relationshipPredicate(page, relationship.relationshipId))
      .toBe(replacementPredicate);
    await expect(input).toHaveValue(edited);
  });

  test("Details bridges an existing occurrence into the full edge editor", async ({ page }) => {
    await page.goto("/");
    const [relationship] = await relationshipFocuses(page);
    if (!relationship)
      return test.skip(true, "Example project exposes no focusable relationship occurrence.");

    await focusRelationship(page, relationship);
    const composer = await openPersistentComposer(page);
    await composer.locator('button[data-chip-kind="details"]').click();

    await expect(page.locator("#graph-edge-id")).toHaveValue(relationship.relationshipId);
    await expect(page.locator("#graph-edge-predicate")).toHaveValue(relationship.predicate);
  });

  test("suggestion clicks compose subject action and object without erasing accepted components", async ({
    page,
  }) => {
    await page.goto("/");
    const composer = await openPersistentComposer(page);
    const input = composer.locator("input");
    await input.fill("");
    await input.focus();

    const firstOption = composer.locator(".option").first();
    await expect(firstOption).toBeVisible();
    await firstOption.click();
    const subject = await input.inputValue();
    expect(subject.trim().length).toBeGreaterThan(0);
    expect(subject.endsWith(" ")).toBe(true);

    await expect(firstOption).toBeVisible();
    await firstOption.click();
    const subjectAndAction = await input.inputValue();
    expect(subjectAndAction.startsWith(subject)).toBe(true);
    expect(subjectAndAction.length).toBeGreaterThan(subject.length);

    await expect(firstOption).toBeVisible();
    await firstOption.click();
    const subjectActionObject = await input.inputValue();
    expect(subjectActionObject.startsWith(subjectAndAction)).toBe(true);
    expect(subjectActionObject.length).toBeGreaterThan(subjectAndAction.length);
  });

  test("S23-class portrait and landscape keep contextual composer fully contained without document scroll", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "Mobile Chrome",
      "Run the explicit S23-size certification once on the touch/mobile project.",
    );

    const cases = [
      { name: "portrait", width: 360, height: 780 },
      { name: "landscape", width: 780, height: 360 },
    ] as const;

    for (const viewport of cases) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      test.skip(
        !(await certifyWebGlWorld(page)),
        "WebGL2 unavailable; WorldSurface is not active.",
      );

      await discoverEmptyWorldPoint(page);
      await assertComposerInsideFooter(page);

      const composer = page.locator("#occurrence-composer");
      const input = composer.locator("input");
      await expect(input).toHaveAttribute("role", "combobox");
      await expect(input).toHaveAttribute("aria-expanded");
      await expect(input).toBeFocused();

      const visualContainment = await page.evaluate(() => {
        const visual = window.visualViewport;
        const composer = document.querySelector("#occurrence-composer");
        const footer = document.querySelector(".app-tool-dock.app-footer-bar");
        if (!(composer instanceof HTMLElement) || !(footer instanceof HTMLElement)) return null;
        const composerRect = composer.getBoundingClientRect();
        const footerRect = footer.getBoundingClientRect();
        const visualWidth = visual?.width ?? window.innerWidth;
        const visualHeight = visual?.height ?? window.innerHeight;
        return {
          composer: {
            left: composerRect.left,
            right: composerRect.right,
            top: composerRect.top,
            bottom: composerRect.bottom,
          },
          footer: {
            left: footerRect.left,
            right: footerRect.right,
            top: footerRect.top,
            bottom: footerRect.bottom,
          },
          visualWidth,
          visualHeight,
          shell: (() => {
            const element = document.querySelector("#app-shell");
            if (!(element instanceof HTMLElement)) return null;
            const rect = element.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, height: rect.height };
          })(),
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
        };
      });
      if (!visualContainment) throw new Error("S23 contextual authoring geometry is unavailable.");

      expect(visualContainment.composer.left, viewport.name).toBeGreaterThanOrEqual(-1);
      expect(visualContainment.composer.right, viewport.name).toBeLessThanOrEqual(
        visualContainment.visualWidth + 1,
      );
      expect(visualContainment.composer.top, viewport.name).toBeGreaterThanOrEqual(-1);
      expect(visualContainment.composer.bottom, viewport.name).toBeLessThanOrEqual(
        visualContainment.visualHeight + 1,
      );
      expect(visualContainment.shell, viewport.name).not.toBeNull();
      const shell = visualContainment.shell;
      if (!shell) continue;
      expect(shell.top, viewport.name).toBeGreaterThanOrEqual(-1);
      expect(shell.bottom, viewport.name).toBeGreaterThanOrEqual(
        visualContainment.visualHeight - 1,
      );
      expect(shell.height, viewport.name).toBeGreaterThanOrEqual(
        visualContainment.visualHeight - 1,
      );
      expect(visualContainment.scrollWidth, viewport.name).toBeLessThanOrEqual(viewport.width + 2);
      expect(visualContainment.scrollHeight, viewport.name).toBeLessThanOrEqual(
        viewport.height + 2,
      );

      await input.press("Escape");
      await expect(composer).not.toHaveAttribute("active", "");
      await expect(page.locator(".temporal-graph-canvas")).toBeFocused();

      // Start the next orientation from a settled, closed authoring state.
      await page.goto("/");
    }
  });
});
