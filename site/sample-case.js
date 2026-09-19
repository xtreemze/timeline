(() => {
  "use strict";

  const SAMPLE_LOCATIONS = {
    stockholm: {
      name: "Stockholm",
      geographicIdentifier: "Stockholm, Sweden",
      address: "",
      geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
      crs: "OGC:CRS84",
      source: "manual"
    },
    copenhagen: {
      name: "Copenhagen",
      geographicIdentifier: "Copenhagen, Denmark",
      address: "",
      geometry: { type: "Point", coordinates: [12.5683, 55.6761] },
      crs: "OGC:CRS84",
      source: "manual"
    },
    malmo: {
      name: "Malmö",
      geographicIdentifier: "Malmö, Sweden",
      address: "",
      geometry: { type: "Point", coordinates: [13.0038, 55.6050] },
      crs: "OGC:CRS84",
      source: "manual"
    }
  };
  
  const SAMPLE = {
    version: VERSION,
    title: "Cross-scale case reconstruction",
    categories: [
      { id: "incident", name: "Incident", color: "#b42318" },
      { id: "witness", name: "Witness / Interview", color: "#7a5af8" },
      { id: "communication", name: "Communication", color: "#2563eb" },
      { id: "evidence", name: "Evidence", color: "#027a48" },
      { id: "document", name: "Document / Record", color: "#667085" },
      { id: "decision", name: "Decision / Action", color: "#b54708" },
      { id: "transaction", name: "Transaction", color: "#0e7090" },
      { id: "observation", name: "Observation", color: "#475467" }
    ],
    evidence: [
      {
        id: "ev-news-1",
        type: "article",
        title: "Public report of the disclosure",
        sourceName: "Demonstration News Desk",
        url: "https://example.org/news/disclosure",
        note: "Supports the claim that the disclosure became public on 19 September 2026.",
        publishedAt: "2026-09-19"
      },
      {
        id: "ev-note-1",
        type: "note",
        title: "Witness interview note",
        sourceName: "Investigation team",
        note: "Contemporaneous note records the witness account and the time at which the document was observed.",
        publishedAt: "2026-09-19T09:20+02:00"
      },
      {
        id: "ev-pdf-1",
        type: "pdf",
        title: "Procurement exhibit",
        sourceName: "Case file",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        note: "Demonstration PDF evidence representing a signed procurement record.",
        publishedAt: "2024-03-04"
      },
      {
        id: "ev-record-1",
        type: "document",
        title: "Audit register extract",
        sourceName: "Internal records",
        url: "https://example.org/records/audit-register",
        note: "Supports the sequence of transaction review and escalation.",
        publishedAt: "2025-11-18"
      },
      {
        id: "ev-note-2",
        type: "note",
        title: "Cross-story synthesis note",
        sourceName: "Case analyst",
        note: "Links the earlier policy change, procurement cycle, investigation, and same-day disclosure without asserting that temporal correlation alone proves causation.",
        publishedAt: "2026-09-20"
      }
    ],
    items: [
      {
        id: "evt-policy-2018", kind: "event", start: "2018-02-12", end: null,
        title: "Policy exception introduced",
        description: "A policy exception establishes the earliest context reused by the long-term institutional story.",
        categoryId: "document", location: SAMPLE_LOCATIONS.stockholm,
        presentation: { variant: "evidence-dossier" },
        evidenceIds: ["ev-note-2"],
        tags: [{ label: "Policy", icon: "evidence", hue: 215 }]
      },
      {
        id: "evt-procedure-2021", kind: "event", start: "2021-10-08", end: null,
        title: "Review procedure revised",
        description: "The review workflow changes, creating a second long-span point of comparison.",
        categoryId: "decision", location: SAMPLE_LOCATIONS.copenhagen,
        presentation: { variant: "editorial-mosaic" },
        evidenceIds: ["ev-note-2"],
        tags: [{ label: "Procedure", icon: "decision", hue: 40 }]
      },
      {
        id: "evt-contract-2024", kind: "event", start: "2024-03-04", end: null,
        title: "Procurement record signed",
        description: "A signed record begins the contract-cycle story and later becomes a referenced exhibit.",
        categoryId: "document", location: SAMPLE_LOCATIONS.malmo,
        presentation: { variant: "hero-split" },
        evidenceIds: ["ev-pdf-1"],
        tags: [{ label: "Contract", icon: "evidence", hue: 145 }]
      },
      {
        id: "evt-payment-2025", kind: "event", start: "2025-04-17T13:10+02:00", end: null,
        title: "Payment released",
        description: "A transaction tied to the procurement record is entered into the chronology.",
        categoryId: "transaction", location: SAMPLE_LOCATIONS.copenhagen,
        presentation: { variant: "editorial-mosaic" },
        evidenceIds: ["ev-pdf-1"],
        tags: [{ label: "Transaction", icon: "relation", hue: 198 }]
      },
      {
        id: "evt-audit-2025", kind: "event", start: "2025-11-18", end: null,
        title: "Audit register flags discrepancy",
        description: "The discrepancy becomes a bridge between the contract-cycle and investigation stories.",
        categoryId: "evidence", location: SAMPLE_LOCATIONS.stockholm,
        presentation: { variant: "evidence-dossier" },
        evidenceIds: ["ev-record-1"],
        tags: [{ label: "Audit", icon: "evidence", hue: 150 }]
      },
      {
        id: "evt-tip-2026", kind: "event", start: "2026-06-02T08:45+02:00", end: null,
        title: "Initial tip received",
        description: "A communication opens the summer investigation.",
        categoryId: "communication", location: SAMPLE_LOCATIONS.malmo,
        presentation: { variant: "hero-split" },
        evidenceIds: ["ev-note-2"],
        tags: [{ label: "Tip", icon: "note", hue: 225 }]
      },
      {
        id: "evt-interviews-2026", kind: "range", start: "2026-07-07", end: "2026-08-26",
        title: "Witness interview period",
        description: "A multi-month range covers interviews across the three recurring locations.",
        categoryId: "witness", location: SAMPLE_LOCATIONS.copenhagen,
        presentation: { variant: "editorial-mosaic" },
        evidenceIds: ["ev-note-1"],
        tags: [{ label: "Witnesses", icon: "person", hue: 285 }]
      },
      {
        id: "evt-document-2026", kind: "event", start: "2026-08-29T15:20+02:00", end: null,
        title: "Document provenance confirmed",
        description: "A record is matched to the earlier procurement exhibit.",
        categoryId: "evidence", location: SAMPLE_LOCATIONS.stockholm,
        presentation: { variant: "evidence-dossier" },
        evidenceIds: ["ev-pdf-1", "ev-record-1"],
        tags: [{ label: "Provenance", icon: "evidence", hue: 155 }]
      },
      {
        id: "evt-alert-day", kind: "event", start: "2026-09-19T08:30+02:00", end: null,
        title: "Internal alert circulated",
        description: "The same-day story begins with an internal alert.",
        categoryId: "communication", location: SAMPLE_LOCATIONS.stockholm,
        presentation: { variant: "hero-split" },
        evidenceIds: ["ev-note-2"],
        tags: [{ label: "Alert", icon: "note", hue: 228 }]
      },
      {
        id: "evt-witness-day", kind: "event", start: "2026-09-19T09:20+02:00", end: null,
        title: "Witness gives corroborating account",
        description: "A witness account adds a contemporaneous human source.",
        categoryId: "witness", location: SAMPLE_LOCATIONS.malmo,
        presentation: { variant: "evidence-dossier" },
        evidenceIds: ["ev-note-1"],
        tags: [{ label: "Witness", icon: "person", hue: 292 }]
      },
      {
        id: "evt-newsroom-day", kind: "event", start: "2026-09-19T11:10+02:00", end: null,
        title: "Newsroom seeks verification",
        description: "External verification connects the public-information group to investigators and organizational staff.",
        categoryId: "communication", location: SAMPLE_LOCATIONS.copenhagen,
        presentation: { variant: "editorial-mosaic" },
        evidenceIds: ["ev-news-1"],
        tags: [{ label: "Verification", icon: "note", hue: 210 }]
      },
      {
        id: "evt-decision-day", kind: "event", start: "2026-09-19T14:45+02:00", end: null,
        title: "Disclosure decision recorded",
        description: "A documented decision precedes publication.",
        categoryId: "decision", location: SAMPLE_LOCATIONS.stockholm,
        presentation: { variant: "hero-split" },
        evidenceIds: ["ev-note-2"],
        tags: [{ label: "Decision", icon: "decision", hue: 35 }]
      },
      {
        id: "evt-publication-day", kind: "event", start: "2026-09-19T17:30+02:00", end: null,
        title: "Public disclosure published",
        description: "The same-day story closes with the public report.",
        categoryId: "incident", location: SAMPLE_LOCATIONS.copenhagen,
        presentation: { variant: "editorial-mosaic" },
        evidenceIds: ["ev-news-1"],
        media: [
          {
            src: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1600&q=80",
            alt: "Newsroom used as demonstration imagery",
            caption: "Editorial-mosaic example for the public disclosure event."
          },
          {
            src: "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1600&q=80",
            alt: "Printed newspapers used as demonstration imagery",
            caption: "Second photograph in the disclosure slideshow."
          },
          {
            src: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1600&q=80",
            alt: "Journalism workspace used as demonstration imagery",
            caption: "Third photograph demonstrates the maximum three-image event slideshow."
          }
        ],
        tags: [{ label: "Disclosure", icon: "milestone", hue: 18 }]
      },
      {
        id: "evt-closure-2026", kind: "event", start: "2026-09-30", end: null,
        title: "Case phase closed",
        description: "The investigation phase closes after the disclosure and source review.",
        categoryId: "decision", location: SAMPLE_LOCATIONS.malmo,
        presentation: { variant: "evidence-dossier" },
        evidenceIds: ["ev-record-1", "ev-note-2"],
        tags: [{ label: "Closure", icon: "decision", hue: 50 }]
      }
    ],
    stories: [
      {
        id: "story-day",
        title: "The day of disclosure",
        description: "Five events within one day, from internal alert to publication.",
        itemIds: ["evt-alert-day","evt-witness-day","evt-newsroom-day","evt-decision-day","evt-publication-day"]
      },
      {
        id: "story-summer",
        title: "Summer investigation",
        description: "A four-month investigation path linking the tip, interviews, provenance work, disclosure and closure.",
        itemIds: ["evt-tip-2026","evt-interviews-2026","evt-document-2026","evt-alert-day","evt-publication-day","evt-closure-2026"]
      },
      {
        id: "story-contract",
        title: "Procurement cycle",
        description: "A twenty-month contract and transaction story.",
        itemIds: ["evt-contract-2024","evt-payment-2025","evt-audit-2025","evt-document-2026"]
      },
      {
        id: "story-reconstruction",
        title: "Two-year reconstruction",
        description: "A cross-story reconstruction from procurement to case closure.",
        itemIds: ["evt-contract-2024","evt-audit-2025","evt-tip-2026","evt-interviews-2026","evt-decision-day","evt-closure-2026"]
      },
      {
        id: "story-institutional",
        title: "Eight-year institutional pattern",
        description: "A long-range narrative connecting policy, procedure, procurement, audit and disclosure.",
        itemIds: ["evt-policy-2018","evt-procedure-2021","evt-contract-2024","evt-audit-2025","evt-document-2026","evt-publication-day"]
      }
    ],
    entities: [
      { id: "group-investigators", type: "group", name: "Investigation team", identifiers: [], attributes: { group: true } },
      { id: "group-organization", type: "group", name: "Organization staff", identifiers: [], attributes: { group: true } },
      { id: "group-public", type: "group", name: "Witnesses and public-information actors", identifiers: [], attributes: { group: true } },
      { id: "person-anna", type: "person", name: "Anna Lind", identifiers: [], attributes: {} },
      { id: "person-bo", type: "person", name: "Bo Eriksen", identifiers: [], attributes: {} },
      { id: "person-clara", type: "person", name: "Clara Holm", identifiers: [], attributes: {} },
      { id: "person-daniel", type: "person", name: "Daniel Berg", identifiers: [], attributes: {} },
      { id: "person-elena", type: "person", name: "Elena Sørensen", identifiers: [], attributes: {} },
      { id: "person-farah", type: "person", name: "Farah Nilsson", identifiers: [], attributes: {} },
      { id: "person-gustav", type: "person", name: "Gustav Møller", identifiers: [], attributes: {} },
      { id: "person-hana", type: "person", name: "Hana Persson", identifiers: [], attributes: {} },
      { id: "person-idris", type: "person", name: "Idris Khan", identifiers: [], attributes: {} }
    ],
    relationships: [
      { id:"r-a-group", subjectId:"person-anna", objectId:"group-investigators", predicate:"memberOf" },
      { id:"r-b-group", subjectId:"person-bo", objectId:"group-investigators", predicate:"memberOf" },
      { id:"r-c-group", subjectId:"person-clara", objectId:"group-investigators", predicate:"memberOf" },
      { id:"r-d-group", subjectId:"person-daniel", objectId:"group-organization", predicate:"memberOf" },
      { id:"r-e-group", subjectId:"person-elena", objectId:"group-organization", predicate:"memberOf" },
      { id:"r-f-group", subjectId:"person-farah", objectId:"group-organization", predicate:"memberOf" },
      { id:"r-g-group", subjectId:"person-gustav", objectId:"group-public", predicate:"memberOf" },
      { id:"r-h-group", subjectId:"person-hana", objectId:"group-public", predicate:"memberOf" },
      { id:"r-i-group", subjectId:"person-idris", objectId:"group-public", predicate:"memberOf" },
      { id:"r-policy", subjectId:"group-organization", objectId:"evt-policy-2018", predicate:"responsibleFor" },
      { id:"r-contract", subjectId:"group-organization", objectId:"evt-contract-2024", predicate:"participant" },
      { id:"r-audit", subjectId:"group-investigators", objectId:"evt-audit-2025", predicate:"reviewed" },
      { id:"r-tip", subjectId:"group-public", objectId:"evt-tip-2026", predicate:"reported" },
      { id:"r-interviews", subjectId:"group-investigators", objectId:"evt-interviews-2026", predicate:"conducted" },
      { id:"r-witness", subjectId:"group-public", objectId:"evt-witness-day", predicate:"participant" },
      { id:"r-verify", subjectId:"group-public", objectId:"evt-newsroom-day", predicate:"verified" },
      { id:"r-decision", subjectId:"group-organization", objectId:"evt-decision-day", predicate:"authorized" },
      { id:"r-publication", subjectId:"group-public", objectId:"evt-publication-day", predicate:"published" },
      { id:"r-story-day-i", subjectId:"group-investigators", objectId:"story-day", predicate:"participatesIn" },
      { id:"r-story-day-o", subjectId:"group-organization", objectId:"story-day", predicate:"participatesIn" },
      { id:"r-story-day-p", subjectId:"group-public", objectId:"story-day", predicate:"participatesIn" },
      { id:"r-story-summer-i", subjectId:"group-investigators", objectId:"story-summer", predicate:"participatesIn" },
      { id:"r-story-summer-p", subjectId:"group-public", objectId:"story-summer", predicate:"participatesIn" },
      { id:"r-story-contract-o", subjectId:"group-organization", objectId:"story-contract", predicate:"participatesIn" },
      { id:"r-story-contract-i", subjectId:"group-investigators", objectId:"story-contract", predicate:"reviews" },
      { id:"r-story-reconstruction-i", subjectId:"group-investigators", objectId:"story-reconstruction", predicate:"participatesIn" },
      { id:"r-story-reconstruction-o", subjectId:"group-organization", objectId:"story-reconstruction", predicate:"subjectOf" },
      { id:"r-story-institutional-o", subjectId:"group-organization", objectId:"story-institutional", predicate:"participatesIn" },
      { id:"r-story-institutional-p", subjectId:"group-public", objectId:"story-institutional", predicate:"observes" },
      { id:"r-bridge", subjectId:"group-investigators", objectId:"group-organization", predicate:"investigated" },
      { id:"r-bridge-public", subjectId:"group-investigators", objectId:"group-public", predicate:"interviewed" }
    ]
  };
  
  
  globalThis.TimelineSampleCase = Object.freeze(SAMPLE);
})();
