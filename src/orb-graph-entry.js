import { EdgeLineStyleType, NodeShapeType, OrbEventType, OrbView } from "@memgraph/orb";

const LARGE_GRAPH_NODE_THRESHOLD = 1200;
const GPU_LAYOUT_NODE_THRESHOLD = 600;

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

const ICON_PATHS = Object.freeze({
  event: ["M6 4h12v16H6z", "M8 2v4", "M16 2v4", "M6 8h12", "M9 12h2", "M13 12h2", "M9 16h2"],
  story: ["M4 18V6", "M4 7h7l2 2h7v8h-7l-2-2H4"],
  person: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21a8 8 0 0 1 16 0"],
  place: ["M12 22s7-6.1 7-13a7 7 0 1 0-14 0c0 6.9 7 13 7 13z", "M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  evidence: ["M5 3h10l4 4v14H5z", "M15 3v5h5", "M8 13h8", "M8 17h6"],
  organization: ["M4 21h16", "M6 21V8l6-5 6 5v13", "M9 11h1", "M14 11h1", "M9 15h1", "M14 15h1"],
  device: ["M5 4h14v12H5z", "M9 20h6", "M12 16v4"],
  account: ["M4 7h16v12H4z", "M4 10h16", "M8 15h4"],
  relation: ["M7 7h10", "M7 17h10", "M7 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0z", "M21 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"]
});

const iconCache = new Map();

function semanticType(data) {
  const type = String(data?.properties?.timelineType || "entity").toLowerCase();
  if (type === "chronology-item") return "event";
  if (type === "story") return "story";
  if (type.includes("person") || type.includes("group")) return "person";
  if (type.includes("place") || type.includes("location")) return "place";
  if (type.includes("evidence") || type.includes("document") || type.includes("record")) return "evidence";
  if (type.includes("organization") || type.includes("company") || type.includes("agency")) return "organization";
  if (type.includes("device") || type.includes("software")) return "device";
  if (type.includes("account")) return "account";
  return "relation";
}

function semanticIconUrl(type) {
  if (iconCache.has(type)) return iconCache.get(type);
  const paths = ICON_PATHS[type] || ICON_PATHS.relation;
  const pathMarkup = paths.map((d) => `<path d="${d}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${pathMarkup}</svg>`;
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  iconCache.set(type, url);
  return url;
}

function nodeShape(type) {
  if (type === "event") return NodeShapeType.DIAMOND;
  if (type === "story") return NodeShapeType.HEXAGON;
  if (type === "place") return NodeShapeType.TRIANGLE;
  if (type === "organization") return NodeShapeType.SQUARE;
  if (type === "evidence") return NodeShapeType.DIAMOND;
  if (type === "device" || type === "account") return NodeShapeType.HEXAGON;
  return NodeShapeType.CIRCLE;
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
        isPhysicsEnabled: true,
        centering: { x: 0, y: 0, strength: 0.06 },
        positioning: {
          forceX: { x: 0, strength: 0.035 },
          forceY: { y: 0, strength: 0.035 }
        },
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
    const type = semanticType(data);
    const color =
      type === "event" ? palette.focus :
      type === "story" ? palette.story :
      type === "evidence" ? "#8a4f2b" :
      type === "place" ? "#3e6d5b" :
      type === "person" ? "#4b5f86" :
      type === "organization" ? "#6b526f" :
      palette.ink;
    const size = type === "event" ? 12 : type === "story" ? 13 : 10;
    return {
      size,
      mass: type === "event" ? 2.6 : type === "story" ? 2.2 : 1.35,
      shape: nodeShape(type),
      imageUrl: semanticIconUrl(type),
      imageUrlSelected: semanticIconUrl(type),
      color,
      colorHover: palette.focus,
      colorSelected: palette.focus,
      borderColor: palette.paper,
      borderColorHover: palette.paper,
      borderColorSelected: palette.paper,
      borderWidth: 2,
      borderWidthSelected: 4,
      label: data?.label || String(data?.id || ""),
      fontSize: 12,
      fontColor: palette.ink,
      fontBackgroundColor: palette.paper,
      zIndex: type === "event" ? 4 : type === "story" ? 3 : 2
    };
  }

  function edgeStyle(data) {
    const state = data?.temporalState || "timeless";
    const inactive = state === "inactive";
    const changed = state === "changed";
    const timeless = state === "timeless";
    const color = inactive || timeless ? palette.muted : changed ? palette.story : palette.focus;
    return {
      color,
      colorHover: palette.focus,
      colorSelected: palette.focus,
      width: inactive ? 0.35 : timeless ? 0.6 : changed ? 1.5 : 0.9,
      widthHover: 1.8,
      widthSelected: 2.2,
      arrowSize: inactive ? 0.8 : 1.25,
      label: inactive ? "" : (data?.label || ""),
      fontSize: 11,
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
          isPhysicsEnabled: true,
          centering: { x: 0, y: 0, strength: nodeCount >= 1000 ? 0.035 : 0.06 },
          positioning: {
            forceX: { x: 0, strength: nodeCount >= 1000 ? 0.02 : 0.035 },
            forceY: { y: 0, strength: nodeCount >= 1000 ? 0.02 : 0.035 }
          },
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
