import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 360, height: 780 } });

async function installReasoningFixture(page) {
  await page.goto("/");
  await page.evaluate(() => {
    const raw = localStorage.getItem("timeline:v2");
    if (!raw) throw new Error("Timeline state was not initialized.");
    const state = JSON.parse(raw);
    const assertions = Array.from({ length: 29 }, (_, index) => ({
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
    const linkedItemId = state.items?.[0]?.id || "";
    const linkedRelationshipId = state.relationships?.[0]?.id || "";
    const linkedPlaceId = state.places?.[0]?.id || "";
    const linkedEntityId = state.entities?.[0]?.id || "";
    const linkedStart = state.items?.[0]?.start || "2026-09-26T21:10:00+03:00";
    const linkedEnd = state.items?.[0]?.end || linkedStart;
    state.evidence = [
      ...(state.evidence || []).filter((record) => record.id !== "ev-track"),
      {
        id: "ev-track",
        type: "note",
        title: "GNSS track source",
        sourceName: "Recorder A",
        url: "https://example.test/track",
        note: "Dense trajectory source retained outside the reasoning ledger.",
        publishedAt: "2026-09-26",
        file: null,
      },
    ];
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
      observations: [
        {
          id: "obs-track",
          text: "Trajectory observation near the incident area.",
          evidenceIds: ["ev-track"],
          itemIds: linkedItemId ? [linkedItemId] : [],
          relationshipIds: linkedRelationshipId ? [linkedRelationshipId] : [],
          placeIds: linkedPlaceId ? [linkedPlaceId] : [],
          entityIds: linkedEntityId ? [linkedEntityId] : [],
          trajectoryIds: ["track-high-res"],
          temporalScope: { start: linkedStart, end: linkedEnd },
        },
      ],
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
      edges: [
        ...assertions.flatMap((assertion, index) =>
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
        {
          id: "track-contextualizes-carol",
          fromId: "obs-track",
          toId: "hyp-carol",
          predicate: "contextualizes",
        },
      ],
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

  await sheet.getByRole("button", { name: "Trajectory observation near the incident area." }).click();
  const drilldown = sheet.locator(".investigation-evidence-drilldown");
  await expect(drilldown).toContainText("GNSS track source");
  await expect(drilldown).toContainText("trajectory track-high-res");
  await expect(drilldown.getByRole("button", { name: "Open source" })).toBeVisible();
  await expect(drilldown.getByRole("button", { name: "Focus context" })).toBeVisible();

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

  await drilldown.getByRole("button", { name: "Focus context" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.locator("#status")).toContainText(/Focused (trajectory context|timeline context)/);

  await page.locator("#investigation-workspace-toggle").click();
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


test("quality and indicator records are editable and remain qualitative", async ({ page }) => {
  await installReasoningFixture(page);
  await page.locator("#investigation-workspace-toggle").click();

  await page.getByRole("tab", { name: "Quality" }).click();
  const qualityForm = page.locator(".investigation-panel:not([hidden]) .investigation-form");
  await qualityForm.locator("textarea").nth(0).fill("Track source conflicts with witness timing.");
  await qualityForm.getByLabel("Information-quality finding").selectOption("conflicted");
  await qualityForm.locator('input[placeholder*="evidence"]').fill("ev-track");
  await qualityForm.locator('textarea[placeholder*="limitations"]').fill("Clock offset remains unresolved.");
  await qualityForm.getByRole("button", { name: "Add quality review" }).click();
  await expect(page.locator(".investigation-panel:not([hidden]) .investigation-card")).toContainText(
    "Track source conflicts with witness timing.",
  );
  await expect(page.getByRole("button", { name: "Open GNSS track source" })).toBeVisible();

  await page.getByRole("tab", { name: "Indicators" }).click();
  const indicatorForm = page.locator(".investigation-panel:not([hidden]) .investigation-form");
  await indicatorForm.locator("textarea").nth(0).fill("A matching track reaches the west exit.");
  await indicatorForm.getByLabel("Indicator state").selectOption("observed");
  await indicatorForm.locator('input[placeholder="observation IDs"]').fill("obs-track");
  await indicatorForm.locator('input[placeholder="hypothesis IDs"]').fill("hyp-carol");
  await indicatorForm.getByRole("button", { name: "Add indicator" }).click();
  await expect(page.locator(".investigation-panel:not([hidden]) .investigation-card")).toContainText(
    "A matching track reaches the west exit.",
  );

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("timeline:v2") || "{}"));
  const quality = stored.reasoning.informationReviews.find(
    (record) => record.text === "Track source conflicts with witness timing.",
  );
  const indicator = stored.reasoning.indicators.find(
    (record) => record.text === "A matching track reaches the west exit.",
  );
  expect(quality.finding).toBe("conflicted");
  expect(quality.score).toBeUndefined();
  expect(indicator.state).toBe("observed");
  expect(indicator.score).toBeUndefined();
});
