(() => {
  "use strict";

  const graph = globalThis.TimelineGraph;
  if (!graph) throw new Error("TimelineGraph must load before TemporalGraphView.");

  const SVG_NS = "http://www.w3.org/2000/svg";
  const BASE_WIDTH = 1000;
  const BASE_HEIGHT = 620;

  function svgElement(tag, attrs = {}) {
    const element = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) {
      if (value !== null && value !== undefined) element.setAttribute(name, String(value));
    }
    return element;
  }

  function hash(value) {
    let result = 2166136261;
    for (const char of String(value)) {
      result ^= char.charCodeAt(0);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function layoutGraph(nodes, edges, width = BASE_WIDTH, height = BASE_HEIGHT) {
    const positions = new Map();
    const count = nodes.length;
    if (!count) return positions;
    const radius = Math.min(width, height) * 0.34;
    nodes.forEach((node, index) => {
      const jitter = (hash(node.id) % 1000) / 1000;
      const angle = (index / count) * Math.PI * 2 + jitter * 0.18;
      positions.set(String(node.id), {
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius
      });
    });

    if (count > 160) return positions;

    const edgePairs = edges
      .map((edge) => ({
        sourceId: String(edge.start),
        targetId: String(edge.end),
        source: positions.get(String(edge.start)),
        target: positions.get(String(edge.end))
      }))
      .filter((pair) => pair.source && pair.target);

    for (let iteration = 0; iteration < 90; iteration += 1) {
      const forces = new Map(nodes.map((node) => [String(node.id), { x: 0, y: 0 }]));
      for (let i = 0; i < nodes.length; i += 1) {
        const a = positions.get(String(nodes[i].id));
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = positions.get(String(nodes[j].id));
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          const distanceSquared = Math.max(180, dx * dx + dy * dy);
          const distance = Math.sqrt(distanceSquared);
          const strength = 5600 / distanceSquared;
          dx /= distance;
          dy /= distance;
          const fa = forces.get(String(nodes[i].id));
          const fb = forces.get(String(nodes[j].id));
          fa.x -= dx * strength;
          fa.y -= dy * strength;
          fb.x += dx * strength;
          fb.y += dy * strength;
        }
      }

      for (const pair of edgePairs) {
        let dx = pair.target.x - pair.source.x;
        let dy = pair.target.y - pair.source.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const stretch = (distance - 132) * 0.0028;
        dx /= distance;
        dy /= distance;
        forces.get(pair.sourceId).x += dx * stretch;
        forces.get(pair.sourceId).y += dy * stretch;
        forces.get(pair.targetId).x -= dx * stretch;
        forces.get(pair.targetId).y -= dy * stretch;
      }

      const cooling = 1 - iteration / 100;
      for (const node of nodes) {
        const id = String(node.id);
        const position = positions.get(id);
        const force = forces.get(id);
        force.x += (width / 2 - position.x) * 0.0008;
        force.y += (height / 2 - position.y) * 0.0008;
        position.x = Math.min(width - 56, Math.max(56, position.x + force.x * cooling * 9));
        position.y = Math.min(height - 56, Math.max(56, position.y + force.y * cooling * 9));
      }
    }
    return positions;
  }

  function formatWindow(viewport) {
    if (!viewport) return "All time";
    const formatter = new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    });
    return `${formatter.format(new Date(viewport.start))} – ${formatter.format(new Date(viewport.end))}`;
  }

  class TemporalGraphView {
    constructor(root) {
      this.root = root;
      this.svg = root.querySelector("svg");
      this.status =
        root.querySelector("[data-graph-status]") ||
        root.closest(".graph-lens")?.querySelector("[data-graph-status]") ||
        null;
      this.windowLabel = root.querySelector("[data-graph-window]");
      this.detail = root.querySelector("[data-graph-detail]");
      this.model = { entities: [], relationships: [], items: [], stories: [] };
      this.viewport = null;
      this.positions = new Map();
      this.viewBox = { x: 0, y: 0, width: BASE_WIDTH, height: BASE_HEIGHT };
      this.drag = null;
      this.bind();
    }

    bind() {
      this.svg.addEventListener("wheel", (event) => {
        event.preventDefault();
        const factor = event.deltaY > 0 ? 1.1 : 0.9;
        const nextWidth = Math.min(BASE_WIDTH * 3, Math.max(BASE_WIDTH * 0.35, this.viewBox.width * factor));
        const nextHeight = nextWidth * (BASE_HEIGHT / BASE_WIDTH);
        this.viewBox.x += (this.viewBox.width - nextWidth) / 2;
        this.viewBox.y += (this.viewBox.height - nextHeight) / 2;
        this.viewBox.width = nextWidth;
        this.viewBox.height = nextHeight;
        this.applyViewBox();
      }, { passive: false });

      this.svg.addEventListener("pointerdown", (event) => {
        if (event.target.closest("[data-node-id], [data-edge-id]")) return;
        this.drag = {
          x: event.clientX,
          y: event.clientY,
          viewX: this.viewBox.x,
          viewY: this.viewBox.y
        };
        this.svg.setPointerCapture(event.pointerId);
      });
      this.svg.addEventListener("pointermove", (event) => {
        if (!this.drag) return;
        const rect = this.svg.getBoundingClientRect();
        const dx = (event.clientX - this.drag.x) / Math.max(1, rect.width) * this.viewBox.width;
        const dy = (event.clientY - this.drag.y) / Math.max(1, rect.height) * this.viewBox.height;
        this.viewBox.x = this.drag.viewX - dx;
        this.viewBox.y = this.drag.viewY - dy;
        this.applyViewBox();
      });
      const end = (event) => {
        if (!this.drag) return;
        this.drag = null;
        if (this.svg.hasPointerCapture(event.pointerId)) this.svg.releasePointerCapture(event.pointerId);
      };
      this.svg.addEventListener("pointerup", end);
      this.svg.addEventListener("pointercancel", end);
    }

    applyViewBox() {
      this.svg.setAttribute(
        "viewBox",
        `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`
      );
    }

    setModel(model) {
      this.model = {
        entities: Array.isArray(model?.entities) ? model.entities : [],
        relationships: Array.isArray(model?.relationships) ? model.relationships : [],
        items: Array.isArray(model?.items) ? model.items : [],
        stories: Array.isArray(model?.stories) ? model.stories : []
      };
      const full = graph.toOrbGraph(this.model);
      this.positions = layoutGraph(full.nodes, full.edges);
      this.render();
    }

    setWindow(viewport) {
      this.viewport = viewport && Number.isFinite(viewport.start) && Number.isFinite(viewport.end)
        ? { start: viewport.start, end: viewport.end }
        : null;
      this.render();
    }

    resetView() {
      this.viewBox = { x: 0, y: 0, width: BASE_WIDTH, height: BASE_HEIGHT };
      this.applyViewBox();
    }

    renderDetail(kind, record) {
      this.detail.replaceChildren();
      const title = document.createElement("strong");
      title.textContent = kind === "node" ? record.label : record.label || "relatedTo";
      const meta = document.createElement("span");
      meta.textContent = kind === "node"
        ? record.properties?.timelineType || "entity"
        : `${record.start} → ${record.end}`;
      const pre = document.createElement("pre");
      pre.textContent = JSON.stringify(record.properties || {}, null, 2);
      this.detail.append(title, meta, pre);
    }

    render() {
      const data = graph.graphForWindow(this.model, this.viewport);
      const activeEdges = data.edges.filter((edge) => edge.temporalState !== "inactive");
      const activeNodeIds = new Set();
      for (const edge of activeEdges) {
        activeNodeIds.add(String(edge.start));
        activeNodeIds.add(String(edge.end));
      }

      if (this.status) this.status.textContent = `${activeEdges.length} / ${data.edges.length} edges active`;
      if (this.windowLabel) this.windowLabel.textContent = formatWindow(this.viewport);
      this.svg.replaceChildren();

      const defs = svgElement("defs");
      const marker = svgElement("marker", {
        id: "graph-arrow",
        viewBox: "0 0 10 10",
        refX: "8",
        refY: "5",
        markerWidth: "5",
        markerHeight: "5",
        orient: "auto-start-reverse"
      });
      marker.append(svgElement("path", { d: "M 0 0 L 10 5 L 0 10 z", class: "temporal-graph-arrow" }));
      defs.append(marker);
      this.svg.append(defs);

      for (const edge of data.edges) {
        const source = this.positions.get(String(edge.start));
        const target = this.positions.get(String(edge.end));
        if (!source || !target) continue;
        const group = svgElement("g", {
          class: `temporal-graph-edge is-${edge.temporalState}`,
          "data-edge-id": edge.id,
          tabindex: "0",
          role: "button",
          "aria-label": `${edge.start} ${edge.label} ${edge.end}, ${edge.temporalState}`
        });
        const line = svgElement("line", {
          x1: source.x, y1: source.y, x2: target.x, y2: target.y,
          "marker-end": "url(#graph-arrow)"
        });
        const hit = svgElement("line", {
          x1: source.x, y1: source.y, x2: target.x, y2: target.y,
          class: "temporal-graph-edge-hit"
        });
        const label = svgElement("text", {
          x: (source.x + target.x) / 2,
          y: (source.y + target.y) / 2 - 7,
          class: "temporal-graph-edge-label",
          "text-anchor": "middle"
        });
        label.textContent = edge.label;
        group.append(line, hit, label);
        const activate = () => this.renderDetail("edge", edge);
        group.addEventListener("click", activate);
        group.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activate();
          }
        });
        this.svg.append(group);
      }

      for (const node of data.nodes) {
        const position = this.positions.get(String(node.id));
        if (!position) continue;
        const active = activeNodeIds.has(String(node.id));
        const group = svgElement("g", {
          class: `temporal-graph-node${active ? " is-active" : " is-context"}`,
          transform: `translate(${position.x} ${position.y})`,
          "data-node-id": node.id,
          tabindex: "0",
          role: "button",
          "aria-label": `${node.label}, ${node.properties?.timelineType || "entity"}`
        });
        const circle = svgElement("circle", {
          r: node.properties?.timelineType === "story" ? 22 : node.properties?.timelineType === "chronology-item" ? 18 : 20
        });
        const label = svgElement("text", {
          y: 34,
          class: "temporal-graph-node-label",
          "text-anchor": "middle"
        });
        label.textContent = node.label.length > 28 ? node.label.slice(0, 27) + "…" : node.label;
        group.append(circle, label);
        const activate = () => {
          this.renderDetail("node", node);
          if (node.properties?.timelineType === "chronology-item") {
            this.root.dispatchEvent(new CustomEvent("graphnodefocus", {
              bubbles: true,
              detail: { id: node.id }
            }));
          }
        };
        group.addEventListener("click", activate);
        group.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activate();
          }
        });
        this.svg.append(group);
      }
      this.applyViewBox();
    }
  }

  function create(root) {
    if (!root) return null;
    return new TemporalGraphView(root);
  }

  globalThis.TemporalGraphView = Object.freeze({
    create,
    layoutGraph
  });
})();
