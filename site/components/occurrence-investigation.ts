import { LitElement, css, html, nothing } from "lit";
import {
  buildAssumptionDraft,
  buildDisconfirmationEnquiryDraft,
  buildIdentityHypothesisDrafts,
  buildInformationReviewDraft,
  buildLineOfEnquiryDraft,
  buildQuestionDraft,
  interpretInvestigativeQualifier,
  projectInvestigativeCandidateMatrix,
  type InvestigativeInterpretation,
} from "../../src/application/investigative-query.ts";
import type {
  ComposerEntityOption,
  OccurrenceInvestigativeQualifier,
} from "../occurrence-composer-model.ts";

export interface OccurrenceInvestigationActionDetail {
  readonly action:
    | "ask-question"
    | "compare-candidates"
    | "add-assumption"
    | "create-enquiry"
    | "disconfirm"
    | "review-information";
  readonly qualifierId: string;
  readonly collection: string | null;
  readonly records: readonly Record<string, unknown>[];
  readonly sourceText: string;
}

export class LuumOccurrenceInvestigationElement extends LitElement {
  static override styles = css`
    :host {
      display: block;
      min-inline-size: 0;
    }

    .investigation-panel {
      display: grid;
      gap: 0.55rem;
      min-block-size: 0;
      max-block-size: min(22rem, var(--composer-completion-max-height, 42dvh));
      overflow: auto;
      padding: 0.55rem;
      border-block-end: 1px solid var(--line, #d1ccc4);
      background: color-mix(in srgb, var(--paper, #fff) 98%, transparent);
    }

    .heading {
      margin: 0;
      color: var(--muted, #615d56);
      font-size: 0.68rem;
      font-weight: 760;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .qualifiers,
    .interpretations,
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    button {
      min-block-size: 44px;
      padding: 0.4rem 0.6rem;
      border: 1px solid var(--line, #d1ccc4);
      border-radius: 0.5rem;
      background: var(--paper, #fff);
      color: inherit;
      font: inherit;
      cursor: pointer;
      touch-action: manipulation;
    }

    button:is(:hover, :focus-visible) {
      border-color: var(--line-strong, #b8b1a5);
      outline: none;
    }

    .investigation-qualifier[aria-current="true"],
    .investigation-interpretation[aria-pressed="true"] {
      border-color: var(--focus, #315fbd);
      background: color-mix(in srgb, var(--focus, #315fbd) 9%, var(--paper, #fff));
    }

    .candidates {
      display: grid;
      gap: 0.3rem;
    }

    .investigation-candidate {
      display: grid;
      grid-template-columns: minmax(7rem, 0.8fr) minmax(0, 2fr);
      gap: 0.5rem;
      align-items: start;
      padding: 0.45rem 0.5rem;
      border: 1px solid var(--line, #d1ccc4);
      border-radius: 0.5rem;
      background: color-mix(in srgb, var(--paper, #fff) 96%, transparent);
    }

    .states {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .investigation-state {
      border-radius: 999px;
      padding: 0.18rem 0.4rem;
      background: var(--panel, #f5f3ef);
      font-size: 0.66rem;
    }

    .investigation-state[data-assessment="consistent"] {
      font-weight: 700;
    }

    .investigation-state[data-assessment="contradicts"] {
      text-decoration: line-through;
    }

    .investigation-state[data-assessment="unknown"] {
      color: var(--muted, #615d56);
    }

    .hint {
      margin: 0;
      color: var(--muted, #615d56);
      font-size: 0.72rem;
    }

    @media (max-width: 480px) {
      .investigation-candidate {
        grid-template-columns: 1fr;
      }
    }
  `;

  private qualifiers: readonly OccurrenceInvestigativeQualifier[] = Object.freeze([]);
  private entities: readonly ComposerEntityOption[] = Object.freeze([]);
  private sourceText = "";
  private activeQualifierId = "";
  private interpretationIds = new Map<string, string>();

