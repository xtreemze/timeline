import { EdgeLineStyleType, GraphObjectState, NodeShapeType, OrbEventType, OrbView } from "@memgraph/orb";

const LARGE_GRAPH_NODE_THRESHOLD = 1200;
const GPU_LAYOUT_NODE_THRESHOLD = 3000;
const TOUCH_NODE_HOLD_MS = 420;
const TOUCH_NODE_MOVE_TOLERANCE_PX = 12;
const INTERACTION_SETTLE_MS = 2400;
const DRAG_ALPHA_TARGET = 0.12;
const RELEASE_ALPHA_TARGET = 0.065;

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
  let touchHold = null;
  let touchReleaseFallback = 0;
  let touchDragBlockedUntilRelease = false;
  let touchSelectedNode = null;
  let interactionSettleTimer = 0;
  let forceNodeCount = 0;
  const activeTouchPointers = new Set();

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
        links: { distance: 132, strength: 0.82, iterations: 2 },
        manyBody: { strength: -310, theta: 0.86, distanceMin: 20, distanceMax: 2400 },
        collision: { radius: 34, strength: 1, iterations: 3 },
        alpha: { alpha: 1, alphaMin: 0.012, alphaDecay: 0.021, alphaTarget: 0 },
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

  function forceAlphaProfile(nodeCount = forceNodeCount, alphaTarget = 0) {
    const dense = nodeCount >= 1000;
    return {
      alpha: 1,
      alphaMin: dense ? 0.018 : 0.012,
      alphaDecay: dense ? 0.024 : 0.021,
      alphaTarget
    };
  }

  function forceLayoutOptions(nodeCount = forceNodeCount, alphaTarget = 0) {
    const dense = nodeCount >= 1000;
    const useGPU = currentMode === "gpu-main-force";
    return {
      links: { distance: dense ? 104 : 132, strength: 0.82, iterations: 2 },
      manyBody: {
        strength: dense ? -210 : -310,
        theta: 0.86,
        distanceMin: 20,
        distanceMax: dense ? 1400 : 2400
      },
      collision: {
        radius: dense ? 24 : 34,
        strength: 1,
        iterations: 3
      },
      alpha: forceAlphaProfile(nodeCount, alphaTarget),
      isSimulatingOnDataUpdate: true,
      isSimulatingOnSettingsUpdate: true,
      isSimulatingOnUnstick: true,
      isPhysicsEnabled: true,
      centering: { x: 0, y: 0, strength: dense ? 0.03 : 0.05 },
      positioning: {
        forceX: { x: 0, strength: dense ? 0.018 : 0.03 },
        forceY: { y: 0, strength: dense ? 0.018 : 0.03 }
      },
      useGPU
    };
  }

  function forceSimulator() {
    const simulator = orb?._simulator;
    if (
      simulator &&
      typeof simulator.setSettings === "function" &&
      typeof simulator.activateSimulation === "function"
    ) {
      return simulator;
    }
    return null;
  }

  function applyInteractionForce(alphaTarget) {
    const layout = {
      type: "force",
      options: forceLayoutOptions(forceNodeCount, alphaTarget)
    };
    const simulator = forceSimulator();
    if (simulator) {
      simulator.setSettings(layout);
      simulator.activateSimulation();
      return;
    }
    // Orb does not expose simulation activation publicly in 1.0.2. Keep a
    // compatibility fallback if the pinned internal bridge changes.
    orb.setSettings({ layout });
  }

  function clearInteractionSettleTimer() {
    if (!interactionSettleTimer) return;
    globalThis.clearTimeout(interactionSettleTimer);
    interactionSettleTimer = 0;
  }

  function setInteractionHeat(alphaTarget) {
    clearInteractionSettleTimer();
    applyInteractionForce(alphaTarget);
  }

  function keepForceActiveAfterInteraction() {
    setInteractionHeat(RELEASE_ALPHA_TARGET);
    interactionSettleTimer = globalThis.setTimeout(() => {
      interactionSettleTimer = 0;
      applyInteractionForce(0);
    }, INTERACTION_SETTLE_MS);
  }

  function isTouchInput(event) {
    if (!event) return false;
    if (event.pointerType === "touch") return true;
    if (String(event.type || "").startsWith("touch")) return true;
    return Boolean(event.touches || event.changedTouches);
  }

  function eventClientPoint(event) {
    const source = event?.touches?.[0] || event?.changedTouches?.[0] || event;
    const x = Number(source?.clientX);
    const y = Number(source?.clientY);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  }

  function setDragEnabled(enabled) {
    orb.setSettings({ interaction: { isDragEnabled: enabled } });
  }

  function selectTouchNode(node) {
    if (
      touchSelectedNode &&
      touchSelectedNode !== node &&
      touchSelectedNode.getState?.() === GraphObjectState.SELECTED
    ) {
      touchSelectedNode.setState(GraphObjectState.NONE, { isNotifySkipped: true });
    }
    touchSelectedNode = node;
    node.setState(GraphObjectState.SELECTED, { isNotifySkipped: true });
    orb.render();
  }

  function clearTouchReleaseFallback() {
    if (!touchReleaseFallback) return;
    globalThis.clearTimeout(touchReleaseFallback);
    touchReleaseFallback = 0;
  }

  function clearTouchHoldTimer() {
    if (!touchHold?.timer) return;
    globalThis.clearTimeout(touchHold.timer);
    touchHold.timer = 0;
  }

  function finishTouchGesture() {
    clearTouchReleaseFallback();
    clearTouchHoldTimer();
    touchHold = null;
    touchDragBlockedUntilRelease = false;
    delete container.dataset.touchDrag;
    setDragEnabled(true);
  }

  function cancelPendingTouchHold() {
    if (!touchHold || touchHold.activated) return;
    clearTouchHoldTimer();
    touchHold = null;
    touchDragBlockedUntilRelease = true;
    container.dataset.touchDrag = "cancelled";
  }

  function beginTouchHold({ node, event, globalPoint }) {
    clearTouchReleaseFallback();
    clearTouchHoldTimer();
    setDragEnabled(false);
    touchDragBlockedUntilRelease = true;

    if (activeTouchPointers.size > 1) {
      touchHold = null;
      container.dataset.touchDrag = "cancelled";
      return;
    }

    touchHold = {
      node,
      startClientPoint: eventClientPoint(event),
      startGlobalPoint: globalPoint,
      activated: false,
      timer: 0
    };
    container.dataset.touchDrag = "holding";

    touchHold.timer = globalThis.setTimeout(() => {
      if (!touchHold || touchHold.node !== node || activeTouchPointers.size > 1) return;
      touchHold.activated = true;
      touchDragBlockedUntilRelease = false;
      container.dataset.touchDrag = "active";
      setDragEnabled(true);
      selectTouchNode(node);
      handlers.onNodeLongPress?.(node.getData());
      try {
        globalThis.navigator?.vibrate?.(12);
      } catch {
        // Haptics are optional and may be unavailable or permission-gated.
      }
    }, TOUCH_NODE_HOLD_MS);
  }

  function onPointerDown(event) {
    if (event.pointerType !== "touch") return;
    activeTouchPointers.add(event.pointerId);
    if (activeTouchPointers.size > 1 && touchHold && !touchHold.activated) {
      cancelPendingTouchHold();
    }
  }

  function onPointerMove(event) {
    if (event.pointerType !== "touch" || !touchHold || touchHold.activated) return;
    const origin = touchHold.startClientPoint;
    if (!origin) return;
    const distance = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
    if (distance > TOUCH_NODE_MOVE_TOLERANCE_PX) cancelPendingTouchHold();
  }

  function scheduleTouchReleaseFallback() {
    clearTouchReleaseFallback();
    touchReleaseFallback = globalThis.setTimeout(() => {
      if (touchHold?.activated || touchDragBlockedUntilRelease) finishTouchGesture();
    }, 48);
  }

  function onPointerUp(event) {
    if (event.pointerType !== "touch") return;
    activeTouchPointers.delete(event.pointerId);
    if (activeTouchPointers.size) return;
    if (touchHold?.activated) {
      scheduleTouchReleaseFallback();
      return;
    }
    finishTouchGesture();
  }

  function onTouchEnd(event) {
    if (event.touches?.length) return;
    if (touchHold?.activated) {
      scheduleTouchReleaseFallback();
      return;
    }
    finishTouchGesture();
  }

  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointerup", onPointerUp);
  container.addEventListener("pointercancel", onPointerUp);
  container.addEventListener("touchend", onTouchEnd);
  container.addEventListener("touchcancel", onTouchEnd);

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

  function edgeSemantic(data) {
    const label = String(data?.label || "").toLowerCase();
    if (/call|message|email|contact|communicat/.test(label)) return { glyph: "☎", color: "#496f8c" };
    if (/transfer|own|pay|send|receive|deliver/.test(label)) return { glyph: "⇢", color: "#8a5b2d" };
    if (/authoriz|approv|decid|permit/.test(label)) return { glyph: "✓", color: palette.story };
    if (/investigat|review|audit|inspect|verify/.test(label)) return { glyph: "⌕", color: "#596b86" };
    if (/occur|locat|visit|travel|arriv/.test(label)) return { glyph: "⌖", color: "#3e6d5b" };
    if (/interview|witness|particip|meet|corroborat/.test(label)) return { glyph: "↔", color: "#6b526f" };
    return { glyph: "→", color: palette.focus };
  }

  function edgeStyle(data) {
    const state = data?.temporalState || "timeless";
    const inactive = state === "inactive";
    const changed = state === "changed";
    const timeless = state === "timeless";
    const semantic = edgeSemantic(data);
    const color = inactive || timeless ? palette.muted : changed ? palette.story : semantic.color;
    return {
      color,
      colorHover: palette.focus,
      colorSelected: palette.focus,
      width: inactive ? 0.35 : timeless ? 0.6 : changed ? 1.5 : 0.9,
      widthHover: 1.8,
      widthSelected: 2.2,
      arrowSize: inactive ? 0.8 : 1.25,
      label: inactive ? "" : `${semantic.glyph} ${data?.label || ""}`.trim(),
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
  const onNodeDragStart = (payload) => {
    setInteractionHeat(DRAG_ALPHA_TARGET);
    if (isTouchInput(payload.event)) beginTouchHold(payload);
  };
  const onNodeDrag = () => {
    clearInteractionSettleTimer();
  };
  const onNodeDragEnd = (payload) => {
    keepForceActiveAfterInteraction();
    if (isTouchInput(payload.event) && touchHold?.activated) finishTouchGesture();
  };
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
  orb.events.on(OrbEventType.NODE_DRAG_START, onNodeDragStart);
  orb.events.on(OrbEventType.NODE_DRAG, onNodeDrag);
  orb.events.on(OrbEventType.NODE_DRAG_END, onNodeDragEnd);
  orb.events.on(OrbEventType.SIMULATION_START, onSimulationStart);
  orb.events.on(OrbEventType.SIMULATION_END, onSimulationEnd);

  function setPerformanceMode(nodeCount) {
    forceNodeCount = nodeCount;
    const wantsWebGL = nodeCount >= LARGE_GRAPH_NODE_THRESHOLD && supportsWebGL2();
    const wantsGPU = nodeCount >= GPU_LAYOUT_NODE_THRESHOLD && wantsWebGL;
    const sizeClass = `${wantsWebGL ? "webgl" : "canvas"}:${wantsGPU ? "gpu" : "worker"}:${nodeCount >= 400 ? "dense" : "normal"}`;
    if (sizeClass === lastSizeClass) return;
    lastSizeClass = sizeClass;
    currentMode = wantsGPU ? "gpu-main-force" : "worker-cpu";
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
          ...forceLayoutOptions(nodeCount, 0),
          useGPU: wantsGPU
        }
      }
    });
  }

  function setData(data) {
    finishTouchGesture();
    touchSelectedNode = null;
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
      finishTouchGesture();
      clearInteractionSettleTimer();
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerUp);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
      orb.events.off(OrbEventType.NODE_CLICK, onNodeClick);
      orb.events.off(OrbEventType.EDGE_CLICK, onEdgeClick);
      orb.events.off(OrbEventType.NODE_DRAG_START, onNodeDragStart);
      orb.events.off(OrbEventType.NODE_DRAG, onNodeDrag);
      orb.events.off(OrbEventType.NODE_DRAG_END, onNodeDragEnd);
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
