import { EdgeLineStyleType, OrbEventType, OrbView } from "@memgraph/orb";

const LARGE_GRAPH_NODE_THRESHOLD = 1200;
const GPU_LAYOUT_NODE_THRESHOLD = 3000;

function resolvedColor(container, name, fallback) {
  const value = getComputedStyle(container).getPropertyValue(name).trim();
  if (!value) return fallback;
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return value;
  return fallback;
}

function supportsWebGL2() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

function create(container, handlers = {}) {
  if (!(container instanceof HTMLElement)) throw new TypeError("Orb graph container is required.");

  const palette = {
    ink: resolvedColor(container, "--ink", "#181716"),
    muted: resolvedColor(container, "--muted", "#79736b"),
    paper: resolvedColor(container, "--paper", "#f8f6f2"),
    focus: resolvedColor(container, "--focus", "#315fbd"),
    story: resolvedColor(container, "--story", "#7256b5")
  };

  let currentMode = "worker-cpu";
  let lastSizeClass = "";
  let firstRender = true;

  const orb = new OrbView(container, {
    render: {
      type: "canvas",
      backgroundColor: null,
      fitZoomMargin: 0.14,
      minZoom: 0.002,
      maxZoom: 12,
      labelsIsEnabled: true,
      labelsOnEventIsEnabled: true,
      shadowIsEnabled: false,
      contextAlphaOnEvent: 0.18,
      contextAlphaOnEventIsEnabled: true
    },
    layout: {
      type: "force",
      options: {
        links: { distance: 96, strength: 0.76, iterations: 1 },
        manyBody: { strength: -180, theta: 0.9, distanceMin: 14, distanceMax: 1800 },
        collision: { radius: 22, strength: 0.92, iterations: 2 },
        alpha: { alpha: 1, alphaMin: 0.035, alphaDecay: 0.026, alphaTarget: 0 },
        isSimulatingOnDataUpdate: true,
        isSimulatingOnSettingsUpdate: true,
        isSimulatingOnUnstick: true,
        isPhysicsEnabled: false,
        useGPU: false
      }
    },
    interaction: {
      isDragEnabled: true,
      isZoomEnabled: true
    },
    zoomFitTransitionMs: 240
  });

  function nodeStyle(data) {
    const type = data?.properties?.timelineType;
    const color =
      type === "chronology-item" ? palette.focus :
      type === "story" ? palette.story :
      palette.ink;
    return {
      size: type === "chronology-item" ? 8 : type === "story" ? 9 : 7,
      color,
      colorHover: palette.focus,
      colorSelected: palette.focus,
      borderColor: palette.paper,
      borderWidth: 1.5,
      borderWidthSelected: 3,
      label: data?.label || String(data?.id || ""),
      fontSize: 11,
      fontColor: palette.ink,
      fontBackgroundColor: palette.paper
    };
  }

  function edgeStyle(data) {
    const state = data?.temporalState || "timeless";
    const inactive = state === "inactive";
    const changed = state === "changed";
    const color = inactive ? palette.muted : changed ? palette.story : palette.focus;
    return {
      color,
      colorHover: palette.focus,
      colorSelected: palette.focus,
      width: inactive ? 0.35 : changed ? 1.5 : 0.9,
      widthHover: 1.8,
      widthSelected: 2.2,
      arrowSize: inactive ? 0.7 : 1,
      label: inactive ? "" : (data?.label || ""),
      fontSize: 10,
      fontColor: color,
      fontBackgroundColor: palette.paper,
      lineStyle: inactive
        ? { type: EdgeLineStyleType.DASHED }
        : { type: EdgeLineStyleType.SOLID }
    };
  }

  orb.data.setDefaultStyle({
    getNodeStyle(node) {
      return nodeStyle(node.getData());
    },
    getEdgeStyle(edge) {
      return edgeStyle(edge.getData());
    }
  });

  const onNodeClick = ({ node }) => handlers.onNodeClick?.(node.getData());
  const onEdgeClick = ({ edge }) => handlers.onEdgeClick?.(edge.getData());
  const onSimulationStart = () => handlers.onSimulationState?.({ running: true, mode: currentMode });
  const onSimulationEnd = ({ durationMs }) => {
    handlers.onSimulationState?.({ running: false, mode: currentMode, durationMs });
    if (firstRender) {
      firstRender = false;
      orb.recenter();
    }
  };

  orb.events.on(OrbEventType.NODE_CLICK, onNodeClick);
  orb.events.on(OrbEventType.EDGE_CLICK, onEdgeClick);
  orb.events.on(OrbEventType.SIMULATION_START, onSimulationStart);
  orb.events.on(OrbEventType.SIMULATION_END, onSimulationEnd);

  function setPerformanceMode(nodeCount) {
    const wantsWebGL = nodeCount >= LARGE_GRAPH_NODE_THRESHOLD && supportsWebGL2();
    const wantsGPU = nodeCount >= GPU_LAYOUT_NODE_THRESHOLD && wantsWebGL;
    const sizeClass = `${wantsWebGL ? "webgl" : "canvas"}:${wantsGPU ? "gpu" : "worker"}:${nodeCount >= 400 ? "dense" : "normal"}`;
    if (sizeClass === lastSizeClass) return;
    lastSizeClass = sizeClass;
    currentMode = wantsGPU ? "gpu-force" : "worker-cpu";
    orb.setRenderer(wantsWebGL ? "webgl" : "canvas");
    orb.setSettings({
      render: {
        labelsIsEnabled: nodeCount < 1800,
        labelsOnEventIsEnabled: true,
        shadowIsEnabled: false,
        minZoom: nodeCount >= 3000 ? 0.0005 : 0.002
      },
      layout: {
        type: "force",
        options: {
          links: { distance: nodeCount >= 1000 ? 72 : 96, strength: 0.76, iterations: 1 },
          manyBody: {
            strength: nodeCount >= 1000 ? -120 : -180,
            theta: 0.9,
            distanceMin: 12,
            distanceMax: nodeCount >= 1000 ? 900 : 1800
          },
          collision: { radius: nodeCount >= 1000 ? 15 : 22, strength: 0.92, iterations: 1 },
          alpha: { alpha: 1, alphaMin: 0.04, alphaDecay: nodeCount >= 1000 ? 0.04 : 0.026, alphaTarget: 0 },
          isSimulatingOnDataUpdate: true,
          isSimulatingOnSettingsUpdate: true,
          isSimulatingOnUnstick: true,
          isPhysicsEnabled: false,
          useGPU: wantsGPU
        }
      }
    });
  }

  function setData(data) {
    const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
    const edges = Array.isArray(data?.edges) ? data.edges : [];
    setPerformanceMode(nodes.length);
    firstRender = true;
    orb.data.setup({ nodes, edges });
    orb.render();
    handlers.onSimulationState?.({ running: true, mode: currentMode });
  }

  function updateTemporalEdges(edges) {
    for (const next of Array.isArray(edges) ? edges : []) {
      const edge = orb.data.getEdgeById(next.id);
      if (!edge) continue;
      edge.setData(next, { isNotifySkipped: true });
      edge.setStyle(edgeStyle(next), { isNotifySkipped: true });
    }
    orb.render();
  }

  return Object.freeze({
    setData,
    updateTemporalEdges,
    recenter() {
      orb.recenter();
    },
    zoomIn() {
      orb.zoomIn();
    },
    zoomOut() {
      orb.zoomOut();
    },
    getMode() {
      return currentMode;
    },
    destroy() {
      orb.events.off(OrbEventType.NODE_CLICK, onNodeClick);
      orb.events.off(OrbEventType.EDGE_CLICK, onEdgeClick);
      orb.events.off(OrbEventType.SIMULATION_START, onSimulationStart);
      orb.events.off(OrbEventType.SIMULATION_END, onSimulationEnd);
      orb.destroy();
    }
  });
}

globalThis.TimelineOrbGraph = Object.freeze({
  create,
  version: "1.0.2"
});