  setInvestigation(input: {
    qualifiers: readonly OccurrenceInvestigativeQualifier[];
    entities: readonly ComposerEntityOption[];
    sourceText: string;
    activeQualifierId?: string | null;
  }): void {
    this.qualifiers = Object.freeze([...input.qualifiers]);
    this.entities = Object.freeze([...input.entities]);
    this.sourceText = input.sourceText;
    const requested = input.activeQualifierId ?? "";
    this.activeQualifierId =
      this.qualifiers.some((qualifier) => qualifier.id === requested)
        ? requested
        : this.qualifiers[0]?.id ?? "";
    const validIds = new Set(this.qualifiers.map((qualifier) => qualifier.id));
    for (const id of this.interpretationIds.keys()) {
      if (!validIds.has(id)) this.interpretationIds.delete(id);
    }
    this.requestUpdate();
  }

  private activeQualifier(): OccurrenceInvestigativeQualifier | null {
    return (
      this.qualifiers.find((qualifier) => qualifier.id === this.activeQualifierId) ??
      this.qualifiers[0] ??
      null
    );
  }

  private interpretations(
    qualifier: OccurrenceInvestigativeQualifier,
  ): readonly InvestigativeInterpretation[] {
    return interpretInvestigativeQualifier(
      {
        id: qualifier.id,
        section: qualifier.section,
        text: qualifier.normalizedText,
      },
      {
        entities: this.entities.map((entity) => ({
          id: entity.id,
          name: entity.name,
          type: entity.type,
          alternateNames: entity.alternateNames,
          attributes: entity.attributes,
        })),
      },
    );
  }

  private projectedQualifiers() {
    return this.qualifiers.flatMap((qualifier) => {
      const selected = this.interpretationIds.get(qualifier.id);
      if (!selected) return [];
      const interpretation = this.interpretations(qualifier).find(
        (candidate) => candidate.id === selected,
      );
      return interpretation ? [{ id: qualifier.id, interpretation }] : [];
    });
  }

