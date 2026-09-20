import { EdgeLineStyleType, GraphObjectState, NodeShapeType, OrbEventType, OrbView } from "@memgraph/orb";

const LARGE_GRAPH_NODE_THRESHOLD = 1200;
const GPU_LAYOUT_NODE_THRESHOLD = 3000;
const TOUCH_NODE_HOLD_MS = 420;
const TOUCH_NODE_MOVE_TOLERANCE_PX = 12;
const TOUCH_NODE_TARGET_DIAMETER_PX = 44;
const TOUCH_EDGE_TARGET_RADIUS_PX = 14;
const TOUCH_DOUBLE_TAP_MS = 320;
const TOUCH_DOUBLE_TAP_DISTANCE_PX = 28;
const GRAPH_DOUBLE_TAP_WHEEL_DELTA_PX = -500;
const INTERACTION_SETTLE_MS = 2400;
const DRAG_ALPHA_TARGET = 0.12;
const RELEASE_ALPHA_TARGET = 0.065;
const TOPOLOGY_ALPHA_TARGET = 0.085;
const TOPOLOGY_EDGE_RELEASE_MS = 280;
const TOPOLOGY_SETTLE_MS = 820;
const TOPOLOGY_ENTRY_OFFSET = 36;

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
  let touchTap = null;
  let lastTouchTap = null;
  let touchReleaseFallback = 0;
  let touchDragBlockedUntilRelease = false;
  let suppressGraphClickUntil = 0;
  let selectedGraphObject = null;
  let interactionSettleTimer = 0;
  let forceNodeCount = 0;
  let hasGraphData = false;
  const topologyTimers = new Set();
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
      links: { distance: dense ? 128 : 168, strength: 0.78, iterations: 3 },
      manyBody: {
        strength: dense ? -300 : -460,
        theta: 0.84,
        distanceMin: 24,
        distanceMax: dense ? 1800 : 3200
      },
      collision: {
        radius: dense ? 30 : 42,
        strength: 1,
        iterations: 4
      },
      alpha: forceAlphaProfile(nodeCount, alphaTarget),
      isSimulatingOnDataUpdate: true,
      isSimulatingOnSettingsUpdate: true,
      isSimulatingOnUnstick: true,
      isPhysicsEnabled: true,
      centering: { x: 0, y: 0, strength: dense ? 0.02 : 0.035 },
      positioning: {
        forceX: { x: 0, strength: dense ? 0.012 : 0.02 },
        forceY: { y: 0, strength: dense ? 0.012 : 0.02 }
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

  function setZoomEnabled(enabled) {
    orb.setSettings({ interaction: { isZoomEnabled: enabled } });
  }

  function zoomGraphAtClientPoint(point) {
    if (!point || !orb.canvas) return;
    const event = new WheelEvent("wheel", {
      clientX: point.x,
      clientY: point.y,
      deltaY: GRAPH_DOUBLE_TAP_WHEEL_DELTA_PX,
      deltaMode: 0,
      bubbles: true,
      cancelable: true
    });
    orb.canvas.dispatchEvent(event);
  }

  function registerTouchTap(event, tap) {
    if (!tap || tap.cancelled) return false;
    const now = performance.now();
    const point = eventClientPoint(event);
    const previous = lastTouchTap;
    touchTap = null;
    if (!point) return false;

    if (
      previous &&
      now - previous.time <= TOUCH_DOUBLE_TAP_MS &&
      Math.hypot(point.x - previous.x, point.y - previous.y) <= TOUCH_DOUBLE_TAP_DISTANCE_PX
    ) {
      lastTouchTap = null;
      suppressGraphClickUntil = now + 450;
      zoomGraphAtClientPoint(point);
      return true;
    }

    lastTouchTap = { time: now, x: point.x, y: point.y };
    return false;
  }

  function selectGraphObject(object) {
    if (
      selectedGraphObject &&
      selectedGraphObject !== object &&
      selectedGraphObject.getState?.() === GraphObjectState.SELECTED
    ) {
      selectedGraphObject.setState(GraphObjectState.NONE, { isNotifySkipped: true });
    }
    selectedGraphObject = object || null;
    if (selectedGraphObject) {
      selectedGraphObject.setState(GraphObjectState.SELECTED, { isNotifySkipped: true });
    }
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

  function clearTouchHoldVisual() {
    container.style.removeProperty("--graph-touch-hold-x");
    container.style.removeProperty("--graph-touch-hold-y");
  }

  function finishTouchGesture() {
    clearTouchReleaseFallback();
    clearTouchHoldTimer();
    touchHold = null;
    touchDragBlockedUntilRelease = false;
    delete container.dataset.touchDrag;
    clearTouchHoldVisual();
    setDragEnabled(true);
    setZoomEnabled(true);
  }

  function cancelPendingTouchHold() {
    if (!touchHold || touchHold.activated) return;
    clearTouchHoldTimer();
    touchHold = null;
    touchDragBlockedUntilRelease = true;
    container.dataset.touchDrag = "cancelled";
    clearTouchHoldVisual();
    setDragEnabled(false);
    setZoomEnabled(true);
  }

  function touchGeometry(event) {
    const point = eventClientPoint(event);
    if (!point || !orb.canvas) return null;
    const rect = orb.canvas.getBoundingClientRect();
    const globalPoint = {
      x: Math.max(0, Math.min(rect.width, point.x - rect.left)),
      y: Math.max(0, Math.min(rect.height, point.y - rect.top))
    };
    const localPoint = orb.getSimulationPosition(globalPoint);
    return { event, globalPoint, localPoint };
  }

  function simulationRadiusForPixels(globalPoint, radiusPx) {
    if (!orb.canvas || !globalPoint) return 0;
    const rect = orb.canvas.getBoundingClientRect();
    const direction = globalPoint.x + radiusPx <= rect.width ? 1 : -1;
    const offsetPoint = {
      x: Math.max(0, Math.min(rect.width, globalPoint.x + radiusPx * direction)),
      y: globalPoint.y
    };
    const localStart = orb.getSimulationPosition(globalPoint);
    const localEnd = orb.getSimulationPosition(offsetPoint);
    return Math.hypot(localEnd.x - localStart.x, localEnd.y - localStart.y);
  }

  function expandedTouchNode(localPoint, globalPoint) {
    const exact = orb.data.getNearestNode(localPoint);
    if (exact) return exact;
    const minimumRadius = simulationRadiusForPixels(
      globalPoint,
      TOUCH_NODE_TARGET_DIAMETER_PX / 2
    );
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    const nodes = orb.data.getNodes();
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const node = nodes[index];
      const center = node.getCenter?.();
      if (!center || !Number.isFinite(center.x) || !Number.isFinite(center.y)) continue;
      const distance = Math.hypot(localPoint.x - center.x, localPoint.y - center.y);
      const hitRadius = Math.max(Number(node.getBorderedRadius?.()) || 0, minimumRadius);
      if (distance <= hitRadius && distance < bestDistance) {
        best = node;
        bestDistance = distance;
      }
    }
    return best;
  }

  function touchTargetPayload(event) {
    const geometry = touchGeometry(event);
    if (!geometry) return null;
    const node = expandedTouchNode(geometry.localPoint, geometry.globalPoint);
    if (node) return { ...geometry, kind: "node", object: node };
    const edgeTolerance = simulationRadiusForPixels(
      geometry.globalPoint,
      TOUCH_EDGE_TARGET_RADIUS_PX
    );
    const edge = orb.data.getNearestEdge(geometry.localPoint, edgeTolerance);
    return edge ? { ...geometry, kind: "edge", object: edge } : { ...geometry, kind: null, object: null };
  }

  function touchNodePayload(event) {
    const payload = touchTargetPayload(event);
    return payload?.kind === "node"
      ? { node: payload.object, event, globalPoint: payload.globalPoint, localPoint: payload.localPoint }
      : null;
  }

  function beginTouchHold({ node, event, globalPoint, localPoint }) {
    clearTouchReleaseFallback();
    clearTouchHoldTimer();
    setDragEnabled(false);
    setZoomEnabled(true);
    touchDragBlockedUntilRelease = true;

    if (activeTouchPointers.size > 1) {
      touchHold = null;
      container.dataset.touchDrag = "cancelled";
      return;
    }

    touchHold = {
      node,
      pointerId: event.pointerId,
      startClientPoint: eventClientPoint(event),
      startGlobalPoint: globalPoint,
      startLocalPoint: localPoint,
      activated: false,
      timer: 0
    };
    container.style.setProperty("--graph-touch-hold-x", globalPoint.x + "px");
    container.style.setProperty("--graph-touch-hold-y", globalPoint.y + "px");
    container.dataset.touchDrag = "holding";

    touchHold.timer = globalThis.setTimeout(() => {
      if (!touchHold || touchHold.node !== node || activeTouchPointers.size > 1) return;
      touchHold.activated = true;
      touchTap = null;
      lastTouchTap = null;
      touchDragBlockedUntilRelease = false;
      container.dataset.touchDrag = "active";
      setDragEnabled(true);
      setZoomEnabled(false);
      setInteractionHeat(DRAG_ALPHA_TARGET);
      selectGraphObject(node);
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
    const target = touchTargetPayload(event);
    touchTap = {
      pointerId: event.pointerId,
      startClientPoint: eventClientPoint(event),
      target,
      cancelled: false
    };
    if (activeTouchPointers.size > 1) {
      touchTap = null;
      lastTouchTap = null;
      if (touchHold && !touchHold.activated) cancelPendingTouchHold();
      touchDragBlockedUntilRelease = true;
      setDragEnabled(false);
      setZoomEnabled(true);
      return;
    }

    const payload = target?.kind === "node"
      ? { node: target.object, event, globalPoint: target.globalPoint, localPoint: target.localPoint }
      : null;
    if (payload) beginTouchHold(payload);
  }

  function onPointerMove(event) {
    if (event.pointerType !== "touch") return;
    if (touchTap?.pointerId === event.pointerId && !touchTap.cancelled) {
      const origin = touchTap.startClientPoint;
      if (origin) {
        const distance = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
        if (distance > TOUCH_NODE_MOVE_TOLERANCE_PX) {
          touchTap.cancelled = true;
          lastTouchTap = null;
        }
      }
    }
    if (!touchHold) return;
    if (touchHold.activated) {
      event.preventDefault();
      return;
    }
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
    const tap = touchTap?.pointerId === event.pointerId ? touchTap : null;
    activeTouchPointers.delete(event.pointerId);
    if (activeTouchPointers.size) {
      touchTap = null;
      return;
    }
    if (touchHold?.activated) {
      touchTap = null;
      lastTouchTap = null;
      scheduleTouchReleaseFallback();
      return;
    }
    finishTouchGesture();
    if (event.type === "pointercancel") {
      touchTap = null;
      lastTouchTap = null;
      return;
    }
    if (tap && !tap.cancelled) {
      const didDoubleTap = registerTouchTap(event, tap);
      if (!didDoubleTap && tap.target?.object) {
        suppressGraphClickUntil = performance.now() + 300;
        selectGraphObject(tap.target.object);
        if (tap.target.kind === "node") handlers.onNodeClick?.(tap.target.object.getData());
        if (tap.target.kind === "edge") handlers.onEdgeClick?.(tap.target.object.getData());
      }
    } else {
      touchTap = null;
    }
  }

  function onTouchEnd(event) {
    if (event.touches?.length) return;
    if (touchHold?.activated) {
      scheduleTouchReleaseFallback();
      return;
    }
    finishTouchGesture();
  }

  const onClickCapture = (event) => {
    if (performance.now() >= suppressGraphClickUntil) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  container.addEventListener("click", onClickCapture, { capture: true });
  container.addEventListener("pointerdown", onPointerDown, { capture: true });
  container.addEventListener("pointermove", onPointerMove, { capture: true });
  container.addEventListener("pointerup", onPointerUp, { capture: true });
  container.addEventListener("pointercancel", onPointerUp, { capture: true });
  container.addEventListener("touchend", onTouchEnd);
  container.addEventListener("touchcancel", onTouchEnd);

  function nodeStyle(data) {
    const type = semanticType(data);
    const transition = data?.__timelineTransition || "active";
    const exiting = transition === "exiting";
    const entering = transition === "entering";
    const baseColor =
      type === "event" ? palette.focus :
      type === "story" ? palette.story :
      type === "evidence" ? "#8a4f2b" :
      type === "place" ? "#3e6d5b" :
      type === "person" ? "#4b5f86" :
      type === "organization" ? "#6b526f" :
      palette.ink;
    const color = exiting ? palette.muted : baseColor;
    const size = type === "event" ? 12 : type === "story" ? 13 : 10;
    return {
      size: exiting ? Math.max(6, size * 0.72) : entering ? size * 0.88 : size,
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
      borderWidth: exiting ? 1 : 2,
      borderWidthSelected: 4,
      label: data?.label || String(data?.id || ""),
      fontSize: exiting ? 10 : 12,
      fontColor: exiting ? palette.muted : palette.ink,
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
    const transition = data?.__timelineTransition || "active";
    const releasing = transition === "releasing";
    const entering = transition === "entering";
    const inactive = state === "inactive";
    const changed = state === "changed";
    const timeless = state === "timeless";
    const semantic = edgeSemantic(data);
    const color = releasing
      ? palette.muted
      : inactive || timeless
        ? palette.muted
        : changed
          ? palette.story
          : semantic.color;
    return {
      color,
      colorHover: palette.focus,
      colorSelected: palette.focus,
      width: releasing ? 0.42 : entering ? 1.45 : inactive ? 0.35 : timeless ? 0.6 : changed ? 1.5 : 0.9,
      widthHover: 1.8,
      widthSelected: 2.2,
      arrowSize: releasing ? 0.65 : entering ? 1.45 : inactive ? 0.8 : 1.25,
      label: inactive ? "" : `${semantic.glyph} ${data?.label || ""}`.trim(),
      fontSize: 11,
      fontColor: color,
      fontBackgroundColor: palette.paper,
      lineStyle: releasing || inactive
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

  const onNodeClick = ({ node }) => {
    selectGraphObject(node);
    handlers.onNodeClick?.(node.getData());
  };
  const onEdgeClick = ({ edge }) => {
    selectGraphObject(edge);
    handlers.onEdgeClick?.(edge.getData());
  };
  const onNodeDragStart = () => {
    setInteractionHeat(DRAG_ALPHA_TARGET);
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

  function clearTopologyTimers() {
    for (const timer of topologyTimers) globalThis.clearTimeout(timer);
    topologyTimers.clear();
  }

  function scheduleTopologyStep(callback, delay) {
    const timer = globalThis.setTimeout(() => {
      topologyTimers.delete(timer);
      callback();
    }, delay);
    topologyTimers.add(timer);
  }

  function prefersReducedMotion() {
    return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  }

  function transitionRecord(record, state) {
    return { ...record, __timelineTransition: state };
  }

  function currentNodeRecords() {
    return orb.data.getNodes().map((node) => node.getData());
  }

  function currentEdgeRecords() {
    return orb.data.getEdges().map((edge) => edge.getData());
  }

  function markNodeTransition(id, state) {
    const node = orb.data.getNodeById(id);
    if (!node) return;
    const next = transitionRecord(node.getData(), state);
    node.setData(next, { isNotifySkipped: true });
    node.setStyle(nodeStyle(next), { isNotifySkipped: true });
  }

  function markEdgeTransition(id, state) {
    const edge = orb.data.getEdgeById(id);
    if (!edge) return;
    const next = transitionRecord(edge.getData(), state);
    edge.setData(next, { isNotifySkipped: true });
    edge.setStyle(edgeStyle(next), { isNotifySkipped: true });
  }

  function deterministicAngle(id) {
    const text = String(id);
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
    }
    return ((Math.abs(hash) % 360) * Math.PI) / 180;
  }

  function positionIncomingNodes(incomingNodes, desiredEdges) {
    const incomingIds = new Set(incomingNodes.map((node) => String(node.id)));
    for (const record of incomingNodes) {
      const node = orb.data.getNodeById(record.id);
      if (!node) continue;
      const adjacent = desiredEdges
        .filter((edge) => String(edge.start) === String(record.id) || String(edge.end) === String(record.id))
        .map((edge) => String(edge.start) === String(record.id) ? edge.end : edge.start);
      const anchorId = adjacent.find((id) => !incomingIds.has(String(id))) ?? adjacent[0];
      if (anchorId == null) continue;
      const anchor = orb.data.getNodeById(anchorId);
      const position = anchor?.getPosition?.();
      if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) continue;
      const angle = deterministicAngle(record.id);
      node.setPosition({
        x: position.x + Math.cos(angle) * TOPOLOGY_ENTRY_OFFSET,
        y: position.y + Math.sin(angle) * TOPOLOGY_ENTRY_OFFSET
      });
    }
  }

  function finalizeTopology(data) {
    const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
    const edges = Array.isArray(data?.edges) ? data.edges : [];
    const desiredNodeIds = new Set(nodes.map((node) => String(node.id)));
    const desiredEdgeIds = new Set(edges.map((edge) => String(edge.id)));
    const removeEdgeIds = currentEdgeRecords()
      .filter((edge) => !desiredEdgeIds.has(String(edge.id)))
      .map((edge) => edge.id);
    const removeNodeIds = currentNodeRecords()
      .filter((node) => !desiredNodeIds.has(String(node.id)))
      .map((node) => node.id);
    if (removeEdgeIds.length || removeNodeIds.length) {
      orb.data.remove({ edgeIds: removeEdgeIds, nodeIds: removeNodeIds });
    }
    orb.data.merge({
      nodes: nodes.map((node) => transitionRecord(node, "active")),
      edges: edges.map((edge) => transitionRecord(edge, "active"))
    });
    setPerformanceMode(nodes.length);
    orb.render();
  }

  function setData(data) {
    clearTopologyTimers();
    finishTouchGesture();
    selectedGraphObject = null;
    const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
    const edges = Array.isArray(data?.edges) ? data.edges : [];
    setPerformanceMode(nodes.length);
    firstRender = true;
    orb.data.setup({
      nodes: nodes.map((node) => transitionRecord(node, "active")),
      edges: edges.map((edge) => transitionRecord(edge, "active"))
    });
    hasGraphData = true;
    orb.render();
    handlers.onSimulationState?.({ running: true, mode: currentMode });
  }

  function transitionData(data) {
    if (!hasGraphData) {
      setData(data);
      return;
    }

    clearTopologyTimers();
    const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
    const edges = Array.isArray(data?.edges) ? data.edges : [];
    const currentNodes = currentNodeRecords();
    const currentEdges = currentEdgeRecords();
    const currentNodeIds = new Set(currentNodes.map((node) => String(node.id)));
    const currentEdgeById = new Map(currentEdges.map((edge) => [String(edge.id), edge]));
    const desiredNodeIds = new Set(nodes.map((node) => String(node.id)));
    const desiredEdgeIds = new Set(edges.map((edge) => String(edge.id)));

    const outgoingNodes = currentNodes.filter((node) => !desiredNodeIds.has(String(node.id)));
    const outgoingEdges = currentEdges.filter((edge) => !desiredEdgeIds.has(String(edge.id)));
    const incomingNodes = nodes.filter((node) => !currentNodeIds.has(String(node.id)));
    const rewiredEdges = edges.filter((edge) => {
      const current = currentEdgeById.get(String(edge.id));
      return current && (
        String(current.start) !== String(edge.start) ||
        String(current.end) !== String(edge.end)
      );
    });
    const rewiredIds = new Set(rewiredEdges.map((edge) => String(edge.id)));
    const enteringEdges = edges.filter((edge) => !currentEdgeById.has(String(edge.id)));
    const stableEdges = edges.filter((edge) => currentEdgeById.has(String(edge.id)) && !rewiredIds.has(String(edge.id)));

    if (prefersReducedMotion()) {
      const breakIds = [
        ...outgoingEdges.map((edge) => edge.id),
        ...rewiredEdges.map((edge) => currentEdgeById.get(String(edge.id))?.id)
      ].filter((id) => id != null);
      if (breakIds.length || outgoingNodes.length) {
        orb.data.remove({ edgeIds: [...new Set(breakIds)], nodeIds: outgoingNodes.map((node) => node.id) });
      }
      orb.data.merge({
        nodes: nodes.map((node) => transitionRecord(node, "active")),
        edges: edges.map((edge) => transitionRecord(edge, "active"))
      });
      setPerformanceMode(nodes.length);
      orb.render();
      applyInteractionForce(0);
      return;
    }

    setPerformanceMode(Math.max(currentNodes.length, nodes.length));
    orb.data.merge({
      nodes: nodes.map((node) => transitionRecord(node, currentNodeIds.has(String(node.id)) ? "active" : "entering"))
    });
    positionIncomingNodes(incomingNodes, edges);
    orb.data.merge({
      edges: [
        ...stableEdges.map((edge) => transitionRecord(edge, "active")),
        ...enteringEdges.map((edge) => transitionRecord(edge, "entering"))
      ]
    });

    for (const node of outgoingNodes) markNodeTransition(node.id, "exiting");
    for (const edge of outgoingEdges) markEdgeTransition(edge.id, "releasing");
    for (const edge of rewiredEdges) markEdgeTransition(currentEdgeById.get(String(edge.id))?.id, "releasing");

    orb.render();
    setInteractionHeat(TOPOLOGY_ALPHA_TARGET);

    scheduleTopologyStep(() => {
      const breakIds = [
        ...outgoingEdges.map((edge) => edge.id),
        ...rewiredEdges.map((edge) => currentEdgeById.get(String(edge.id))?.id)
      ].filter((id) => id != null);
      if (breakIds.length) orb.data.remove({ edgeIds: [...new Set(breakIds)] });
      if (rewiredEdges.length) {
        orb.data.merge({
          edges: rewiredEdges.map((edge) => transitionRecord(edge, "entering"))
        });
      }
      orb.render();
      setInteractionHeat(TOPOLOGY_ALPHA_TARGET);
    }, TOPOLOGY_EDGE_RELEASE_MS);

    scheduleTopologyStep(() => {
      if (outgoingNodes.length) {
        orb.data.remove({ nodeIds: outgoingNodes.map((node) => node.id) });
      }
      finalizeTopology(data);
      keepForceActiveAfterInteraction();
    }, TOPOLOGY_SETTLE_MS);
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
    transitionData,
    updateTemporalEdges,
    select(kind, id) {
      const object = kind === "edge"
        ? orb.data.getEdgeById(id)
        : orb.data.getNodeById(id);
      if (!object) return false;
      selectGraphObject(object);
      return true;
    },
    recenter() {
      orb.recenter();
    },
    refreshLayout() {
      if (!hasGraphData) return;
      orb.render(() => orb.recenter());
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
      clearTopologyTimers();
      container.removeEventListener("click", onClickCapture, true);
      container.removeEventListener("pointerdown", onPointerDown, true);
      container.removeEventListener("pointermove", onPointerMove, true);
      container.removeEventListener("pointerup", onPointerUp, true);
      container.removeEventListener("pointercancel", onPointerUp, true);
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
