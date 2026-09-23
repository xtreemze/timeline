export type TemporalConstraintKind =
  | "before"
  | "after"
  | "overlaps"
  | "not-overlaps"
  | "contains"
  | "within-after";

export type TemporalConstraintMode = "validation" | "planning";
export type TemporalConstraintStatus = "satisfied" | "violated" | "indeterminate";

export interface TemporalConstraint {
  readonly id: string;
  readonly leftId: string;
  readonly rightId: string;
  readonly kind: TemporalConstraintKind;
  readonly mode: TemporalConstraintMode;
  readonly maxDeltaMs?: number;
  readonly rationale?: string;
}

export interface TemporalEnvelope {
  readonly id: string;
  readonly earliestStart: number;
  readonly latestStart: number;
  readonly earliestEnd: number;
  readonly latestEnd: number;
}

export interface TemporalConstraintEvaluation {
  readonly constraintId: string;
  readonly status: TemporalConstraintStatus;
  readonly reason: string;
}

export interface TemporalConstraintGraphFinding {
  readonly kind: "cycle";
  readonly constraintIds: readonly string[];
  readonly recordIds: readonly string[];
}

function finite(value: number): boolean {
  return Number.isFinite(value);
}

export function validateTemporalEnvelope(envelope: TemporalEnvelope): readonly string[] {
  const findings: string[] = [];
  if (!envelope.id.trim()) findings.push("Temporal envelope ID is required.");
  if (
    !finite(envelope.earliestStart) ||
    !finite(envelope.latestStart) ||
    !finite(envelope.earliestEnd) ||
    !finite(envelope.latestEnd)
  ) {
    findings.push("Temporal envelope bounds must be finite.");
    return Object.freeze(findings);
  }
  if (envelope.latestStart < envelope.earliestStart) {
    findings.push("Temporal envelope start bounds are inverted.");
  }
  if (envelope.latestEnd < envelope.earliestEnd) {
    findings.push("Temporal envelope end bounds are inverted.");
  }
  if (envelope.earliestEnd < envelope.earliestStart) {
    findings.push("Temporal envelope earliest end precedes earliest start.");
  }
  if (envelope.latestEnd < envelope.latestStart) {
    findings.push("Temporal envelope latest end precedes latest start.");
  }
  return Object.freeze(findings);
}

export function validateTemporalConstraint(
  constraint: TemporalConstraint,
): readonly string[] {
  const findings: string[] = [];
  if (!constraint.id.trim()) findings.push("Temporal constraint ID is required.");
  if (!constraint.leftId.trim() || !constraint.rightId.trim()) {
    findings.push("Temporal constraint requires two record references.");
  }
  if (constraint.leftId === constraint.rightId) {
    findings.push("Temporal constraint cannot reference the same record on both sides.");
  }
  if (
    constraint.kind === "within-after" &&
    (!finite(constraint.maxDeltaMs ?? Number.NaN) || (constraint.maxDeltaMs ?? -1) < 0)
  ) {
    findings.push("within-after requires a non-negative maxDeltaMs.");
  }
  if (constraint.kind !== "within-after" && constraint.maxDeltaMs !== undefined) {
    findings.push("maxDeltaMs is only valid for within-after constraints.");
  }
  return Object.freeze(findings);
}

function evaluateBefore(
  left: TemporalEnvelope,
  right: TemporalEnvelope,
): TemporalConstraintStatus {
  if (left.latestEnd <= right.earliestStart) return "satisfied";
  if (left.earliestEnd > right.latestStart) return "violated";
  return "indeterminate";
}

function evaluateOverlap(
  left: TemporalEnvelope,
  right: TemporalEnvelope,
): TemporalConstraintStatus {
  const definitelyDisjoint =
    left.latestEnd < right.earliestStart || right.latestEnd < left.earliestStart;
  if (definitelyDisjoint) return "violated";

  const definitelyOverlap =
    left.latestStart <= right.earliestEnd && right.latestStart <= left.earliestEnd;
  return definitelyOverlap ? "satisfied" : "indeterminate";
}

function evaluateContains(
  left: TemporalEnvelope,
  right: TemporalEnvelope,
): TemporalConstraintStatus {
  const definitelyContains =
    left.latestStart <= right.earliestStart && left.earliestEnd >= right.latestEnd;
  if (definitelyContains) return "satisfied";

  const definitelyCannotContain =
    left.earliestStart > right.latestStart || left.latestEnd < right.earliestEnd;
  return definitelyCannotContain ? "violated" : "indeterminate";
}

function evaluateWithinAfter(
  left: TemporalEnvelope,
  right: TemporalEnvelope,
  maxDeltaMs: number,
): TemporalConstraintStatus {
  const minimumDelay = right.earliestStart - left.latestEnd;
  const maximumDelay = right.latestStart - left.earliestEnd;

  if (minimumDelay >= 0 && maximumDelay <= maxDeltaMs) return "satisfied";
  if (right.latestStart < left.earliestEnd || minimumDelay > maxDeltaMs) {
    return "violated";
  }
  return "indeterminate";
}

