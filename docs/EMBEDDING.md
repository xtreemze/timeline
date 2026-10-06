# Embedding Lūm projections

Lūm ships a browser-native embed bundle for projects that want to present their own chronology or relationship data without mounting the Lūm application shell.

## Release artifact

Tagged releases publish `luum-embed-<version>.zip`. The archive contains:

- `luum-embed.js` — self-registering ES module.
- `luum-embed.d.ts` — public TypeScript contract.
- `README.md` — the embedding contract for that release.
- `SHA256SUMS` — checksums for the release payload.

The browser module registers these custom elements:

- `<luum-embed-timeline>`
- `<luum-embed-graph>`

They are standard custom elements implemented with Lit. Consumers do not need React, Solid, Vue, or the Lūm application shell.

## Minimal usage

```html
<script type="module" src="./luum-embed.js"></script>

<luum-embed-timeline id="history"></luum-embed-timeline>

<script type="module">
  const timeline = document.querySelector("#history");
  timeline.items = [
    { id: "o-1", timeLabel: "1843", label: "Notes published" },
    { id: "o-2", timeLabel: "1852", label: "Translation circulated" }
  ];

  timeline.addEventListener("luum-embed-select", (event) => {
    console.log(event.detail.kind, event.detail.id);
  });
</script>
```

Graph data is supplied as canonical host-owned ids plus disposable presentation coordinates:

```js
const graph = document.querySelector("luum-embed-graph");
graph.nodes = [
  { id: "ada", label: "Ada Lovelace", position: { x: 28, y: 50 } },
  { id: "engine", label: "Analytical Engine", position: { x: 72, y: 50 } }
];
graph.edges = [
  { id: "described", sourceId: "ada", targetId: "engine", label: "described" }
];
```

## Using a Lūm file

A Lūm project remains the source of truth. Embeds are projections; they must not mutate canonical entity, occurrence, place, evidence, or story records. A host that loads a Lūm project should project the active records into the small public embed contracts above.

For a timeline, use occurrence identity for `id`; derive `timeLabel` from the occurrence's canonical temporal evidence; and use the occurrence/action label as `label`.

For a graph, use canonical entity ids for node ids. Relationship/occurrence ids remain edge ids. Layout coordinates are presentation-only and must never be written back as geographic or temporal evidence.

The embed API deliberately accepts projected data instead of owning file persistence. This keeps embeds safe for read-only articles, documentation pages, dashboards, static sites, and apps with their own storage or Lūm-file loading strategy.

## Styling

The components use Shadow DOM and expose CSS custom properties and parts. Host pages can set:

```css
luum-embed-timeline,
luum-embed-graph {
  --luum-embed-font: system-ui, sans-serif;
  --luum-embed-paper: Canvas;
  --luum-embed-ink: CanvasText;
  --luum-embed-muted: GrayText;
  --luum-embed-accent: #236f5e;
  --luum-embed-focus: #1d6d5d;
  --luum-embed-radius: 0.5rem;
  --luum-embed-shadow: none;
}
```

Public parts are `surface`, `rail`, `item`, `time`, `label`, `detail` for the timeline and `surface`, `edge`, `edge-label`, `node`, `node-label`, `node-detail` for the graph.

## Compatibility contract

The v0.3 embed contract is framework-neutral, browser-native, and read-only with respect to canonical Lūm data. Selection is communicated with the bubbling/composed `luum-embed-select` event. Minor releases may add optional fields, CSS variables, parts, or elements; removing or changing existing public fields/events requires a major version.
