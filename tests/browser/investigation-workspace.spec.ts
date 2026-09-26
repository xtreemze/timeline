import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 360, height: 780 } });

async function installReasoningFixture(page) {
  await page.goto("/");
  await page.evaluate(() => {
    const raw = localStorage.getItem("timeline:v2");
    if (!raw) throw new Error("Timeline state was not initialized.");
    const state = JSON.parse(raw);
    const assertions = Array.from({ length: 30 }, (_, index) => ({
      id: `fact-${index + 1}`,
      text: `Evidence row ${index + 1}`,
    }));
    const hypotheses = [
      ["hyp-alice", "Alice", "alice", "entity"],
      ["hyp-bob", "Bob", "bob", "entity"],
      ["hyp-carol", "Carol", "carol", "entity"],
      ["hyp-none-known", "None of the known candidates", "", "none-known"],
    ].map(([id, label, candidateEntityId, candidateScope]) => ({
      id,
      text: label,
      hypothesisKind: "identity",
      unknownEntityId: "unknown-person-a",
      candidateEntityId: candidateEntityId || undefined,
      candidateScope,
      alternativeGroupId: "identity-a",
      assertionIds: assertions.map((assertion) => assertion.id),
    }));
    state.entities = [
      ...(state.entities || []),
      {
        id: "unknown-person-a",
        type: "person",
        name: "Unidentified person A",
        alternateNames: [],
        sourceIds: [],
        identityResolution: "unresolved",
        attributes: {},
      },
      ...["alice", "bob", "carol"].map((id) => ({
        id,
        type: "person",
        name: id[0].toUpperCase() + id.slice(1),
        alternateNames: [],
        sourceIds: [],
        attributes: {},
      })),
    ];
    state.reasoning = {
      assertions,
      hypotheses,
      assumptions: [
        {
          id: "assume-phone-owner",
          text: "The registered owner carried the phone.",
          status: "challenged",
          inputIds: ["fact-1"],
          hypothesisIds: ["hyp-alice"],
          rationale: "Registration does not establish possession.",
        },
      ],
      questions: [
        {
          id: "q-location",
          text: "Where was Carol?",
          status: "open",
          hypothesisIds: ["hyp-carol"],
        },
      ],
      linesOfEnquiry: [
        {
          id: "loe-bob-alibi",
          text: "Test Bob's alibi.",
          status: "active",
          testType: "falsify",
          hypothesisIds: ["hyp-bob"],
        },
      ],
      indicators: [
        {
          id: "indicator-camera",
          text: "A matching person appears on Camera 6.",
          state: "unknown",
          hypothesisIds: ["hyp-carol"],
        },
      ],
      informationReviews: [
        {
          id: "quality-phone",
          text: "Device ownership does not establish possession.",
          finding: "limited",
          targetIds: ["fact-1"],
          limitations: "Carrier is not independently established.",
        },
      ],
      edges: assertions.flatMap((assertion, index) =>
        index < 2
          ? [
              {
                id: `support-${index}`,
                fromId: assertion.id,
                toId: "hyp-alice",
                predicate: "supports",
              },
            ]
          : [],
      ),
    };
    localStorage.setItem("timeline:v2", JSON.stringify(state));
  });
  await page.reload();
}

test("mobile investigation workspace renders dense alternatives without application-level overflow", async ({
  page,
}) => {
  await installReasoningFixture(page);

  const toggle = page.locator("#investigation-workspace-toggle");
  await expect(toggle).toBeVisible();
  await toggle.click();

  const sheet = page.locator("#investigation-workspace-sheet");
  await expect(sheet).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#presentation-stage")).toHaveAttribute("inert", "");

  const matrixRows = sheet.locator(".investigation-matrix tbody tr");
  await expect(matrixRows).toHaveCount(30);
  await expect(sheet.locator(".investigation-matrix thead th")).toHaveCount(5);

  const geometry = await sheet.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const matrix = element.querySelector(".investigation-matrix-scroll");
    return {
      top: rect.top,
      bottom: rect.bottom,
      viewportHeight: window.innerHeight,
      bodyOverflow: document.documentElement.scrollHeight - window.innerHeight,
      matrixScrolls:
        matrix instanceof HTMLElement ? matrix.scrollWidth > matrix.clientWidth : false,
    };
  });
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
  expect(geometry.bodyOverflow).toBeLessThanOrEqual(2);
  expect(geometry.matrixScrolls).toBe(true);

  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#presentation-stage")).not.toHaveAttribute("inert", "");
});

test("line-of-enquiry editor enforces rationale and persists through the app command path", async ({
  page,
}) => {
  await installReasoningFixture(page);
  await page.locator("#investigation-workspace-toggle").click();
  await page.getByRole("tab", { name: "Enquiries" }).click();

  const form = page.locator(".investigation-form");
  await form.locator("textarea").nth(0).fill("Review the independent station camera.");
  await form.getByLabel("Line of enquiry status").selectOption("not-pursued");
  await form.getByLabel("Line of enquiry test type").selectOption("discriminate");
  await form.locator('input[placeholder*="hyp-alice"]').fill("hyp-alice, hyp-carol");

  let dialogText = "";
  page.once("dialog", async (dialog) => {
    dialogText = dialog.message();
    await dialog.accept();
  });
  await form.getByRole("button", { name: "Add enquiry" }).click();
  await expect.poll(() => dialogText).toContain("require a recorded rationale");

  await form
    .locator('textarea[placeholder*="Required when deferred"]')
    .fill("The camera export is unavailable under the current preservation order.");
  await form.getByRole("button", { name: "Add enquiry" }).click();

  await expect(page.locator(".investigation-card")).toContainText(
    "Review the independent station camera.",
  );
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("timeline:v2") || "{}"));
  expect(
    stored.reasoning.linesOfEnquiry.some(
      (record) =>
        record.text === "Review the independent station camera." &&
        record.status === "not-pursued" &&
        record.rationale.includes("unavailable"),
    ),
  ).toBe(true);
});
