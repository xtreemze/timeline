import { expect, type Page, test } from "@playwright/test";

interface TimelineAgentApi {
  getProject(): Record<string, unknown>;
}

async function waitForAgentApi(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      typeof (globalThis as typeof globalThis & { TimelineAgentAPI?: unknown }).TimelineAgentAPI ===
      "object",
  );
}

async function currentProject(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => {
    const api = (globalThis as typeof globalThis & { TimelineAgentAPI: TimelineAgentApi })
      .TimelineAgentAPI;
    return structuredClone(api.getProject());
  });
}

function proposal(
  project: Record<string, unknown>,
  options: {
    readonly status?: "ready-for-user-verification" | "needs-repair";
    readonly valid?: boolean;
    readonly errors?: readonly string[];
  } = {},
): Record<string, unknown> {
  return {
    schemaVersion: "lum-story-proposal-v1",
    status: options.status ?? "ready-for-user-verification",
    project,
    sources: [
      {
        id: "source-review-1",
        title: "Uploaded source document",
        locator: "page 3",
      },
    ],
    unresolved: ["The exact time of the second event remains unresolved."],
    generationNotes: "Generated from the supplied source document.",
    preflight: {
      valid: options.valid ?? true,
      errors: options.errors ?? [],
      warnings: ["One occurrence uses approximate temporal precision."],
      summary: {},
    },
    verificationRequired: true,
    verificationInstructions: [
      "Compare every generated occurrence with its source evidence before approval.",
    ],
  };
}

async function uploadProposal(page: Page, value: Record<string, unknown>): Promise<void> {
  await page.locator("#import-json").setInputFiles({
    name: "generated-story-proposal.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(value)),
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/lum/");
  await waitForAgentApi(page);
});

test("generated proposal stays staged until explicit approval and Cancel preserves the project", async ({
  page,
}) => {
  const before = await currentProject(page);
  const candidate = structuredClone(before);
  candidate.title = "Verified generated candidate";

  const beforeScroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  await uploadProposal(page, proposal(candidate));

  const review = page.locator("#project-import-review-sheet");
  await expect(review).toBeVisible();
  await expect(page.locator("#project-import-review-status")).toContainText(
    "requires your verification",
  );
  await expect(page.locator("#project-import-review-sources")).toContainText(
    "Uploaded source document",
  );
  await expect(page.locator("#project-import-review-sources")).toContainText("page 3");
  await expect(page.locator("#project-import-review-unresolved")).toContainText(
    "exact time of the second event",
  );
  await expect(page.locator("#project-import-review-findings")).toContainText(
    "approximate temporal precision",
  );
  await expect(page.locator("#project-import-review-notes")).toContainText(
    "Generated from the supplied source document",
  );
  await expect(page.locator("#project-import-review-instructions")).toContainText(
    "Compare every generated occurrence",
  );
  await expect(page.locator("#project-import-review-fingerprint")).toHaveText(
    /^fnv1a64:[0-9a-f]{16}:\d+$/,
  );
  await expect(page.locator("#project-import-review-approve")).toBeEnabled();

  expect(await currentProject(page)).toEqual(before);

  const openGeometry = await page.evaluate(() => {
    const sheet = document.querySelector<HTMLElement>("#project-import-review-sheet");
    const footer = document.querySelector<HTMLElement>(".app-tool-dock");
    if (!sheet || !footer) throw new Error("Review sheet/footer missing.");
    const sheetRect = sheet.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    return {
      sheetBottom: sheetRect.bottom,
      footerTop: footerRect.top,
      scrollX,
      scrollY,
      footerInert: footer.inert,
      viewportHeight: innerHeight,
      documentHeight: document.documentElement.scrollHeight,
    };
  });
  expect(openGeometry.sheetBottom).toBeLessThanOrEqual(openGeometry.footerTop + 1);
  expect(openGeometry.footerInert).toBe(true);
  expect({ x: openGeometry.scrollX, y: openGeometry.scrollY }).toEqual(beforeScroll);
  expect(openGeometry.documentHeight).toBeLessThanOrEqual(openGeometry.viewportHeight + 1);

  await page.locator("#project-import-review-cancel").click();
  await expect(review).toBeHidden();
  await expect(page.locator("#project-menu-toggle")).toBeFocused();
  expect(await currentProject(page)).toEqual(before);
  expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(beforeScroll);

  await uploadProposal(page, proposal(candidate));
  await expect(review).toBeVisible();
  expect(await currentProject(page)).toEqual(before);
  await page.locator("#project-import-review-approve").click();

  await expect(review).toBeHidden();
  await expect
    .poll(async () => (await currentProject(page)).title)
    .toBe("Verified generated candidate");
});

test("repair-state generated proposal cannot be approved or mutate canonical state", async ({
  page,
}) => {
  const before = await currentProject(page);
  const candidate = structuredClone(before);
  candidate.title = "Must not commit";

  await uploadProposal(
    page,
    proposal(candidate, {
      status: "needs-repair",
      valid: false,
      errors: ["Evidence linkage is incomplete."],
    }),
  );

  const review = page.locator("#project-import-review-sheet");
  await expect(review).toBeVisible();
  await expect(page.locator("#project-import-review-status")).toContainText("cannot be approved");
  await expect(page.locator("#project-import-review-findings")).toContainText(
    "Evidence linkage is incomplete",
  );
  await expect(page.locator("#project-import-review-approve")).toBeDisabled();
  expect(await currentProject(page)).toEqual(before);

  await page.keyboard.press("Escape");
  await expect(review).toBeHidden();
  expect(await currentProject(page)).toEqual(before);
});
