import "../investigation-workspace.css";

export interface InvestigationMethod {
  readonly id: string;
  readonly name: string;
  readonly family: string;
}

export interface InvestigationFinding {
  readonly severity: string;
  readonly code: string;
  readonly recordId: string;
  readonly message: string;
}

export interface InvestigationReasoningApi {
  readonly ANALYTIC_METHODS: readonly InvestigationMethod[];
  normalizeReasoning(value: unknown): Record<string, unknown>;
  competingHypothesisMatrix(
    value: unknown,
    alternativeGroupId: string,
  ): {
    alternativeGroupId: string;
    hypotheses: Array<Record<string, unknown>>;
    evidenceRows: Array<{
      evidenceId: string;
      evidenceType: string;
      cells: Array<{
        hypothesisId: string;
        assessment: string;
        edgeIds: string[];
      }>;
    }>;
  };
  methodologyReview(
    value: unknown,
    options?: { externalIds?: string[]; entityIds?: string[] },
  ): {
    openQuestionIds: string[];
    assumptionIdsNeedingReview: string[];
    activeEnquiryIds: string[];
    deferredEnquiryIds: string[];
    unresolvedInformationReviewIds: string[];
    unknownIndicatorIds: string[];
    alternativeGroupsWithoutDisconfirmingTest: string[];
    disconfirmingCoverage: Array<{
      alternativeGroupId: string;
      hypothesisIds: string[];
      enquiryIds: string[];
      coveredHypothesisIds: string[];
      missingHypothesisIds: string[];
      hasDisconfirmingTest: boolean;
    }>;
    validationFindings: InvestigationFinding[];
  };
  validateReasoning(
    value: unknown,
    options?: { externalIds?: string[]; entityIds?: string[] },
  ): InvestigationFinding[];
}

export interface InvestigationFocusTarget {
  readonly kind: "reasoning" | "entity";
  readonly id: string;
  readonly record?: Record<string, unknown>;
}

export interface InvestigationEvidenceRecord {
  readonly id: string;
  readonly title?: string;
  readonly sourceName?: string;
  readonly url?: string;
  readonly note?: string;
  readonly publishedAt?: string;
  readonly file?: unknown;
  readonly forensic?: unknown;
  readonly extraction?: unknown;
}

export interface InvestigationWorkspaceOptions {
  readonly shell: HTMLElement;
  readonly footerActions: HTMLElement;
  readonly reasoningApi: InvestigationReasoningApi;
  readonly createIcon?: (name: string, options?: { size?: number }) => Node;
  readonly getReasoning: () => unknown;
  readonly getEntityIds: () => string[];
  readonly getExternalIds: () => string[];
  readonly getEvidenceRecords: () => readonly InvestigationEvidenceRecord[];
  readonly onRequestOpen: (open: boolean) => void;
  readonly onCommit: (reasoning: Record<string, unknown>, status: string) => void;
  readonly onFocus: (target: InvestigationFocusTarget) => void;
  readonly onOpenEvidence: (evidenceId: string) => void;
}

export interface InvestigationWorkspaceController {
  readonly toggle: HTMLButtonElement;
  readonly sheet: HTMLElement;
  setOpen(open: boolean): void;
  render(): void;
  destroy(): void;
}

type ReasoningRecord = Record<string, unknown>;
type ReasoningCollection =
  | "assumptions"
  | "questions"
  | "hypotheses"
  | "linesOfEnquiry"
  | "indicators"
  | "informationReviews";

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(stringValue).filter(Boolean);
}

function collection(
  reasoning: Record<string, unknown>,
  name: ReasoningCollection,
): ReasoningRecord[] {
  const value = reasoning[name];
  return Array.isArray(value)
    ? value.filter(
        (record): record is ReasoningRecord =>
          Boolean(record) && typeof record === "object" && !Array.isArray(record),
      )
    : [];
}

