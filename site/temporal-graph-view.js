(() => {
  "use strict";

  const graph = globalThis.TimelineGraph;
  const orbFactory = globalThis.TimelineOrbGraph;
  if (!graph) throw new Error("TimelineGraph must load before TemporalGraphView.");
  if (!orbFactory) throw new Error("Build the bundled Orb graph before loading TemporalGraphView.");

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

  function topologySignature(data) {
    return JSON.stringify({
      nodes: data.nodes.map((node) => String(node.id)).sort(),
      edges: data.edges
        .map((edge) => [String(edge.id), String(edge.start), String(edge.end)])
        .sort((a, b) => a[0].localeCompare(b[0]))
    });
  }

  class TemporalGraphView {
    constructor(root) {
      this.root = root;
      this.canvas = root.querySelector(".temporal-graph-canvas");
      this.status =
        root.querySelector("[data-graph-status]") ||
        root.closest(".graph-lens")?.querySelector("[data-graph-status]") ||
        null;
      this.windowLabel = root.querySelector("[data-graph-window]");
      this.detail = root.querySelector("[data-graph-detail]");
      this.model = { entities: [], relationships: [], items: [], stories: [] };
      this.viewport = null;
      this.signature = "";
      this.orb = orbFactory.create(this.canvas, {
        onNodeClick: (node) => this.activateNode(node),
        onEdgeClick: (edge) => {
          this.renderDetail("edge", edge);
          this.root.dispatchEvent(new CustomEvent("graphedgefocus", {
            bubbles: true,
            detail: { id: edge.id }
          }));
        },
        onSimulationState: (state) => this.renderSimulationState(state)
      });
    }

    renderSimulationState(state) {
      if (!this.status) return;
      const suffix = state.running
        ? " · arranging"
        : state.durationMs
          ? ` · settled ${Math.round(state.durationMs)} ms`
          : "";
      this.status.dataset.simulationMode = state.mode || "worker-cpu";
      this.status.dataset.simulationRunning = String(Boolean(state.running));
      const countText = this.status.dataset.edgeCount || "0 / 0 edges active";
      this.status.textContent = `${countText} · ${state.mode || "worker-cpu"}${suffix}`;
    }

    setModel(model) {
      this.model = {
        entities: Array.isArray(model?.entities) ? model.entities : [],
        relationships: Array.isArray(model?.relationships) ? model.relationships : [],
        items: Array.isArray(model?.items) ? model.items : [],
        stories: Array.isArray(model?.stories) ? model.stories : []
      };
      this.render();
    }

    setWindow(viewport) {
      this.viewport = viewport && Number.isFinite(viewport.start) && Number.isFinite(viewport.end)
        ? { start: viewport.start, end: viewport.end }
        : null;
      this.render();
    }

    resetView() {
      this.orb.recenter();
    }

    refreshLayout() {
      this.orb.recenter();
    }

    activateNode(node) {
      this.renderDetail("node", node);
      const type = node.properties?.timelineType;
      if (type === "chronology-item") {
        this.root.dispatchEvent(new CustomEvent("graphnodefocus", {
          bubbles: true,
          detail: { id: node.id }
        }));
      } else if (type === "story") {
        this.root.dispatchEvent(new CustomEvent("graphstoryfocus", {
          bubbles: true,
          detail: { id: node.id }
        }));
      } else {
        this.root.dispatchEvent(new CustomEvent("graphentityfocus", {
          bubbles: true,
          detail: { id: node.id }
        }));
      }
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
      const countText = `${activeEdges.length} / ${data.edges.length} edges active`;
      if (this.status) {
        this.status.dataset.edgeCount = countText;
        this.status.textContent = `${countText} · ${this.orb.getMode()}`;
      }
      if (this.windowLabel) this.windowLabel.textContent = formatWindow(this.viewport);

      const nextSignature = topologySignature(data);
      if (nextSignature !== this.signature) {
        this.signature = nextSignature;
        this.orb.setData(data);
      } else {
        this.orb.updateTemporalEdges(data.edges);
      }
    }
  }

  function create(root) {
    if (!root) return null;
    return new TemporalGraphView(root);
  }

  globalThis.TemporalGraphView = Object.freeze({ create });
})();
