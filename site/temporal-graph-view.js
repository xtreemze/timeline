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

  function detailRows(kind, record) {
    const properties = record?.properties || {};
    const rows = [];
    if (kind === "node") {
      if (properties.description) rows.push(["Description", properties.description]);
      if (Array.isArray(properties.identifiers) && properties.identifiers.length) {
        rows.push(["Identifiers", properties.identifiers]);
      }
      if (properties.attributes && Object.keys(properties.attributes).length) {
        rows.push(["Properties", properties.attributes]);
      }
      if (properties.time) rows.push(["Time", properties.time]);
      if (properties.location) rows.push(["Place", properties.location]);
      if (Array.isArray(properties.itemIds) && properties.itemIds.length) {
        rows.push(["Events", properties.itemIds]);
      }
    } else {
      if (properties.role) rows.push(["Role", properties.role]);
      if (properties.time) rows.push(["Time", properties.time]);
      if (properties.attributes && Object.keys(properties.attributes).length) {
        rows.push(["Properties", properties.attributes]);
      }
      if (properties.lastChange) rows.push(["Last change", properties.lastChange]);
      if (Array.isArray(properties.changes) && properties.changes.length) {
        rows.push(["Changes", properties.changes]);
      }
    }
    return rows;
  }

  function formatDetailValue(value) {
    if (Array.isArray(value)) {
      if (value.every((entry) => typeof entry === "string" || typeof entry === "number")) {
        return value.join(", ");
      }
      return JSON.stringify(value);
    }
    if (value && typeof value === "object") return JSON.stringify(value);
    return String(value ?? "");
  }

  function hasSignificantDetail(kind, record) {
    return detailRows(kind, record).length > 0;
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
      this.focusedId = null;
      this.signature = "";
      this.presentationMode = false;
      this.hasFocusedContext = false;
      this.currentData = { nodes: [], edges: [] };
      this.detailSelection = null;
      this.orb = orbFactory.create(this.canvas, {
        onNodeClick: (node) => this.activateNode(node),
        onNodeLongPress: (node) => this.selectNodeForDrag(node),
        onEdgeClick: (edge) => this.activateEdge(edge),
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

    setFocus(id) {
      const next = id ? String(id) : null;
      if (next === this.focusedId) return;
      this.focusedId = next;
      this.signature = "";
      this.clearDetail();
      this.render();
    }

    resetView() {
      this.orb.recenter();
    }

    refreshLayout() {
      this.orb.recenter();
    }

    setPresentationMode(active) {
      this.presentationMode = Boolean(active);
      this.root.dataset.presentationMode = String(this.presentationMode);
    }

    hasContext() {
      return this.hasFocusedContext;
    }

    clearDetail() {
      if (!this.detail) return;
      this.detailSelection = null;
      this.detail.replaceChildren();
      this.detail.hidden = true;
    }

    fallbackEventId(kind, record) {
      const itemIds = new Set(this.model.items.map((item) => String(item.id)));
      if (kind === "edge") {
        if (itemIds.has(String(record?.start))) return String(record.start);
        if (itemIds.has(String(record?.end))) return String(record.end);
      }
      if (this.focusedId && itemIds.has(String(this.focusedId))) return String(this.focusedId);
      const id = String(record?.id || "");
      for (const edge of this.currentData.edges || []) {
        const start = String(edge.start);
        const end = String(edge.end);
        if (kind === "node" && start !== id && end !== id) continue;
        if (itemIds.has(start)) return start;
        if (itemIds.has(end)) return end;
      }
      return null;
    }

    selectNodeForDrag(node) {
      this.root.dispatchEvent(new CustomEvent("graphnodeselect", {
        bubbles: true,
        detail: { id: node.id, interaction: "long-press-drag" }
      }));
    }

    activateNode(node) {
      const type = node.properties?.timelineType;
      if (type === "chronology-item") {
        this.clearDetail();
        this.root.dispatchEvent(new CustomEvent("graphnodefocus", {
          bubbles: true,
          detail: { id: node.id }
        }));
        return;
      }

      const significant = this.renderDetail("node", node);
      const detail = {
        id: node.id,
        significant,
        fallbackEventId: this.fallbackEventId("node", node)
      };
      this.root.dispatchEvent(new CustomEvent(
        type === "story" ? "graphstoryfocus" : "graphentityfocus",
        { bubbles: true, detail }
      ));
    }

    activateEdge(edge) {
      const significant = this.renderDetail("edge", edge);
      this.root.dispatchEvent(new CustomEvent("graphedgefocus", {
        bubbles: true,
        detail: {
          id: edge.id,
          significant,
          fallbackEventId: this.fallbackEventId("edge", edge)
        }
      }));
    }

    renderDetail(kind, record) {
      if (!this.detail) return false;
      const rows = detailRows(kind, record);
      if (!rows.length) {
        this.clearDetail();
        return false;
      }

      this.detail.replaceChildren();
      this.detail.hidden = false;
      this.detail.dataset.kind = kind;
      this.detailSelection = { kind, id: String(record.id) };

      const header = document.createElement("div");
      header.className = "temporal-graph-detail-header";
      const identity = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = kind === "node" ? record.label : record.label || "relatedTo";
      const meta = document.createElement("span");
      meta.textContent = kind === "node"
        ? record.properties?.timelineType || "entity"
        : `${record.start} → ${record.end}`;
      identity.append(title, meta);
      const close = document.createElement("button");
      close.type = "button";
      close.className = "icon-button temporal-graph-detail-close";
      close.setAttribute("aria-label", "Close graph detail");
      close.textContent = "×";
      close.addEventListener("click", () => this.clearDetail());
      header.append(identity, close);

      const list = document.createElement("dl");
      list.className = "temporal-graph-detail-list";
      for (const [label, value] of rows) {
        const term = document.createElement("dt");
        term.textContent = label;
        const description = document.createElement("dd");
        description.textContent = formatDetailValue(value);
        list.append(term, description);
      }
      this.detail.append(header, list);
      return true;
    }

    render() {
      const data = this.focusedId
        ? graph.neighborhoodGraph(this.model, this.focusedId, this.viewport, { depth: 1, limit: 36 })
        : graph.graphForWindow(this.model, this.viewport);
      this.currentData = data;
      if (this.detailSelection) {
        const records = this.detailSelection.kind === "node" ? data.nodes : data.edges;
        if (!records.some((record) => String(record.id) === this.detailSelection.id)) {
          this.clearDetail();
        }
      }
      const nextHasFocusedContext = Boolean(this.focusedId && data.nodes.length > 1 && data.edges.length > 0);
      if (nextHasFocusedContext !== this.hasFocusedContext) {
        this.hasFocusedContext = nextHasFocusedContext;
        this.root.dispatchEvent(new CustomEvent("graphcontextchange", {
          bubbles: true,
          detail: {
            focusedId: this.focusedId,
            hasContext: this.hasFocusedContext,
            nodeCount: data.nodes.length,
            edgeCount: data.edges.length
          }
        }));
      }
      const scopeText = this.focusedId ? `${data.nodes.length} relevant nodes · ` : "";
      const timelessCount = data.edges.filter((edge) => edge.temporalState === "timeless").length;
      const persistentText = timelessCount ? ` · ${timelessCount} persistent` : "";
      const countText = `${scopeText}${data.edges.length} relations in window${persistentText}`;
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