function statusReason(
  kind: TemporalConstraintKind,
  status: TemporalConstraintStatus,
): string {
  if (status === "indeterminate") {
    return "Temporal uncertainty does not establish whether the constraint is satisfied.";
  }
  return `Constraint ${kind} is ${status} by the supplied temporal envelopes.`;
}

export function evaluateTemporalConstraint(
  constraint: TemporalConstraint,
  left: TemporalEnvelope | null,
  right: TemporalEnvelope | null,
): TemporalConstraintEvaluation {
  const constraintFindings = validateTemporalConstraint(constraint);
  if (constraintFindings.length) throw new Error(constraintFindings.join(" "));

  if (!left || !right) {
    return Object.freeze({
      constraintId: constraint.id,
      status: "indeterminate" as const,
      reason: "One or both temporal records are missing.",
    });
  }

  const envelopeFindings = [
    ...validateTemporalEnvelope(left),
    ...validateTemporalEnvelope(right),
  ];
  if (envelopeFindings.length) throw new Error(envelopeFindings.join(" "));

  let status: TemporalConstraintStatus;
  switch (constraint.kind) {
    case "before":
      status = evaluateBefore(left, right);
      break;
    case "after":
      status = evaluateBefore(right, left);
      break;
    case "overlaps":
      status = evaluateOverlap(left, right);
      break;
    case "not-overlaps": {
      const overlap = evaluateOverlap(left, right);
      status =
        overlap === "satisfied"
          ? "violated"
          : overlap === "violated"
            ? "satisfied"
            : "indeterminate";
      break;
    }
    case "contains":
      status = evaluateContains(left, right);
      break;
    case "within-after":
      status = evaluateWithinAfter(left, right, constraint.maxDeltaMs ?? 0);
      break;
  }

  return Object.freeze({
    constraintId: constraint.id,
    status,
    reason: statusReason(constraint.kind, status),
  });
}

function orderingEdge(
  constraint: TemporalConstraint,
): readonly [string, string] | null {
  if (constraint.kind === "before" || constraint.kind === "within-after") {
    return [constraint.leftId, constraint.rightId];
  }
  if (constraint.kind === "after") {
    return [constraint.rightId, constraint.leftId];
  }
  return null;
}

export function findTemporalConstraintCycles(
  constraints: readonly TemporalConstraint[],
): readonly TemporalConstraintGraphFinding[] {
  const edges = constraints
    .map((constraint) => ({ constraint, edge: orderingEdge(constraint) }))
    .filter(
      (
        entry,
      ): entry is {
        readonly constraint: TemporalConstraint;
        readonly edge: readonly [string, string];
      } => entry.edge !== null,
    );

  const outgoing = new Map<
    string,
    readonly { readonly to: string; readonly constraintId: string }[]
  >();
  for (const { constraint, edge } of edges) {
    const [from, to] = edge;
    const current = outgoing.get(from) ?? [];
    outgoing.set(
      from,
      Object.freeze([...current, { to, constraintId: constraint.id }]),
    );
  }

  const findings: TemporalConstraintGraphFinding[] = [];
  const visited = new Set<string>();
  const active = new Set<string>();
  const nodeStack: string[] = [];
  const constraintStack: string[] = [];
  const signatures = new Set<string>();

  function visit(recordId: string): void {
    visited.add(recordId);
    active.add(recordId);
    nodeStack.push(recordId);

    for (const edge of outgoing.get(recordId) ?? []) {
      if (!visited.has(edge.to)) {
        constraintStack.push(edge.constraintId);
        visit(edge.to);
        constraintStack.pop();
        continue;
      }
      if (!active.has(edge.to)) continue;

      const startIndex = nodeStack.lastIndexOf(edge.to);
      if (startIndex < 0) continue;
      const recordIds = [...nodeStack.slice(startIndex), edge.to];
      const constraintIds = [
        ...constraintStack.slice(startIndex),
        edge.constraintId,
      ];
      const signature = [...new Set(recordIds)].sort().join("|");
      if (signatures.has(signature)) continue;
      signatures.add(signature);
      findings.push(
        Object.freeze({
          kind: "cycle" as const,
          constraintIds: Object.freeze(constraintIds),
          recordIds: Object.freeze(recordIds),
        }),
      );
    }

    nodeStack.pop();
    active.delete(recordId);
  }

  const nodes = new Set<string>();
  for (const { edge } of edges) {
    nodes.add(edge[0]);
    nodes.add(edge[1]);
  }
  for (const node of [...nodes].sort((left, right) => left.localeCompare(right))) {
    if (!visited.has(node)) visit(node);
  }

  return Object.freeze(findings);
}
