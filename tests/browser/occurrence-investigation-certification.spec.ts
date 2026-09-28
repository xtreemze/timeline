import { expect, test } from "@playwright/test";

async function projectSnapshot(page) {
  return page.evaluate(() => {
    const api = (
      window as typeof window & {
        TimelineAgentAPI?: { getProject?: () => any };
      }
    ).TimelineAgentAPI;
    const project = api?.getProject?.();
    return {
      entities: project?.entities ?? [],
      relationships: project?.relationships ?? [],
      reasoning: project?.reasoning ?? {},
    };
  });
}

test.describe("unified occurrence investigation certification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#occurrence-composer .compact")).toBeVisible();
  });

  test("question qualifier stays analytical until explicitly persisted", async ({ page }) => {
    const before = await projectSnapshot(page);
    const object = before.entities.find((entity) => String(entity.id || ""));
    test.skip(!object, "Example project requires at least one canonical entity.");

    const composer = page.locator("#occurrence-composer");
    await composer.locator(".compact").click();
    const input = composer.locator("input");
    await input.fill(`man? calls @${String(object.id)}`);

    await expect(composer.locator("luum-occurrence-investigation")).toBeVisible();
    await expect(composer.locator(".commit")).toBeDisabled();

    const afterTyping = await projectSnapshot(page);
    expect(afterTyping.relationships).toHaveLength(before.relationships.length);
    expect(afterTyping.reasoning).toEqual(before.reasoning);

    const investigation = composer.locator("luum-occurrence-investigation");
    const interpretation = investigation.locator(".investigation-interpretation").first();
    await expect(interpretation).toBeVisible();
    await interpretation.click();

    await expect(investigation.locator(".investigation-candidate").first()).toBeVisible();
    await expect(investigation).toContainText("None of the currently known candidates");

    const beforeQuestions = Array.isArray(before.reasoning?.questions)
      ? before.reasoning.questions.length
      : 0;
    await investigation.getByRole("button", { name: "Ask this question" }).click();

    await expect
      .poll(async () => {
        const next = await projectSnapshot(page);
        return Array.isArray(next.reasoning?.questions) ? next.reasoning.questions.length : 0;
      })
      .toBe(beforeQuestions + 1);

    const afterQuestion = await projectSnapshot(page);
    expect(afterQuestion.relationships).toHaveLength(before.relationships.length);
  });

  test("dirty investigative draft survives canonical selection changes until adoption", async ({
    page,
  }) => {
    const project = await projectSnapshot(page);
    const relationships = project.relationships.filter(
      (relationship) => relationship?.id && relationship?.subjectId && relationship?.objectId,
    );
    test.skip(relationships.length < 2, "Example project requires two relationships.");

    const composer = page.locator("#occurrence-composer");
    await composer.locator(".compact").click();
    const input = composer.locator("input");
    const first = relationships[0];
    const second = relationships[1];

    await page.evaluate((relationshipId) => {
      const world = document.querySelector(".temporal-graph-canvas");
      world?.dispatchEvent(
        new CustomEvent("worldselectionchange", {
          bubbles: true,
          detail: { selection: { kind: "relationship", id: relationshipId } },
        }),
      );
    }, String(first.id));

    const dirty = `man? calls @${String(first.objectId)}`;
    await input.fill(dirty);
    await expect(composer.locator("luum-occurrence-investigation")).toBeVisible();

    await page.evaluate((relationshipId) => {
      const world = document.querySelector(".temporal-graph-canvas");
      world?.dispatchEvent(
        new CustomEvent("worldselectionchange", {
          bubbles: true,
          detail: { selection: { kind: "relationship", id: relationshipId } },
        }),
      );
    }, String(second.id));

    await expect(input).toHaveValue(dirty);
    const pending = composer.locator('[data-context-kind="pending-selection"]');
    await expect(pending).toBeVisible();

    await pending.click();
    await expect(input).not.toHaveValue(dirty);
    await expect(input).toContainText;
  });

  test("investigation typing does not create document scroll on narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    const project = await projectSnapshot(page);
    const object = project.entities.find((entity) => String(entity.id || ""));
    test.skip(!object, "Example project requires a canonical entity.");

    const composer = page.locator("#occurrence-composer");
    await composer.locator(".compact").click();
    await composer.locator("input").fill(`man? calls @${String(object.id)}`);
    await expect(composer.locator("luum-occurrence-investigation")).toBeVisible();

    const metrics = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }));
    expect(metrics.width).toBeLessThanOrEqual(metrics.viewportWidth + 2);
    expect(metrics.height).toBeLessThanOrEqual(metrics.viewportHeight + 2);
  });
});
