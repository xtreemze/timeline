(() => {
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
      timeZone: "UTC",
    });
    return `${formatter.format(new Date(viewport.start))} – ${formatter.format(new Date(viewport.end))}`;
  }

  function topologySignature(data) {
    return JSON.stringify({
      nodes: data.nodes.map((node) => String(node.id)).sort(),
      edges: data.edges
        .map((edge) => [String(edge.id), String(edge.start), String(edge.end)])
        .sort((a, b) => a[0].localeCompare(b[0])),
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
      this.model = { entities: [], relationships: [], items: [], stories: [] };
      this.viewport = null;
      this.focusedId = null;
      this.signature = "";
      this.presentationMode = false;
      this.hasFocusedContext = false;
      this.currentData = { nodes: [], edges: [] };
      this.hasRenderedData = false;
      this.selection = null;
      this.layoutFrame = 0;
      this.lastCanvasSize = "";
      this.orb = orbFactory.create(this.canvas, {
        onNodeClick: (node) => this.activateNode(node),
        onNodeLongPress: (node) => this.selectNodeForDrag(node),
        onEdgeClick: (edge) => this.activateEdge(edge),
        onSimulationState: (state) => this.renderSimulationState(state),
      });

      if ("ResizeObserver" in globalThis && this.canvas) {
        this.resizeObserver = new ResizeObserver((entries) => {
          const entry = entries.find((candidate) => candidate.target === this.canvas);
          if (!entry) return;
          const width = Math.round(entry.contentRect.width);
          const height = Math.round(entry.contentRect.height);
          if (width <= 0 || height <= 0) return;
          const size = `${width}x${height}`;
          if (size === this.lastCanvasSize) return;
          this.lastCanvasSize = size;
          cancelAnimationFrame(this.layoutFrame);
          this.layoutFrame = requestAnimationFrame(() => {
            this.layoutFrame = 0;
            this.orb.refreshLayout?.();
          });
        });
        this.resizeObserver.observe(this.canvas);
      } else {
        this.resizeObserver = null;
      }
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
        stories: Array.isArray(model?.stories) ? model.stories : [],
      };
      this.render();
    }

    setWindow(viewport) {
      this.viewport =
        viewport && Number.isFinite(viewport.start) && Number.isFinite(viewport.end)
          ? { start: viewport.start, end: viewport.end }
          : null;
      this.render();
    }

    setFocus(id) {
      const next = id ? String(id) : null;
      if (next === this.focusedId) return;
      this.focusedId = next;
      this.signature = "";
      this.selection = null;
      this.render();
    }

    resetView() {
      this.orb.recenter();
    }

    refreshLayout() {
      cancelAnimationFrame(this.layoutFrame);
      this.layoutFrame = requestAnimationFrame(() => {
        this.layoutFrame = 0;
        this.orb.refreshLayout?.();
      });
    }

    setPresentationMode(active) {
      this.presentationMode = Boolean(active);
      this.root.dataset.presentationMode = String(this.presentationMode);
    }

    hasContext() {
      return this.hasFocusedContext;
    }

    selectNodeForDrag(node) {
      this.selection = { kind: "node", id: String(node.id) };
      this.root.dispatchEvent(
        new CustomEvent("graphnodeselect", {
          bubbles: true,
          detail: { id: node.id, interaction: "long-press-drag" },
        }),
      );
    }

    activateNode(node) {
      this.selection = { kind: "node", id: String(node.id) };
      this.root.dispatchEvent(
        new CustomEvent("graphselectionchange", {
          bubbles: true,
          detail: {
            kind: "node",
            id: node.id,
            timelineType: node.properties?.timelineType || "entity",
          },
        }),
      );
    }

    activateEdge(edge) {
      this.selection = { kind: "edge", id: String(edge.id) };
      this.root.dispatchEvent(
        new CustomEvent("graphselectionchange", {
          bubbles: true,
          detail: {
            kind: "edge",
            id: edge.id,
            start: edge.start,
            end: edge.end,
          },
        }),
      );
    }

    render() {
      const data = this.focusedId
        ? graph.neighborhoodGraph(this.model, this.focusedId, this.viewport, {
            depth: 1,
            limit: 36,
          })
        : graph.graphForWindow(this.model, this.viewport);
      this.currentData = data;
      if (this.selection) {
        const records = this.selection.kind === "node" ? data.nodes : data.edges;
        if (!records.some((record) => String(record.id) === this.selection.id)) {
          this.selection = null;
        }
      }
      const nextHasFocusedContext = Boolean(
        this.focusedId && data.nodes.length > 1 && data.edges.length > 0,
      );
      if (nextHasFocusedContext !== this.hasFocusedContext) {
        this.hasFocusedContext = nextHasFocusedContext;
        this.root.dispatchEvent(
          new CustomEvent("graphcontextchange", {
            bubbles: true,
            detail: {
              focusedId: this.focusedId,
              hasContext: this.hasFocusedContext,
              nodeCount: data.nodes.length,
              edgeCount: data.edges.length,
            },
          }),
        );
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
        if (this.hasRenderedData) {
          this.orb.transitionData(data);
        } else {
          this.orb.setData(data);
          this.hasRenderedData = true;
        }
        if (this.selection) this.orb.select?.(this.selection.kind, this.selection.id);
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
