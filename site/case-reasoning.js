(() => {
  "use strict";

  const STAGE_ORDER = Object.freeze([
    "observation",
    "citation",
    "assertion",
    "hypothesis",
    "proposition",
    "analysis",
    "legalIssue",
    "claim",
    "thesis",
    "review"
  ]);

  const COLLECTION_TYPES = Object.freeze({
    observations: "observation",
    citations: "citation",
    assertions: "assertion",
    hypotheses: "hypothesis",
    propositions: "proposition",
    analyses: "analysis",
    legalIssues: "legalIssue",
    claims: "claim",
    theses: "thesis",
    reviews: "review"
  });

  const EDGE_PREDICATES = Object.freeze([
    "producedObservation",
    "supports",
    "contradicts",
    "contextualizes",
    "impeaches",
    "mentions",
    "explains",
    "evaluates",
    "reliesOn",
    "appliesRule",
    "definesRule",
    "governs",
    "opposes",
    "supersedes"
  ]);

  const SUPPORT_PREDICATES = new Set(["supports", "reliesOn", "explains", "evaluates", "appliesRule", "definesRule", "governs", "producedObservation"]);
  const CONTRADICTION_PREDICATES = new Set(["contradicts", "impeaches", "opposes"]);
  const CITATION_RELATIONS = Object.freeze(["supports", "contradicts", "contextualizes", "impeaches", "mentions"]);
  const CITATION_LOCATOR_TYPES = Object.freeze(["page", "bates", "paragraph", "line", "time", "json-pointer", "record-key", "uri-fragment"]);

  const STANDARDS_BASELINE = Object.freeze([
    Object.freeze({ id: "iso-21043-1", edition: "2025", status: "published", scope: "forensic vocabulary" }),
    Object.freeze({ id: "iso-21043-2", edition: "2018", status: "published-revision-in-progress", scope: "recognition, recording, collection, transport and storage of items" }),
    Object.freeze({ id: "iso-21043-3", edition: "2025", status: "published", scope: "forensic analysis" }),
    Object.freeze({ id: "iso-21043-4", edition: "2025", status: "published", scope: "forensic interpretation" }),
    Object.freeze({ id: "iso-21043-5", edition: "2025", status: "published", scope: "forensic reporting" }),
    Object.freeze({ id: "iso-iec-27037", edition: "2012", status: "published", scope: "digital evidence identification, collection, acquisition and preservation" }),
    Object.freeze({ id: "iso-iec-27041", edition: "2015", status: "published", scope: "suitability and adequacy of incident investigative methods" }),
    Object.freeze({ id: "iso-iec-27042", edition: "2015", status: "published", scope: "digital evidence analysis and interpretation" }),
    Object.freeze({ id: "iso-iec-27043", edition: "2015", status: "published-under-review", scope: "incident investigation principles and processes" }),
    Object.freeze({ id: "case-uco", edition: "1.x", status: "community-standard", scope: "cyber-investigation representation and provenance" }),
    Object.freeze({ id: "w3c-prov-o", edition: "2013", status: "recommendation", scope: "generic provenance" })
  ]);

  function text(value, max = 5000) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
  }

  function idList(value) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    const result = [];
    for (const item of value) {
      const id = text(item, 160);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      result.push(id);
    }
    return result;
  }

  function normalizedStatus(value) {
    return text(value, 80) || "unassessed";
  }

  function wholeNumber(value, minimum = 0) {
    if (value === "" || value === null || value === undefined) return null;
    const number = typeof value === "number" ? value : Number(value);
    return Number.isInteger(number) && number >= minimum ? number : null;
  }

  function normalizeCitationLocator(raw) {
    if (!raw || typeof raw !== "object") return null;
    const type = CITATION_LOCATOR_TYPES.includes(raw.type) ? raw.type : "";
    if (!type) return null;
    const locator = { type };
    const label = text(raw.label, 500);
    if (label) locator.label = label;

    if (type === "page") {
      const page = wholeNumber(raw.page ?? raw.start, 1);
      if (page === null) return null;
      locator.page = page;
      const pageEnd = wholeNumber(raw.pageEnd ?? raw.end, 1);
      if (pageEnd !== null && pageEnd >= page) locator.pageEnd = pageEnd;
    } else if (type === "bates") {
      const value = text(raw.value ?? raw.bates, 500);
      if (!value) return null;
      locator.value = value;
      const endValue = text(raw.endValue ?? raw.batesEnd, 500);
      if (endValue) locator.endValue = endValue;
    } else if (type === "paragraph") {
      const value = text(raw.value ?? raw.paragraph, 500);
      if (!value) return null;
      locator.value = value;
    } else if (type === "line") {
      const lineStart = wholeNumber(raw.lineStart ?? raw.start, 1);
      if (lineStart === null) return null;
      locator.lineStart = lineStart;
      const lineEnd = wholeNumber(raw.lineEnd ?? raw.end, 1);
      if (lineEnd !== null && lineEnd >= lineStart) locator.lineEnd = lineEnd;
    } else if (type === "time") {
      const startMs = wholeNumber(raw.startMs ?? raw.start, 0);
      if (startMs === null) return null;
      locator.startMs = startMs;
      const endMs = wholeNumber(raw.endMs ?? raw.end, 0);
      if (endMs !== null && endMs >= startMs) locator.endMs = endMs;
    } else {
      const value = text(raw.value ?? raw.pointer ?? raw.key ?? raw.fragment, 4000);
      if (!value) return null;
      locator.value = value;
    }
    return locator;
  }

  function normalizeRecord(raw, type, index = 0) {
    if (!raw || typeof raw !== "object") return null;
    const id = text(raw.id, 160) || `${type}-${index + 1}`;
    const record = {
      id,
      type,
      text: text(raw.text ?? raw.title ?? raw.description, 12000),
      status: normalizedStatus(raw.status),
      rationale: text(raw.rationale, 12000),
      limitations: text(raw.limitations, 12000),
      authorEntityId: text(raw.authorEntityId ?? raw.recordedByEntityId, 160),
      createdAt: text(raw.createdAt, 80),
      modifiedAt: text(raw.modifiedAt, 80),
      auditRefs: idList(raw.auditRefs),
      sourceIds: idList(raw.sourceIds),
      inputIds: idList(raw.inputIds),
      supersedesIds: idList(raw.supersedesIds ?? raw.supersedes),
      supersededByIds: idList(raw.supersededByIds ?? raw.supersededBy),
      questionIds: idList(raw.questionIds),
      assumptionIds: idList(raw.assumptionIds)
    };

    if (type === "citation") {
      record.assertionId = text(raw.assertionId, 160);
      record.evidenceId = text(raw.evidenceId, 160);
      record.evidenceIds = record.evidenceId ? [record.evidenceId] : [];
      record.relation = CITATION_RELATIONS.includes(raw.relation) ? raw.relation : "mentions";
      record.locator = normalizeCitationLocator(raw.locator);
      record.excerpt = text(raw.excerpt, 24000);
      record.analystNote = text(raw.analystNote ?? raw.note, 12000);
      record.linkageConfidence = text(raw.linkageConfidence ?? raw.confidence, 80);
    } else if (type === "observation") {
      record.evidenceIds = idList(raw.evidenceIds);
      record.methodId = text(raw.methodId, 160);
      record.temporalScope = raw.temporalScope && typeof raw.temporalScope === "object" ? structuredClone(raw.temporalScope) : null;
    } else if (type === "assertion") {
      record.citationIds = idList(raw.citationIds);
      record.itemIds = idList(raw.itemIds ?? (raw.itemId ? [raw.itemId] : []));
      record.issueIds = idList(raw.issueIds);
    } else if (type === "hypothesis") {
      record.observationIds = idList(raw.observationIds);
      record.assertionIds = idList(raw.assertionIds);
      record.assessment = text(raw.assessment, 80) || "open";
    } else if (type === "proposition") {
      record.assertionIds = idList(raw.assertionIds);
      record.level = text(raw.level, 80);
      record.alternativeGroupId = text(raw.alternativeGroupId, 160);
    } else if (type === "analysis") {
      record.mode = text(raw.mode, 80) || "investigative";
      record.observationIds = idList(raw.observationIds);
      record.assertionIds = idList(raw.assertionIds);
      record.hypothesisIds = idList(raw.hypothesisIds);
      record.propositionIds = idList(raw.propositionIds);
      record.methodId = text(raw.methodId, 160);
      record.methodVersion = text(raw.methodVersion, 160);
      record.conditioningInformation = text(raw.conditioningInformation, 12000);
      record.reviewStatus = text(raw.reviewStatus, 80) || "unreviewed";
    } else if (type === "legalIssue") {
      record.authorityIds = idList(raw.authorityIds);
      record.ruleIds = idList(raw.ruleIds);
      record.assertionIds = idList(raw.assertionIds);
      record.analysisIds = idList(raw.analysisIds);
    } else if (type === "claim") {
      record.assertionIds = idList(raw.assertionIds);
      record.analysisIds = idList(raw.analysisIds);
      record.ruleIds = idList(raw.ruleIds);
      record.counterclaimIds = idList(raw.counterclaimIds);
    } else if (type === "thesis") {
      record.claimIds = idList(raw.claimIds);
      record.counterclaimIds = idList(raw.counterclaimIds);
    } else if (type === "review") {
      record.targetIds = idList(raw.targetIds);
      record.reviewerEntityId = text(raw.reviewerEntityId, 160);
      record.decision = text(raw.decision, 80) || "pending";
      record.reviewedAt = text(raw.reviewedAt, 80);
    }

    return record;
  }

  function normalizeCollection(value, type) {
    const source = Array.isArray(value) ? value : [];
    const seen = new Set();
    const records = [];
    source.forEach((raw, index) => {
      const record = normalizeRecord(raw, type, index);
      if (!record || seen.has(record.id)) return;
      seen.add(record.id);
      records.push(record);
    });
    return records;
  }

  function normalizeEdge(raw, index = 0) {
    if (!raw || typeof raw !== "object") return null;
    const fromId = text(raw.fromId, 160);
    const toId = text(raw.toId, 160);
    if (!fromId || !toId) return null;
    const predicate = EDGE_PREDICATES.includes(raw.predicate) ? raw.predicate : "reliesOn";
    return {
      id: text(raw.id, 160) || `reasoning-edge-${index + 1}`,
      fromId,
      toId,
      predicate,
      rationale: text(raw.rationale, 12000),
      authorEntityId: text(raw.authorEntityId, 160),
      createdAt: text(raw.createdAt, 80),
      temporalScope: raw.temporalScope && typeof raw.temporalScope === "object" ? structuredClone(raw.temporalScope) : null
    };
  }

  function normalizeReasoning(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const result = {};
    for (const [collection, type] of Object.entries(COLLECTION_TYPES)) {
      result[collection] = normalizeCollection(source[collection], type);
    }
    const seenEdges = new Set();
    result.edges = [];
    (Array.isArray(source.edges) ? source.edges : []).forEach((rawEdge, index) => {
      const edge = normalizeEdge(rawEdge, index);
      if (!edge || seenEdges.has(edge.id)) return;
      seenEdges.add(edge.id);
      result.edges.push(edge);
    });
    return result;
  }

  function recordsOf(reasoning) {
    const normalized = normalizeReasoning(reasoning);
    const records = [];
    for (const collection of Object.keys(COLLECTION_TYPES)) records.push(...normalized[collection]);
    return records;
  }

  function dependencyIds(record) {
    const fields = [
      "sourceIds", "inputIds", "supersedesIds", "questionIds", "assumptionIds",
      "evidenceIds", "citationIds", "itemIds", "issueIds", "observationIds",
      "assertionIds", "hypothesisIds", "propositionIds", "authorityIds", "ruleIds",
      "analysisIds", "claimIds", "targetIds"
    ];
    const result = [];
    const seen = new Set();
    for (const field of fields) {
      for (const id of idList(record[field])) {
        if (id === record.id || seen.has(id)) continue;
        seen.add(id);
        result.push(id);
      }
    }
    return result;
  }

  function indexReasoning(reasoning, externalIds = []) {
    const normalized = normalizeReasoning(reasoning);
    const records = recordsOf(normalized);
    const recordById = new Map(records.map((record) => [record.id, record]));
    const knownIds = new Set([...recordById.keys(), ...idList(externalIds)]);
    return { normalized, records, recordById, knownIds };
  }

  function incomingEdges(id, normalized) {
    return normalized.edges.filter((edge) => edge.toId === id);
  }

  function traceDependencies(id, reasoning, options = {}) {
    const { normalized, recordById, knownIds } = indexReasoning(reasoning, options.externalIds);
    if (!knownIds.has(id)) return { rootId: id, records: [], externalIds: [], edges: [], missingIds: [id] };

    const visited = new Set();
    const tracedRecords = [];
    const tracedExternalIds = new Set();
    const tracedEdges = [];
    const missingIds = new Set();

    function visit(currentId) {
      if (visited.has(currentId)) return;
      visited.add(currentId);
      const record = recordById.get(currentId);
      if (!record) {
        if (knownIds.has(currentId)) tracedExternalIds.add(currentId);
        else missingIds.add(currentId);
        return;
      }

      tracedRecords.push(record);
      const deps = dependencyIds(record);
      for (const depId of deps) visit(depId);
      for (const edge of incomingEdges(currentId, normalized)) {
        tracedEdges.push(edge);
        visit(edge.fromId);
      }
    }

    visit(id);
    return {
      rootId: id,
      records: tracedRecords,
      externalIds: [...tracedExternalIds].sort(),
      edges: tracedEdges.sort((a, b) => a.id.localeCompare(b.id)),
      missingIds: [...missingIds].sort()
    };
  }

  function summarizeSupport(id, reasoning) {
    const normalized = normalizeReasoning(reasoning);
    const relevant = incomingEdges(id, normalized);
    return {
      supports: relevant.filter((edge) => SUPPORT_PREDICATES.has(edge.predicate)),
      contradicts: relevant.filter((edge) => CONTRADICTION_PREDICATES.has(edge.predicate)),
      contextual: relevant.filter((edge) => !SUPPORT_PREDICATES.has(edge.predicate) && !CONTRADICTION_PREDICATES.has(edge.predicate))
    };
  }

  function collectAssertionCitations(id, reasoning) {
    const normalized = normalizeReasoning(reasoning);
    const assertion = normalized.assertions.find((record) => record.id === id);
    const linkedIds = new Set(assertion?.citationIds || []);
    const citations = normalized.citations.filter((citation) => citation.assertionId === id || linkedIds.has(citation.id));
    return {
      supports: citations.filter((citation) => citation.relation === "supports"),
      contradicts: citations.filter((citation) => ["contradicts", "impeaches"].includes(citation.relation)),
      contextual: citations.filter((citation) => ["contextualizes", "mentions"].includes(citation.relation))
    };
  }

  function detectCycles(records, normalized) {
    const internal = new Set(records.map((record) => record.id));
    const graph = new Map(records.map((record) => [record.id, []]));
    for (const record of records) {
      graph.get(record.id).push(...dependencyIds(record).filter((id) => internal.has(id)));
    }
    for (const edge of normalized.edges) {
      if (edge.predicate === "opposes") continue;
      if (internal.has(edge.fromId) && internal.has(edge.toId)) graph.get(edge.toId).push(edge.fromId);
    }

    const active = new Set();
    const complete = new Set();
    const cycles = [];

    function walk(id, path) {
      if (active.has(id)) {
        const start = path.indexOf(id);
        cycles.push([...path.slice(start), id]);
        return;
      }
      if (complete.has(id)) return;
      active.add(id);
      path.push(id);
      for (const dep of graph.get(id) || []) walk(dep, path);
      path.pop();
      active.delete(id);
      complete.add(id);
    }

    for (const id of graph.keys()) walk(id, []);
    return cycles;
  }

  function validateReasoning(reasoning, options = {}) {
    const { normalized, records, recordById, knownIds } = indexReasoning(reasoning, options.externalIds);
    const findings = [];

    const add = (severity, code, recordId, message) => findings.push({ severity, code, recordId: recordId || "", message });

    for (const record of records) {
      for (const depId of dependencyIds(record)) {
        if (!knownIds.has(depId)) add("error", "broken-reference", record.id, `Reference ${depId} does not resolve.`);
      }

      if (record.type === "citation") {
        const assertion = recordById.get(record.assertionId);
        if (!record.assertionId) {
          add("error", "citation-assertion-missing", record.id, "Citation does not identify an assertion.");
        } else if (!assertion) {
          add("error", "citation-assertion-broken", record.id, `Citation assertion ${record.assertionId} does not resolve.`);
        } else if (assertion.type !== "assertion") {
          add("error", "citation-assertion-type", record.id, "Citation target is not a factual assertion.");
        } else if (!assertion.citationIds.includes(record.id)) {
          add("warning", "citation-backlink-missing", record.id, "Assertion does not include this citation in citationIds.");
        }
        if (!record.evidenceId) add("error", "citation-evidence-missing", record.id, "Citation does not identify evidence.");
        if (!record.locator) add("warning", "citation-locator-missing", record.id, "Citation has no valid pinpoint locator.");
      }
      if (record.type === "assertion") {
        for (const citationId of record.citationIds) {
          const citation = recordById.get(citationId);
          if (citation && citation.type !== "citation") {
            add("error", "assertion-citation-type", record.id, `Reference ${citationId} is not a citation.`);
          } else if (citation?.assertionId && citation.assertionId !== record.id) {
            add("error", "citation-assertion-mismatch", record.id, `Citation ${citationId} points to assertion ${citation.assertionId}.`);
          }
        }
      }

      if (record.type === "hypothesis" && dependencyIds(record).length === 0) {
        add("warning", "unsupported-hypothesis", record.id, "Hypothesis has no linked observations, assertions, sources, or inputs.");
      }
      if (record.type === "analysis" && record.mode === "evaluative" && record.propositionIds.length < 2) {
        add("warning", "evaluative-alternatives-required", record.id, "Evaluative analysis should identify at least two alternative propositions.");
      }
      if (record.type === "claim" && dependencyIds(record).length === 0) {
        add("warning", "unsupported-claim", record.id, "Claim has no linked factual, analytical, rule, or source support.");
      }
      if (record.type === "thesis" && record.claimIds.length === 0) {
        add("warning", "unsupported-thesis", record.id, "Thesis has no linked claims.");
      }
      if (record.type === "legalIssue" && record.ruleIds.length === 0) {
        add("warning", "legal-rule-gap", record.id, "Legal issue has no linked rule or authority-derived rule.");
      }
    }

    for (const edge of normalized.edges) {
      if (!knownIds.has(edge.fromId)) add("error", "broken-edge-source", edge.id, `Edge source ${edge.fromId} does not resolve.`);
      if (!knownIds.has(edge.toId)) add("error", "broken-edge-target", edge.id, `Edge target ${edge.toId} does not resolve.`);
      if (edge.fromId === edge.toId) add("error", "self-edge", edge.id, "Analytical edge cannot point to itself.");
    }

    for (const cycle of detectCycles(records, normalized)) {
      add("error", "provenance-cycle", cycle[0], `Analytical dependency cycle detected: ${cycle.join(" -> ")}`);
    }

    return findings.sort((a, b) =>
      a.severity.localeCompare(b.severity) ||
      a.recordId.localeCompare(b.recordId) ||
      a.code.localeCompare(b.code)
    );
  }

  function orderedRecords(reasoning) {
    const normalized = normalizeReasoning(reasoning);
    const records = recordsOf(normalized);
    const rank = new Map(STAGE_ORDER.map((type, index) => [type, index]));
    const recordById = new Map(records.map((record) => [record.id, record]));
    const outgoing = new Map(records.map((record) => [record.id, new Set()]));
    const indegree = new Map(records.map((record) => [record.id, 0]));

    const compare = (a, b) =>
      (rank.get(a.type) ?? 999) - (rank.get(b.type) ?? 999) ||
      a.id.localeCompare(b.id);

    function link(prerequisiteId, dependentId) {
      if (
        prerequisiteId === dependentId ||
        !recordById.has(prerequisiteId) ||
        !recordById.has(dependentId)
      ) return;
      const dependents = outgoing.get(prerequisiteId);
      if (dependents.has(dependentId)) return;
      dependents.add(dependentId);
      indegree.set(dependentId, indegree.get(dependentId) + 1);
    }

    for (const record of records) {
      for (const dependencyId of dependencyIds(record)) link(dependencyId, record.id);
    }

    for (const edge of normalized.edges) {
      if (edge.predicate === "opposes") continue;
      if (edge.predicate === "supersedes") {
        link(edge.toId, edge.fromId);
      } else {
        link(edge.fromId, edge.toId);
      }
    }

    const ready = records.filter((record) => indegree.get(record.id) === 0).sort(compare);
    const ordered = [];

    while (ready.length) {
      const record = ready.shift();
      ordered.push(record);
      const dependents = [...outgoing.get(record.id)]
        .map((id) => recordById.get(id))
        .sort(compare);
      for (const dependent of dependents) {
        const next = indegree.get(dependent.id) - 1;
        indegree.set(dependent.id, next);
        if (next === 0) {
          ready.push(dependent);
          ready.sort(compare);
        }
      }
    }

    if (ordered.length !== records.length) {
      const emitted = new Set(ordered.map((record) => record.id));
      ordered.push(...records.filter((record) => !emitted.has(record.id)).sort(compare));
    }

    return ordered;
  }

  globalThis.TimelineCaseReasoning = Object.freeze({
    STAGE_ORDER,
    COLLECTION_TYPES,
    EDGE_PREDICATES,
    CITATION_RELATIONS,
    CITATION_LOCATOR_TYPES,
    STANDARDS_BASELINE,
    normalizeCitationLocator,
    normalizeRecord,
    normalizeEdge,
    normalizeReasoning,
    recordsOf,
    dependencyIds,
    traceDependencies,
    summarizeSupport,
    collectAssertionCitations,
    validateReasoning,
    orderedRecords
  });
})();