  private selectQualifier(qualifier: OccurrenceInvestigativeQualifier): void {
    this.activeQualifierId = qualifier.id;
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent("investigativequalifierselect", {
        bubbles: true,
        composed: true,
        detail: {
          id: qualifier.id,
          start: qualifier.start,
          end: qualifier.end,
        },
      }),
    );
  }

  private selectInterpretation(
    qualifier: OccurrenceInvestigativeQualifier,
    interpretation: InvestigativeInterpretation,
  ): void {
    this.interpretationIds.set(qualifier.id, interpretation.id);
    this.requestUpdate();
  }

  private dispatchAction(
    action: OccurrenceInvestigationActionDetail["action"],
    qualifier: OccurrenceInvestigativeQualifier,
    matrix: ReturnType<typeof projectInvestigativeCandidateMatrix> | null,
  ): void {
    const baseId =
      qualifier.id.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "") || "clue";
    const clue = qualifier.normalizedText || qualifier.rawText;
    let collection: string | null = null;
    let records: readonly Record<string, unknown>[] = [];

    if (action === "ask-question") {
      collection = "questions";
      records = [
        buildQuestionDraft({
          id: `question-${baseId}`,
          text:
            qualifier.section === "sentence"
              ? this.sourceText.trim()
              : `What does “${clue}” establish?`,
        }),
      ];
    } else if (action === "add-assumption") {
      collection = "assumptions";
      records = [
        buildAssumptionDraft({
          id: `assumption-${baseId}`,
          text: `Assume “${clue}” has the selected investigative meaning.`,
          rationale: "Created explicitly from an unresolved composer qualifier.",
        }),
      ];
    } else if (action === "create-enquiry") {
      collection = "linesOfEnquiry";
      records = [
        buildLineOfEnquiryDraft({
          id: `enquiry-${baseId}`,
          text: `Investigate the unresolved clue “${clue}”.`,
          testType: "discriminate",
          expectedDiscriminator: `Material that distinguishes plausible interpretations of “${clue}”.`,
        }),
      ];
    } else if (action === "disconfirm") {
      collection = "linesOfEnquiry";
      records = [
        buildDisconfirmationEnquiryDraft({
          id: `enquiry-disconfirm-${baseId}`,
          text: `Seek material that would disconfirm the current interpretation of “${clue}”.`,
          expectedDiscriminator: `Evidence inconsistent with the selected interpretation of “${clue}”.`,
        }),
      ];
    } else if (action === "review-information") {
      collection = "informationReviews";
      records = [
        buildInformationReviewDraft({
          id: `information-review-${baseId}`,
          text: `Review the information quality supporting “${clue}”.`,
          targetIds: [],
          finding: "unknown",
        }),
      ];
    } else if (action === "compare-candidates" && matrix) {
      const known = matrix.candidates
        .filter((candidate) => candidate.candidateEntityId)
        .map((candidate) => ({
          entityId: candidate.candidateEntityId!,
          label: candidate.label,
        }));
      records = buildIdentityHypothesisDrafts({
        unknownEntityId: `unknown-${baseId}`,
        candidates: known,
      });
    }

    this.dispatchEvent(
      new CustomEvent<OccurrenceInvestigationActionDetail>("occurrenceinvestigationaction", {
        bubbles: true,
        composed: true,
        detail: {
          action,
          qualifierId: qualifier.id,
          collection,
          records,
          sourceText: this.sourceText,
        },
      }),
    );
  }

  override render() {
    const active = this.activeQualifier();
    if (!active) return nothing;
    const interpretations = this.interpretations(active);
    const projected = this.projectedQualifiers();
    const matrix = projected.length
      ? projectInvestigativeCandidateMatrix({
          entities: this.entities.map((entity) => ({
            id: entity.id,
            name: entity.name,
            type: entity.type,
            alternateNames: entity.alternateNames,
            attributes: entity.attributes,
          })),
          qualifiers: projected,
          limit: 12,
        })
      : null;

    return html`
      <section
        id="occurrence-composer-investigation"
        class="investigation-panel"
        aria-label="Investigative ambiguity"
      >
        <p class="heading">Unresolved clues</p>
        <div class="qualifiers">
          ${this.qualifiers.map(
            (qualifier) => html`
              <button
                class="investigation-qualifier"
                type="button"
                data-investigative-qualifier-id=${qualifier.id}
                aria-current=${String(qualifier.id === active.id)}
                @click=${() => this.selectQualifier(qualifier)}
              >
                ${qualifier.normalizedText || qualifier.rawText} ?
              </button>
            `,
          )}
        </div>

        <p class="heading">Possible meanings</p>
        <div class="interpretations">
          ${interpretations.map(
            (interpretation) => html`
              <button
                class="investigation-interpretation"
                type="button"
                aria-pressed=${String(
                  this.interpretationIds.get(active.id) === interpretation.id,
                )}
                @click=${() => this.selectInterpretation(active, interpretation)}
              >
                ${interpretation.label}
              </button>
            `,
          )}
        </div>

        ${matrix
          ? html`
              <p class="heading">Candidates · consistent / contradicts / unknown</p>
              <div class="candidates" aria-label="Investigative candidates">
                ${matrix.candidates.map(
                  (candidate) => html`
                    <div class="investigation-candidate">
                      <strong>${candidate.label}</strong>
                      <div class="states">
                        ${candidate.cells.map(
                          (cell) => html`
                            <span
                              class="investigation-state"
                              data-assessment=${cell.assessment}
                              title=${cell.reason}
                            >${cell.assessment}</span>
                          `,
                        )}
                      </div>
                    </div>
                  `,
                )}
              </div>
            `
          : html`<p class="hint">
              Choose a possible meaning before comparing known candidates.
            </p>`}

        <p class="heading">Method actions</p>
        <div class="actions">
          <button
            class="investigation-action"
            type="button"
            @click=${() => this.dispatchAction("ask-question", active, matrix)}
          >Ask this question</button>
          <button
            class="investigation-action"
            type="button"
            ?disabled=${!matrix}
            @click=${() => this.dispatchAction("compare-candidates", active, matrix)}
          >Compare candidates</button>
          <button
            class="investigation-action"
            type="button"
            @click=${() => this.dispatchAction("add-assumption", active, matrix)}
          >Add assumption</button>
          <button
            class="investigation-action"
            type="button"
            @click=${() => this.dispatchAction("create-enquiry", active, matrix)}
          >Create enquiry</button>
          <button
            class="investigation-action"
            type="button"
            @click=${() => this.dispatchAction("disconfirm", active, matrix)}
          >What would disconfirm this?</button>
          <button
            class="investigation-action"
            type="button"
            @click=${() => this.dispatchAction("review-information", active, matrix)}
          >Review information quality</button>
        </div>
      </section>
    `;
  }
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("luum-occurrence-investigation")
) {
  customElements.define("luum-occurrence-investigation", LuumOccurrenceInvestigationElement);
}