function labelFor(record: ReasoningRecord, fallback: string): string {
  return (
    stringValue(record.text) ||
    stringValue(record.title) ||
    stringValue(record.id) ||
    fallback
  );
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function field(label: string, input: HTMLElement): HTMLLabelElement {
  const wrapper = createElement("label", "investigation-field");
  wrapper.append(createElement("span", "", label), input);
  return wrapper;
}

function selectControl(
  values: readonly string[],
  value: string,
  ariaLabel: string,
): HTMLSelectElement {
  const select = createElement("select");
  select.setAttribute("aria-label", ariaLabel);
  for (const candidate of values) {
    const option = createElement("option");
    option.value = candidate;
    option.textContent = candidate.replaceAll("-", " ");
    select.append(option);
  }
  select.value = values.includes(value) ? value : values[0] || "";
  return select;
}

function recordId(record: ReasoningRecord): string {
  return stringValue(record.id);
}

function uniqueId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function panelButton(label: string, panel: string): HTMLButtonElement {
  const button = createElement("button", "investigation-tab", label);
  button.type = "button";
  button.dataset.investigationPanel = panel;
  button.setAttribute("role", "tab");
  button.setAttribute("aria-selected", "false");
  return button;
}

function emptyState(message: string): HTMLElement {
  return createElement("p", "investigation-empty", message);
}

function statusBadge(value: string): HTMLElement {
  const badge = createElement("span", "investigation-status", value || "unknown");
  badge.dataset.status = value || "unknown";
  return badge;
}

function parseIdList(value: string): string[] {
  return [...new Set(value.split(/[\n,]/).map((entry) => entry.trim()).filter(Boolean))];
}

function focusButton(
  target: InvestigationFocusTarget,
  label: string,
  onFocus: InvestigationWorkspaceOptions["onFocus"],
): HTMLButtonElement {
  const button = createElement("button", "investigation-link", label);
  button.type = "button";
  button.addEventListener("click", () => onFocus(target));
  return button;
}

export function createInvestigationWorkspace(
  options: InvestigationWorkspaceOptions,
): InvestigationWorkspaceController {
  const {
    shell,
    footerActions,
    reasoningApi,
    createIcon,
    getReasoning,
    getEntityIds,
    getExternalIds,
    getEvidenceRecords,
    onRequestOpen,
    onCommit,
    onFocus,
    onOpenEvidence,
  } = options;

  const toggle = createElement("button", "toolbar-control app-tool");
  toggle.id = "investigation-workspace-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "investigation-workspace-sheet");
  toggle.setAttribute("aria-label", "Investigation methodology");
  toggle.title = "Investigation methodology";
  if (createIcon) toggle.append(createIcon("relation", { size: 22 }));
  toggle.append(createElement("span", "app-tool-label sr-only", "Investigate"));
  footerActions.append(toggle);

  const sheet = createElement("aside", "investigation-workspace-sheet");
  sheet.id = "investigation-workspace-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "false");
  sheet.setAttribute("aria-labelledby", "investigation-workspace-title");
  sheet.setAttribute("aria-hidden", "true");
  sheet.hidden = true;

  const panel = createElement("div", "investigation-workspace-panel");
  const header = createElement("header", "app-surface-header investigation-header");
  const headerCopy = createElement("div");
  headerCopy.append(
    createElement("p", "kicker", "Analysis"),
    createElement("strong", "", "Investigation methodology"),
  );
  headerCopy.querySelector("strong")!.id = "investigation-workspace-title";
  const headerActions = createElement("div", "app-surface-header-actions");
  const methodCount = createElement(
    "span",
    "investigation-method-count",
    `${reasoningApi.ANALYTIC_METHODS.length} methods`,
  );
  const close = createElement("button", "button ghost compact-button", "Close");
  close.type = "button";
  close.id = "investigation-workspace-close";
  close.setAttribute("aria-label", "Close investigation methodology");
  headerActions.append(methodCount, close);
  header.append(headerCopy, headerActions);

  const tabs = createElement("div", "investigation-tabs");
  tabs.setAttribute("role", "tablist");
  const tabDefs = [
    ["Matrix", "matrix"],
    ["Review", "review"],
    ["Enquiries", "enquiries"],
    ["Assumptions", "assumptions"],
    ["Quality", "quality"],
    ["Indicators", "indicators"],
  ] as const;
  const tabButtons = tabDefs.map(([label, id]) => panelButton(label, id));
  tabs.append(...tabButtons);

  const body = createElement("div", "investigation-body");
  const panels = new Map<string, HTMLElement>();
  for (const [, id] of tabDefs) {
    const section = createElement("section", "investigation-panel");
    section.dataset.investigationPanelContent = id;
    section.setAttribute("role", "tabpanel");
    section.hidden = id !== "matrix";
    panels.set(id, section);
    body.append(section);
  }

  panel.append(header, tabs, body);
  sheet.append(panel);
  shell.append(sheet);

  let activePanel = "matrix";
  let open = false;
  let editingAssumptionId = "";
  let editingEnquiryId = "";
  let editingInformationReviewId = "";
  let editingIndicatorId = "";
  let selectedMatrixRecordId = "";

  function normalized(): Record<string, unknown> {
    return reasoningApi.normalizeReasoning(getReasoning());
  }

  function validationOptions() {
    return {
      entityIds: getEntityIds(),
      externalIds: getExternalIds(),
    };
  }

  function commitCollection(
    name: ReasoningCollection,
    nextRecord: ReasoningRecord,
    status: string,
  ): boolean {
    const reasoning = normalized();
    const records = collection(reasoning, name);
    const id = recordId(nextRecord);
    const nextRecords = records.some((record) => recordId(record) === id)
      ? records.map((record) => (recordId(record) === id ? nextRecord : record))
      : [...records, nextRecord];
    const next = reasoningApi.normalizeReasoning({ ...reasoning, [name]: nextRecords });
    const errors = reasoningApi
      .validateReasoning(next, validationOptions())
      .filter((finding) => finding.severity === "error");
    if (errors.length) {
      const message = errors
        .slice(0, 3)
        .map((finding) => finding.message)
        .join(" ");
      globalThis.alert?.(message || "The reasoning update is not valid.");
      return false;
    }
    onCommit(next, status);
    return true;
  }

  function evidenceRecordsFor(record: ReasoningRecord | undefined): InvestigationEvidenceRecord[] {
    if (!record) return [];
    const ids = new Set([
      ...stringList(record.evidenceIds),
      ...(stringValue(record.evidenceId) ? [stringValue(record.evidenceId)] : []),
    ]);
    if (!ids.size) return [];
    return getEvidenceRecords().filter((evidence) => ids.has(evidence.id));
  }

  function locatorLabel(record: ReasoningRecord): string {
    const locator = record.locator;
    if (!locator || typeof locator !== "object" || Array.isArray(locator)) return "";
    const source = locator as Record<string, unknown>;
    const type = stringValue(source.type);
    if (type === "page") {
      const start = Number(source.page);
      const end = Number(source.pageEnd);
      return Number.isFinite(end) && end >= start ? `pages ${start}–${end}` : `page ${start}`;
    }
    if (type === "time") {
      const start = Number(source.startMs);
      const end = Number(source.endMs);
      if (!Number.isFinite(start)) return "";
      const seconds = (value: number) => (value / 1000).toFixed(1).replace(/\.0$/, "");
      return Number.isFinite(end) && end >= start
        ? `${seconds(start)}–${seconds(end)} s`
        : `${seconds(start)} s`;
    }
    return stringValue(source.value) || stringValue(source.label);
  }

  function contextSummary(record: ReasoningRecord): string {
    const parts: string[] = [];
    const trajectories = stringList(record.trajectoryIds);
    const relationships = stringList(record.relationshipIds);
    const places = stringList(record.placeIds);
    const entities = stringList(record.entityIds);
    const items = stringList(record.itemIds);
    if (trajectories.length) parts.push(`trajectory ${trajectories.join(", ")}`);
    if (relationships.length) parts.push(`occurrence/relation ${relationships.join(", ")}`);
    if (places.length) parts.push(`place ${places.join(", ")}`);
    if (entities.length) parts.push(`entity ${entities.join(", ")}`);
    if (items.length) parts.push(`timeline ${items.join(", ")}`);
    return parts.join(" · ");
  }

  function renderEvidenceDrilldown(record: ReasoningRecord | undefined): HTMLElement {
    const region = createElement("section", "investigation-evidence-drilldown");
    region.setAttribute("aria-live", "polite");
    if (!record) {
      region.append(emptyState("Select an evidence or observation row to inspect its source context."));
      return region;
    }

    const heading = createElement("div", "investigation-card-heading");
    heading.append(
      createElement("strong", "", labelFor(record, recordId(record))),
      statusBadge(stringValue(record.type) || "reasoning"),
    );
    region.append(heading);

    const context = contextSummary(record);
    const locator = locatorLabel(record);
    if (context || locator) {
      region.append(
        createElement(
          "p",
          "investigation-card-meta",
          [context, locator].filter(Boolean).join(" · "),
        ),
      );
    }

    const actions = createElement("div", "investigation-form-actions");
    if (
      stringList(record.itemIds).length ||
      stringList(record.relationshipIds).length ||
      stringList(record.placeIds).length ||
      stringList(record.entityIds).length ||
      stringList(record.trajectoryIds).length ||
      record.temporalScope
    ) {
      const focus = createElement("button", "button secondary compact-button", "Focus context");
      focus.type = "button";
      focus.addEventListener("click", () =>
        onFocus({ kind: "reasoning", id: recordId(record), record }),
      );
      actions.append(focus);
    }

    const sources = evidenceRecordsFor(record);
    for (const evidence of sources) {
      const card = createElement("article", "investigation-source-card");
      card.append(
        createElement("strong", "", evidence.title || evidence.id),
        createElement(
          "p",
          "investigation-card-meta",
          [evidence.sourceName, evidence.publishedAt].filter(Boolean).join(" · ") ||
            "Source metadata",
        ),
      );
      if (evidence.note) {
        card.append(createElement("p", "investigation-source-note", evidence.note));
      }
      const open = createElement("button", "button secondary compact-button", "Open source");
      open.type = "button";
      open.addEventListener("click", () => onOpenEvidence(evidence.id));
      card.append(open);
      region.append(card);
    }

    if (!sources.length) {
      region.append(createElement("p", "investigation-card-meta", "No linked source record."));
    }
    if (actions.childElementCount) region.append(actions);
    return region;
  }

  function setPanel(id: string): void {
    activePanel = panels.has(id) ? id : "matrix";
    for (const button of tabButtons) {
      const active = button.dataset.investigationPanel === activePanel;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    }
    for (const [panelId, content] of panels) {
      content.hidden = panelId !== activePanel;
    }
  }

  function alternativeGroups(reasoning: Record<string, unknown>): string[] {
    const groups = new Set<string>();
    for (const hypothesis of collection(reasoning, "hypotheses")) {
      const group = stringValue(hypothesis.alternativeGroupId);
      if (group) groups.add(group);
    }
    return [...groups].sort();
  }

  function renderMatrix(reasoning: Record<string, unknown>): void {
    const root = panels.get("matrix")!;
    root.replaceChildren();
    const groups = alternativeGroups(reasoning);
    if (!groups.length) {
      root.append(
        emptyState(
          "No competing hypothesis groups yet. Add hypotheses with an alternative group to build the matrix.",
        ),
      );
      return;
    }

    const controls = createElement("div", "investigation-panel-controls");
    const selector = selectControl(groups, groups[0]!, "Alternative hypothesis group");
    controls.append(field("Alternative group", selector));
    root.append(controls);

    const matrixHost = createElement("div", "investigation-matrix-scroll");
    const drilldownHost = createElement("div", "investigation-evidence-drilldown-host");
    root.append(matrixHost, drilldownHost);

    const draw = () => {
      matrixHost.replaceChildren();
      const matrix = reasoningApi.competingHypothesisMatrix(reasoning, selector.value);
      if (!matrix.hypotheses.length) {
        matrixHost.append(emptyState("No hypotheses are available in this group."));
        return;
      }
      const table = createElement("table", "investigation-matrix");
      const thead = createElement("thead");
      const headerRow = createElement("tr");
      headerRow.append(createElement("th", "", "Evidence / observation"));
      for (const hypothesis of matrix.hypotheses) {
        const th = createElement("th");
        const candidateId = stringValue(hypothesis.candidateEntityId);
        const label = labelFor(hypothesis, recordId(hypothesis));
        th.append(
          candidateId
            ? focusButton({ kind: "entity", id: candidateId, record: hypothesis }, label, onFocus)
            : createElement("span", "", label),
        );
        headerRow.append(th);
      }
      thead.append(headerRow);
      table.append(thead);

      const tbody = createElement("tbody");
      for (const row of matrix.evidenceRows) {
        const tr = createElement("tr");
        const record = [
          ...collection(reasoning, "hypotheses"),
          ...((reasoning.observations as ReasoningRecord[] | undefined) ?? []),
          ...((reasoning.assertions as ReasoningRecord[] | undefined) ?? []),
          ...((reasoning.citations as ReasoningRecord[] | undefined) ?? []),
        ].find((candidate) => recordId(candidate) === row.evidenceId);
        const label = record ? labelFor(record, row.evidenceId) : row.evidenceId;
        const evidenceCell = createElement("th");
        evidenceCell.scope = "row";
        const inspect = createElement("button", "investigation-link", label);
        inspect.type = "button";
        inspect.setAttribute("aria-expanded", String(selectedMatrixRecordId === row.evidenceId));
        inspect.addEventListener("click", () => {
          selectedMatrixRecordId =
            selectedMatrixRecordId === row.evidenceId ? "" : row.evidenceId;
          drilldownHost.replaceChildren(
            renderEvidenceDrilldown(
              selectedMatrixRecordId === row.evidenceId ? record : undefined,
            ),
          );
          inspect.setAttribute("aria-expanded", String(Boolean(selectedMatrixRecordId)));
        });
        evidenceCell.append(inspect);
        tr.append(evidenceCell);
        for (const cell of row.cells) {
          const td = createElement("td");
          td.dataset.assessment = cell.assessment;
          td.append(statusBadge(cell.assessment));
          tr.append(td);
        }
        tbody.append(tr);
      }
      table.append(tbody);
      matrixHost.append(table);
      const selected = [
        ...((reasoning.observations as ReasoningRecord[] | undefined) ?? []),
        ...((reasoning.assertions as ReasoningRecord[] | undefined) ?? []),
        ...((reasoning.citations as ReasoningRecord[] | undefined) ?? []),
      ].find((record) => recordId(record) === selectedMatrixRecordId);
      drilldownHost.replaceChildren(renderEvidenceDrilldown(selected));
    };

    selector.addEventListener("change", () => {
      selectedMatrixRecordId = "";
      draw();
    });
    draw();
  }

  function reviewList(
    title: string,
    ids: readonly string[],
    reasoning: Record<string, unknown>,
  ): HTMLElement {
    const section = createElement("section", "investigation-review-group");
    section.append(createElement("h3", "", title));
    if (!ids.length) {
      section.append(createElement("p", "investigation-ok", "No outstanding items."));
      return section;
    }
    const list = createElement("ul", "investigation-review-list");
    const allRecords = Object.values(reasoning)
      .filter(Array.isArray)
      .flat()
      .filter(
        (record): record is ReasoningRecord =>
          Boolean(record) && typeof record === "object" && !Array.isArray(record),
      );
    for (const id of ids) {
      const record = allRecords.find((candidate) => recordId(candidate) === id);
      const li = createElement("li");
      li.append(
        focusButton({ kind: "reasoning", id, record }, record ? labelFor(record, id) : id, onFocus),
      );
      list.append(li);
    }
    section.append(list);
    return section;
  }

  function renderReview(reasoning: Record<string, unknown>): void {
    const root = panels.get("review")!;
    root.replaceChildren();
    const review = reasoningApi.methodologyReview(reasoning, validationOptions());
    root.append(
      reviewList("Open questions", review.openQuestionIds, reasoning),
      reviewList("Assumptions needing review", review.assumptionIdsNeedingReview, reasoning),
      reviewList("Active / proposed enquiries", review.activeEnquiryIds, reasoning),
      reviewList("Deferred / not pursued", review.deferredEnquiryIds, reasoning),
      reviewList(
        "Information-quality concerns",
        review.unresolvedInformationReviewIds,
        reasoning,
      ),
      reviewList("Unknown indicators", review.unknownIndicatorIds, reasoning),
    );

    const coverage = createElement("section", "investigation-review-group");
    coverage.append(createElement("h3", "", "Disconfirming-test coverage"));
    if (!review.disconfirmingCoverage.length) {
      coverage.append(emptyState("No alternative groups are currently defined."));
    } else {
      for (const entry of review.disconfirmingCoverage) {
        const card = createElement("article", "investigation-review-card");
        card.append(
          createElement("strong", "", entry.alternativeGroupId),
          statusBadge(entry.hasDisconfirmingTest ? "covered" : "gap"),
        );
        const detail = createElement("p");
        detail.textContent = entry.missingHypothesisIds.length
          ? "Missing explicit discriminating/falsification tests for:"
          : "Every hypothesis has at least one explicit discriminating or falsification enquiry.";
        card.append(detail);
        if (entry.missingHypothesisIds.length) {
          const links = createElement("div", "investigation-gap-links");
          for (const hypothesisId of entry.missingHypothesisIds) {
            const hypothesis = collection(reasoning, "hypotheses").find(
              (record) => recordId(record) === hypothesisId,
            );
            const candidateId = stringValue(hypothesis?.candidateEntityId);
            links.append(
              focusButton(
                candidateId
                  ? { kind: "entity", id: candidateId, record: hypothesis }
                  : { kind: "reasoning", id: hypothesisId, record: hypothesis },
                hypothesis ? labelFor(hypothesis, hypothesisId) : hypothesisId,
                onFocus,
              ),
            );
          }
          card.append(links);
        }
        coverage.append(card);
      }
    }
    root.append(coverage);

    const errors = review.validationFindings.filter(
      (finding) => finding.severity === "error",
    );
    if (errors.length) {
      const validation = createElement("section", "investigation-review-group");
      validation.append(createElement("h3", "", "Validation"));
      for (const finding of errors.slice(0, 20)) {
        const item = createElement("p", "investigation-validation-error", finding.message);
        item.dataset.recordId = finding.recordId;
        validation.append(item);
      }
      root.append(validation);
    }
  }

  function renderAssumptions(reasoning: Record<string, unknown>): void {
    const root = panels.get("assumptions")!;
    root.replaceChildren();
    const assumptions = collection(reasoning, "assumptions");
    const editing = assumptions.find((record) => recordId(record) === editingAssumptionId);

    const form = createElement("form", "investigation-form");
    const textInput = createElement("textarea");
    textInput.rows = 3;
    textInput.required = true;
    textInput.value = stringValue(editing?.text);
    textInput.placeholder = "State the assumption explicitly.";
    const status = selectControl(
      ["open", "supported", "challenged", "rejected"],
      stringValue(editing?.status) || "open",
      "Assumption status",
    );
    const basis = createElement("input");
    basis.type = "text";
    basis.value = stringList(editing?.basisIds).join(", ");
    basis.placeholder = "fact-1, observation-2";
    const hypotheses = createElement("input");
    hypotheses.type = "text";
    hypotheses.value = stringList(editing?.hypothesisIds).join(", ");
    hypotheses.placeholder = "hypothesis IDs";
    const propositions = createElement("input");
    propositions.type = "text";
    propositions.value = stringList(editing?.propositionIds).join(", ");
    propositions.placeholder = "proposition IDs";
    const rationale = createElement("textarea");
    rationale.rows = 2;
    rationale.value = stringValue(editing?.rationale);
    rationale.placeholder = "Why is this assumption supported, challenged, or retained?";

    const actions = createElement("div", "investigation-form-actions");
    const save = createElement("button", "button primary", editing ? "Update assumption" : "Add assumption");
    save.type = "submit";
    const cancel = createElement("button", "button ghost", "Cancel");
    cancel.type = "button";
    cancel.hidden = !editing;
    actions.append(save, cancel);
    form.append(
      field("Assumption", textInput),
      field("Status", status),
      field("Basis IDs", basis),
      field("Affected hypothesis IDs", hypotheses),
      field("Affected proposition IDs", propositions),
      field("Rationale", rationale),
      actions,
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const record: ReasoningRecord = {
        ...(editing ?? {}),
        id: editing ? recordId(editing) : uniqueId("assumption"),
        text: textInput.value.trim(),
        status: status.value,
        basisIds: parseIdList(basis.value),
        hypothesisIds: parseIdList(hypotheses.value),
        propositionIds: parseIdList(propositions.value),
        rationale: rationale.value.trim(),
      };
      if (!stringValue(record.text)) return;
      if (commitCollection("assumptions", record, editing ? "Assumption updated." : "Assumption added.")) {
        editingAssumptionId = "";
        render();
      }
    });
    cancel.addEventListener("click", () => {
      editingAssumptionId = "";
      render();
    });
    root.append(form);

    const list = createElement("div", "investigation-card-list");
    for (const assumption of assumptions) {
      const card = createElement("article", "investigation-card");
      const heading = createElement("div", "investigation-card-heading");
      heading.append(
        createElement("strong", "", labelFor(assumption, recordId(assumption))),
        statusBadge(stringValue(assumption.status)),
      );
      const meta = createElement(
        "p",
        "investigation-card-meta",
        stringValue(assumption.rationale) || "No rationale recorded.",
      );
      const edit = createElement("button", "button ghost compact-button", "Edit");
      edit.type = "button";
      edit.addEventListener("click", () => {
        editingAssumptionId = recordId(assumption);
        render();
      });
      card.append(heading, meta, edit);
      list.append(card);
    }
    root.append(assumptions.length ? list : emptyState("No explicit assumptions recorded."));
  }

  function renderEnquiries(reasoning: Record<string, unknown>): void {
    const root = panels.get("enquiries")!;
    root.replaceChildren();
    const enquiries = collection(reasoning, "linesOfEnquiry");
    const editing = enquiries.find((record) => recordId(record) === editingEnquiryId);

    const form = createElement("form", "investigation-form");
    const textInput = createElement("textarea");
    textInput.rows = 3;
    textInput.required = true;
    textInput.value = stringValue(editing?.text);
    textInput.placeholder = "What should be done or tested?";
    const status = selectControl(
      ["proposed", "active", "completed", "deferred", "not-pursued"],
      stringValue(editing?.status) || "proposed",
      "Line of enquiry status",
    );
    const testType = selectControl(
      ["discover", "discriminate", "corroborate", "falsify"],
      stringValue(editing?.testType) || "discover",
      "Line of enquiry test type",
    );
    const hypotheses = createElement("input");
    hypotheses.type = "text";
    hypotheses.value = stringList(editing?.hypothesisIds).join(", ");
    hypotheses.placeholder = "hyp-alice, hyp-none-known";
    const expected = createElement("textarea");
    expected.rows = 2;
    expected.value = stringValue(editing?.expectedDiscriminator);
    expected.placeholder = "What result would distinguish or falsify an alternative?";
    const rationale = createElement("textarea");
    rationale.rows = 2;
    rationale.value = stringValue(editing?.rationale);
    rationale.placeholder = "Required when deferred or not pursued.";

    const actions = createElement("div", "investigation-form-actions");
    const save = createElement("button", "button primary", editing ? "Update enquiry" : "Add enquiry");
    save.type = "submit";
    const cancel = createElement("button", "button ghost", "Cancel");
    cancel.type = "button";
    cancel.hidden = !editing;
    actions.append(save, cancel);
    form.append(
      field("Line of enquiry", textInput),
      field("Status", status),
      field("Test type", testType),
      field("Hypothesis IDs", hypotheses),
      field("Expected discriminator", expected),
      field("Rationale", rationale),
      actions,
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (["deferred", "not-pursued"].includes(status.value) && !rationale.value.trim()) {
        globalThis.alert?.("Deferred or not-pursued enquiries require a recorded rationale.");
        rationale.focus();
        return;
      }
      const record: ReasoningRecord = {
        ...(editing ?? {}),
        id: editing ? recordId(editing) : uniqueId("enquiry"),
        text: textInput.value.trim(),
        status: status.value,
        testType: testType.value,
        hypothesisIds: parseIdList(hypotheses.value),
        expectedDiscriminator: expected.value.trim(),
        rationale: rationale.value.trim(),
      };
      if (!stringValue(record.text)) return;
      if (commitCollection("linesOfEnquiry", record, editing ? "Line of enquiry updated." : "Line of enquiry added.")) {
        editingEnquiryId = "";
        render();
      }
    });
    cancel.addEventListener("click", () => {
      editingEnquiryId = "";
      render();
    });
    root.append(form);

    const list = createElement("div", "investigation-card-list");
    for (const enquiry of enquiries) {
      const card = createElement("article", "investigation-card");
      const heading = createElement("div", "investigation-card-heading");
      heading.append(
        createElement("strong", "", labelFor(enquiry, recordId(enquiry))),
        statusBadge(stringValue(enquiry.status)),
      );
      card.append(
        heading,
        createElement(
          "p",
          "investigation-card-meta",
          [
            stringValue(enquiry.testType),
            stringValue(enquiry.expectedDiscriminator),
            stringValue(enquiry.rationale),
          ]
            .filter(Boolean)
            .join(" · ") || "No discriminator or rationale recorded.",
        ),
      );
      const edit = createElement("button", "button ghost compact-button", "Edit");
      edit.type = "button";
      edit.addEventListener("click", () => {
        editingEnquiryId = recordId(enquiry);
        render();
      });
      card.append(edit);
      list.append(card);
    }
    root.append(enquiries.length ? list : emptyState("No lines of enquiry recorded."));
  }

  function renderInformationQuality(reasoning: Record<string, unknown>): void {
    const root = panels.get("quality")!;
    root.replaceChildren();
    const records = collection(reasoning, "informationReviews");
    const editing = records.find((record) => recordId(record) === editingInformationReviewId);

    const form = createElement("form", "investigation-form");
    const textInput = createElement("textarea");
    textInput.rows = 2;
    textInput.required = true;
    textInput.value = stringValue(editing?.text);
    textInput.placeholder = "Describe the information-quality finding.";
    const finding = selectControl(
      ["corroborated", "uncorroborated", "conflicted", "limited", "unknown"],
      stringValue(editing?.finding) || "unknown",
      "Information-quality finding",
    );
    const targets = createElement("input");
    targets.type = "text";
    targets.value = stringList(editing?.targetIds).join(", ");
    targets.placeholder = "evidence, source, observation, or assertion IDs";
    const limitations = createElement("textarea");
    limitations.rows = 2;
    limitations.value = stringValue(editing?.limitations);
    limitations.placeholder = "Record source limitations, conflicts, or caveats.";
    const rationale = createElement("textarea");
    rationale.rows = 2;
    rationale.value = stringValue(editing?.rationale);
    rationale.placeholder = "Reason for this qualitative finding.";

    const actions = createElement("div", "investigation-form-actions");
    const save = createElement(
      "button",
      "button primary",
      editing ? "Update quality review" : "Add quality review",
    );
    save.type = "submit";
    const cancel = createElement("button", "button ghost", "Cancel");
    cancel.type = "button";
    cancel.hidden = !editing;
    actions.append(save, cancel);
    form.append(
      field("Finding", textInput),
      field("Assessment", finding),
      field("Target IDs", targets),
      field("Limitations", limitations),
      field("Rationale", rationale),
      actions,
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const record: ReasoningRecord = {
        ...(editing ?? {}),
        id: editing ? recordId(editing) : uniqueId("information-review"),
        text: textInput.value.trim(),
        finding: finding.value,
        targetIds: parseIdList(targets.value),
        limitations: limitations.value.trim(),
        rationale: rationale.value.trim(),
        methodId: "quality-of-information-check",
      };
      if (!stringValue(record.text)) return;
      if (
        commitCollection(
          "informationReviews",
          record,
          editing ? "Information-quality review updated." : "Information-quality review added.",
        )
      ) {
        editingInformationReviewId = "";
        render();
      }
    });
    cancel.addEventListener("click", () => {
      editingInformationReviewId = "";
      render();
    });
    root.append(form);

    const list = createElement("div", "investigation-card-list");
    for (const record of records) {
      const card = createElement("article", "investigation-card");
      const heading = createElement("div", "investigation-card-heading");
      heading.append(
        createElement("strong", "", labelFor(record, recordId(record))),
        statusBadge(stringValue(record.finding)),
      );
      card.append(
        heading,
        createElement(
          "p",
          "investigation-card-meta",
          stringValue(record.limitations) ||
            stringValue(record.rationale) ||
            stringList(record.targetIds).join(", ") ||
            "No limitations recorded.",
        ),
      );
      const recordActions = createElement("div", "investigation-form-actions");
      const edit = createElement("button", "button ghost compact-button", "Edit");
      edit.type = "button";
      edit.addEventListener("click", () => {
        editingInformationReviewId = recordId(record);
        render();
      });
      recordActions.append(edit);
      for (const targetId of stringList(record.targetIds)) {
        const evidence = getEvidenceRecords().find((candidate) => candidate.id === targetId);
        if (!evidence) continue;
        const open = createElement(
          "button",
          "button secondary compact-button",
          `Open ${evidence.title || evidence.id}`,
        );
        open.type = "button";
        open.addEventListener("click", () => onOpenEvidence(evidence.id));
        recordActions.append(open);
      }
      card.append(recordActions);
      list.append(card);
    }
    root.append(records.length ? list : emptyState("No information-quality reviews recorded."));
  }

  function renderIndicators(reasoning: Record<string, unknown>): void {
    const root = panels.get("indicators")!;
    root.replaceChildren();
    const records = collection(reasoning, "indicators");
    const editing = records.find((record) => recordId(record) === editingIndicatorId);
    const temporalScope =
      editing?.temporalScope && typeof editing.temporalScope === "object" && !Array.isArray(editing.temporalScope)
        ? (editing.temporalScope as Record<string, unknown>)
        : {};

    const form = createElement("form", "investigation-form");
    const textInput = createElement("textarea");
    textInput.rows = 2;
    textInput.required = true;
    textInput.value = stringValue(editing?.text);
    textInput.placeholder = "State the observable indicator or signpost.";
    const state = selectControl(
      ["unknown", "observed", "absent"],
      stringValue(editing?.state) || "unknown",
      "Indicator state",
    );
    const observations = createElement("input");
    observations.type = "text";
    observations.value = stringList(editing?.observationIds).join(", ");
    observations.placeholder = "observation IDs";
    const hypotheses = createElement("input");
    hypotheses.type = "text";
    hypotheses.value = stringList(editing?.hypothesisIds).join(", ");
    hypotheses.placeholder = "hypothesis IDs";
    const propositions = createElement("input");
    propositions.type = "text";
    propositions.value = stringList(editing?.propositionIds).join(", ");
    propositions.placeholder = "proposition IDs";
    const start = createElement("input");
    start.type = "text";
    start.value = stringValue(temporalScope.start);
    start.placeholder = "2026-09-26T21:10:00+03:00";
    const end = createElement("input");
    end.type = "text";
    end.value = stringValue(temporalScope.end);
    end.placeholder = "2026-09-26T21:25:00+03:00";

    const actions = createElement("div", "investigation-form-actions");
    const save = createElement(
      "button",
      "button primary",
      editing ? "Update indicator" : "Add indicator",
    );
    save.type = "submit";
    const cancel = createElement("button", "button ghost", "Cancel");
    cancel.type = "button";
    cancel.hidden = !editing;
    actions.append(save, cancel);
    form.append(
      field("Indicator / signpost", textInput),
      field("State", state),
      field("Observation IDs", observations),
      field("Hypothesis IDs", hypotheses),
      field("Proposition IDs", propositions),
      field("Temporal start", start),
      field("Temporal end", end),
      actions,
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const temporalStart = start.value.trim();
      const temporalEnd = end.value.trim();
      const record: ReasoningRecord = {
        ...(editing ?? {}),
        id: editing ? recordId(editing) : uniqueId("indicator"),
        text: textInput.value.trim(),
        state: state.value,
        observationIds: parseIdList(observations.value),
        hypothesisIds: parseIdList(hypotheses.value),
        propositionIds: parseIdList(propositions.value),
        temporalScope:
          temporalStart || temporalEnd
            ? { ...(temporalStart ? { start: temporalStart } : {}), ...(temporalEnd ? { end: temporalEnd } : {}) }
            : null,
      };
      if (!stringValue(record.text)) return;
      if (
        commitCollection(
          "indicators",
          record,
          editing ? "Indicator updated." : "Indicator added.",
        )
      ) {
        editingIndicatorId = "";
        render();
      }
    });
    cancel.addEventListener("click", () => {
      editingIndicatorId = "";
      render();
    });
    root.append(form);

    const list = createElement("div", "investigation-card-list");
    for (const record of records) {
      const card = createElement("article", "investigation-card");
      const heading = createElement("div", "investigation-card-heading");
      heading.append(
        createElement("strong", "", labelFor(record, recordId(record))),
        statusBadge(stringValue(record.state)),
      );
      const context = [
        stringList(record.observationIds).length
          ? `observations: ${stringList(record.observationIds).join(", ")}`
          : "",
        contextSummary(record),
      ]
        .filter(Boolean)
        .join(" · ");
      card.append(
        heading,
        createElement(
          "p",
          "investigation-card-meta",
          context || "No linked observation or context recorded.",
        ),
      );
      const edit = createElement("button", "button ghost compact-button", "Edit");
      edit.type = "button";
      edit.addEventListener("click", () => {
        editingIndicatorId = recordId(record);
        render();
      });
      card.append(edit);
      list.append(card);
    }
    root.append(records.length ? list : emptyState("No indicators or signposts recorded."));
  }

  function render(): void {
    const reasoning = normalized();
    renderMatrix(reasoning);
    renderReview(reasoning);
    renderAssumptions(reasoning);
    renderEnquiries(reasoning);
    renderInformationQuality(reasoning);
    renderIndicators(reasoning);
    setPanel(activePanel);
  }

  function setOpen(next: boolean): void {
    open = Boolean(next);
    sheet.hidden = !open;
    sheet.setAttribute("aria-hidden", String(!open));
    toggle.setAttribute("aria-expanded", String(open));
    shell.dataset.investigationOpen = String(open);
    if (open) {
      render();
      requestAnimationFrame(() => {
        tabButtons.find((button) => button.dataset.investigationPanel === activePanel)?.focus({
          preventScroll: true,
        });
      });
    }
  }

  toggle.addEventListener("click", () => onRequestOpen(!open));
  close.addEventListener("click", () => onRequestOpen(false));
  for (const button of tabButtons) {
    button.addEventListener("click", () => setPanel(button.dataset.investigationPanel || "matrix"));
  }
  sheet.addEventListener("keydown", (event) => {
    if (event.key === "Escape") onRequestOpen(false);
  });

  setPanel(activePanel);

  return {
    toggle,
    sheet,
    setOpen,
    render,
    destroy() {
      toggle.remove();
      sheet.remove();
    },
  };
}
