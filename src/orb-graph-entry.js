import {
  EdgeLineStyleType,
  GraphObjectState,
  NodeShapeType,
  OrbEventType,
  OrbView,
} from "@memgraph/orb";
import {
  connectedGraphComponents,
  graphComponentTopologySignature,
  packComponentRects,
} from "./graph-component-packing.js";
import { createGraphSimulationCoordinator } from "./layout/graph-simulation-coordinator.ts";

const LARGE_GRAPH_NODE_THRESHOLD = 1200;
const GPU_LAYOUT_NODE_THRESHOLD = 3000;
const TOUCH_NODE_HOLD_MS = 420;
const TOUCH_NODE_MOVE_TOLERANCE_PX = 12;
const TOUCH_NODE_TARGET_DIAMETER_PX = 44;
const TOUCH_EDGE_TARGET_RADIUS_PX = 22;
const TOUCH_DOUBLE_TAP_MS = 320;
const TOUCH_DOUBLE_TAP_DISTANCE_PX = 28;
const GRAPH_DOUBLE_TAP_WHEEL_DELTA_PX = -280;
const GRAPH_MIN_ZOOM = 0.002;
const GRAPH_MAX_ZOOM = 2.5;
const GRAPH_KEYBOARD_PAN_PX = 72;
const INTERACTION_SETTLE_MS = 3400;
const DRAG_ALPHA_TARGET = 0.05;
const RELEASE_ALPHA_TARGET = 0.018;
const TOPOLOGY_ALPHA_TARGET = 0.028;
const TOPOLOGY_EDGE_RELEASE_MS = 360;
const TOPOLOGY_SETTLE_MS = 1100;
const TOPOLOGY_ENTRY_OFFSET = 36;
const COMPONENT_PACKING_GAP = 112;
const POPOVER_REJECTION_STRENGTH = -0.009;
const POPOVER_REJECTION_DENSE_STRENGTH = -0.006;
const CENTER_ATTRACTION_STRENGTH = 0.007;
const CENTER_ATTRACTION_DENSE_STRENGTH = 0.005;
const motion = globalThis.TimelineMotion;

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
  place: [
    "M12 22s7-6.1 7-13a7 7 0 1 0-14 0c0 6.9 7 13 7 13z",
    "M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  ],
  evidence: ["M5 3h10l4 4v14H5z", "M15 3v5h5", "M8 13h8", "M8 17h6"],
  organization: ["M4 21h16", "M6 21V8l6-5 6 5v13", "M9 11h1", "M14 11h1", "M9 15h1", "M14 15h1"],
  device: ["M5 4h14v12H5z", "M9 20h6", "M12 16v4"],
  account: ["M4 7h16v12H4z", "M4 10h16", "M8 15h4"],
  relation: [
    "M7 7h10",
    "M7 17h10",
    "M7 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
    "M21 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  ],
});

const iconCache = new Map();

function semanticType(data) {
  const type = String(data?.properties?.timelineType || "entity").toLowerCase();
  if (type === "chronology-item") return "event";
  if (type === "story") return "story";
  if (type.includes("person") || type.includes("group")) return "person";
  if (type.includes("place") || type.includes("location")) return "place";
  if (type.includes("evidence") || type.includes("document") || type.includes("record"))
    return "evidence";
  if (type.includes("organization") || type.includes("company") || type.includes("agency"))
    return "organization";
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
    story: resolvedColor(container, "--story", "#7256b5"),
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
  let cameraGesture = null;
  let cameraInertiaAnimationFrame = 0;
  let userOwnsCamera = false;
  let pendingAutoFit = false;
  let lastPackedTopologySignature = "";
  let interactionSettleTimer = 0;
  let competingGestureResumeTimer = 0;
  const competingPointerIds = new Set();
  let forceNodeCount = 0;
  let hasGraphData = false;
  let presentationForcePoint = null;
  let presentationForceFrame = 0;
  let presentationForceSettleTimer = 0;
  let presentationForceReleaseTimer = 0;
  const topologyTimers = new Set();
  const activeTouchPointers = new Set();

  const orb = new OrbView(container, {
    render: {
      type: "canvas",
      backgroundColor: null,
      fitZoomMargin: 0.14,
      minZoom: GRAPH_MIN_ZOOM,
      maxZoom: GRAPH_MAX_ZOOM,
      labelsIsEnabled: true,
      labelsOnEventIsEnabled: true,
      shadowIsEnabled: false,
      contextAlphaOnEvent: 0.18,
      contextAlphaOnEventIsEnabled: true,
    },
    layout: {
      type: "force",
      options: {
        links: { distance: 132, strength: 0.58, iterations: 2 },
        manyBody: { strength: -260, theta: 0.86, distanceMin: 20, distanceMax: 2400 },
        collision: { radius: 34, strength: 0.82, iterations: 3 },
        alpha: { alpha: 0.14, alphaMin: 0.004, alphaDecay: 0.026, alphaTarget: 0 },
        isSimulatingOnDataUpdate: false,
        isSimulatingOnSettingsUpdate: false,
        isSimulatingOnUnstick: true,
        isPhysicsEnabled: true,
        centering: { x: 0, y: 0, strength: 0.008 },
        positioning: {
          forceX: { x: 0, strength: CENTER_ATTRACTION_STRENGTH },
          forceY: { y: 0, strength: CENTER_ATTRACTION_STRENGTH },
        },
        useGPU: false,
      },
    },
    interaction: {
      isDragEnabled: true,
      isZoomEnabled: true,
    },
    zoomFitTransitionMs: 520,
  });

  const ORB_TOUCH_DRAG_EVENT_TYPES = new Set([
    "touchstart",
    "touchmove",
    "touchend",
    "touchcancel",
  ]);
  const ORB_NATIVE_CAMERA_DRAG_EVENT_TYPES = new Set(["mousedown"]);

  function removeOrbTouchDragListeners() {
    const canvas = orb.canvas;
    const listeners = Array.isArray(canvas?.__on) ? canvas.__on : null;
    if (!canvas || !listeners?.length) return;

    const retained = [];
    for (const listener of listeners) {
      const isTouchDragListener =
        listener?.name === "drag" && ORB_TOUCH_DRAG_EVENT_TYPES.has(listener.type);
      if (!isTouchDragListener) {
        retained.push(listener);
        continue;
      }
      canvas.removeEventListener(listener.type, listener.listener, listener.options);
    }

    if (retained.length) canvas.__on = retained;
    else delete canvas.__on;
  }

  // Orb 1.1.0 wires d3-drag before d3-zoom. d3-drag consumes touchstart and
  // touchmove when a node is its subject, which prevents camera navigation
  // from taking over when Timeline cancels a pending long press. Timeline owns
  // touch node dragging directly, so keep Orb drag for mouse input only.
  removeOrbTouchDragListeners();

  function removeOrbNativeCameraDragListeners() {
    const canvas = orb.canvas;
    const listeners = Array.isArray(canvas?.__on) ? canvas.__on : null;
    if (!canvas || !listeners?.length) return;

    const retained = [];
    for (const listener of listeners) {
      const isNativeCameraDrag =
        listener?.name === "zoom" && ORB_NATIVE_CAMERA_DRAG_EVENT_TYPES.has(listener.type);
      if (!isNativeCameraDrag) {
        retained.push(listener);
        continue;
      }
      canvas.removeEventListener(listener.type, listener.listener, listener.options);
    }

    if (retained.length) canvas.__on = retained;
    else delete canvas.__on;
  }

  // Timeline owns background mouse/pen camera dragging so it can use the same
  // weighted response and release decay as the chronology. Keep Orb/D3 wheel,
  // double-click, and multi-touch zoom listeners intact.
  removeOrbNativeCameraDragListeners();

  function visiblePopoverForcePoint() {
    const canvas = orb.canvas;
    if (!canvas) return null;
    const canvasRect = canvas.getBoundingClientRect();
    const canvasArea = canvasRect.width * canvasRect.height;
    if (canvasArea <= 0) return null;

    let bestOverlap = null;
    for (const popover of document.querySelectorAll("[popover]:popover-open")) {
      if (!(popover instanceof HTMLElement)) continue;
      // A graph rendered inside a focused popover should not repel itself.
      if (popover.contains(container) || container.contains(popover)) continue;
      const rect = popover.getBoundingClientRect();
      const left = Math.max(canvasRect.left, rect.left);
      const right = Math.min(canvasRect.right, rect.right);
      const top = Math.max(canvasRect.top, rect.top);
      const bottom = Math.min(canvasRect.bottom, rect.bottom);
      if (right <= left || bottom <= top) continue;
      const area = (right - left) * (bottom - top);
      if (bestOverlap && bestOverlap.area >= area) continue;
      bestOverlap = {
        area,
        canvasPoint: {
          x: (left + right) / 2 - canvasRect.left,
          y: (top + bottom) / 2 - canvasRect.top,
        },
      };
    }

    if (!bestOverlap) return null;
    const canvasPoint = bestOverlap.canvasPoint;
    const simulationPoint = orb.getSimulationPosition(canvasPoint);
    if (
      !simulationPoint ||
      !Number.isFinite(simulationPoint.x) ||
      !Number.isFinite(simulationPoint.y)
    ) {
      return null;
    }
    return {
      x: simulationPoint.x,
      y: simulationPoint.y,
      overlapRatio: Math.min(1, bestOverlap.area / canvasArea),
    };
  }

  function samePresentationForcePoint(left, right) {
    if (!left || !right) return left === right;
    return (
      Math.abs(left.x - right.x) < 0.5 &&
      Math.abs(left.y - right.y) < 0.5 &&
      Math.abs(left.overlapRatio - right.overlapRatio) < 0.01
    );
  }

  function updatePresentationForcePoint() {
    presentationForceFrame = 0;
    const next = visiblePopoverForcePoint();
    if (samePresentationForcePoint(presentationForcePoint, next)) return;
    presentationForcePoint = next;
    if (!hasGraphData) return;
    // Popover geometry changes have their own low-priority solve. They can
    // never cool topology or drag work because the coordinator owns ordering.
    if (presentationForceReleaseTimer) {
      globalThis.clearTimeout(presentationForceReleaseTimer);
      presentationForceReleaseTimer = 0;
    }
    requestSimulation("popover-exclusion", 0, { reheat: false });
    presentationForceReleaseTimer = globalThis.setTimeout(() => {
      presentationForceReleaseTimer = 0;
      releaseSimulation("popover-exclusion");
    }, 480);
  }

  function queuePresentationForceUpdate() {
    if (presentationForceSettleTimer) {
      globalThis.clearTimeout(presentationForceSettleTimer);
      presentationForceSettleTimer = 0;
    }
    if (presentationForceFrame) cancelAnimationFrame(presentationForceFrame);
    presentationForceFrame = requestAnimationFrame(updatePresentationForcePoint);
  }

  function settlePresentationForceUpdate(delay = 160) {
    if (presentationForceSettleTimer) globalThis.clearTimeout(presentationForceSettleTimer);
    presentationForceSettleTimer = globalThis.setTimeout(() => {
      presentationForceSettleTimer = 0;
      queuePresentationForceUpdate();
    }, delay);
  }

  const onPopoverToggle = () => queuePresentationForceUpdate();
  const onPresentationGeometryChange = () => settlePresentationForceUpdate();

  function forceAlphaProfile(nodeCount = forceNodeCount, alphaTarget = 0, reheat = true) {
    const dense = nodeCount >= 1000;
    return {
      alpha: reheat ? (dense ? 0.11 : 0.14) : dense ? 0.025 : 0.032,
      alphaMin: dense ? 0.005 : 0.004,
      alphaDecay: dense ? 0.028 : 0.026,
      alphaTarget,
    };
  }

  function forceLayoutOptions(nodeCount = forceNodeCount, alphaTarget = 0, reheat = true) {
    const dense = nodeCount >= 1000;
    const useGPU = currentMode === "gpu-main-force";
    const positioningStrength = presentationForcePoint
      ? dense
        ? POPOVER_REJECTION_DENSE_STRENGTH
        : POPOVER_REJECTION_STRENGTH
      : dense
        ? CENTER_ATTRACTION_DENSE_STRENGTH
        : CENTER_ATTRACTION_STRENGTH;
    const overlapScale = presentationForcePoint
      ? 0.85 + presentationForcePoint.overlapRatio * 0.35
      : 1;
    const targetX = presentationForcePoint?.x ?? 0;
    const targetY = presentationForcePoint?.y ?? 0;
    return {
      links: { distance: dense ? 128 : 168, strength: 0.5, iterations: 2 },
      manyBody: {
        strength: dense ? -185 : -285,
        theta: 0.84,
        distanceMin: 24,
        distanceMax: dense ? 1800 : 3200,
      },
      collision: {
        radius: dense ? 30 : 42,
        strength: 0.78,
        iterations: 3,
      },
      alpha: forceAlphaProfile(nodeCount, alphaTarget, reheat),
      isSimulatingOnDataUpdate: false,
      isSimulatingOnSettingsUpdate: false,
      isSimulatingOnUnstick: true,
      isPhysicsEnabled: true,
      centering: { x: 0, y: 0, strength: dense ? 0.005 : 0.008 },
      positioning: {
        forceX: { x: targetX, strength: positioningStrength * overlapScale },
        forceY: { y: targetY, strength: positioningStrength * overlapScale },
      },
      useGPU,
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

  function touchDragSimulator() {
    const simulator = forceSimulator();
    if (
      simulator &&
      typeof simulator.startDragNode === "function" &&
      typeof simulator.dragNode === "function" &&
      typeof simulator.endDragNode === "function"
    ) {
      return simulator;
    }
    return null;
  }

  function applySimulationRequest(request) {
    const layout = {
      type: "force",
      options: forceLayoutOptions(forceNodeCount, request.alphaTarget, request.reheat),
    };
    const simulator = forceSimulator();
    if (simulator) {
      simulator.setSettings(layout);
      if (request.reason !== "idle") simulator.activateSimulation();
      return;
    }
    // Orb does not expose simulation activation publicly in every renderer
    // mode. Keep settings behind Timeline's coordinator even on fallback.
    orb.setSettings({ layout });
  }

  const simulationCoordinator = createGraphSimulationCoordinator({
    apply: applySimulationRequest,
    stop() {
      const simulator = forceSimulator();
      if (simulator && typeof simulator.stopSimulation === "function") {
        simulator.stopSimulation();
      }
    },
  });

  function requestSimulation(reason, alphaTarget, { reheat = true } = {}) {
    return simulationCoordinator.request({ reason, alphaTarget, reheat });
  }

  function releaseSimulation(reason) {
    return simulationCoordinator.release(reason);
  }

  function clearInteractionSettleTimer() {
    if (!interactionSettleTimer) return;
    globalThis.clearTimeout(interactionSettleTimer);
    interactionSettleTimer = 0;
  }

  function setInteractionHeat(alphaTarget) {
    clearInteractionSettleTimer();
    requestSimulation("topology", alphaTarget);
  }

  function clearCompetingGestureResumeTimer() {
    if (!competingGestureResumeTimer) return;
    globalThis.clearTimeout(competingGestureResumeTimer);
    competingGestureResumeTimer = 0;
  }

  function isCompetingSurfaceTarget(target) {
    if (!(target instanceof Element)) return false;
    if (target.closest(".temporal-graph-canvas, .graph-lens")) return false;
    return Boolean(target.closest(".timeline-surface, .presentation-map, .leaflet-container"));
  }

  function pauseForceForCompetingGesture() {
    clearCompetingGestureResumeTimer();
    simulationCoordinator.suspend("competing-surface");
  }

  function resumeForceAfterCompetingGesture() {
    clearCompetingGestureResumeTimer();
    competingGestureResumeTimer = globalThis.setTimeout(() => {
      competingGestureResumeTimer = 0;
      if (competingPointerIds.size || !hasGraphData) return;
      simulationCoordinator.resume("competing-surface");
    }, 180);
  }

  const onCompetingPointerDown = (event) => {
    if (!isCompetingSurfaceTarget(event.target)) return;
    // Do not pause force if a node is currently being dragged
    if (touchHold?.activated) return;
    competingPointerIds.add(event.pointerId);
    pauseForceForCompetingGesture();
  };

  const onCompetingPointerEnd = (event) => {
    if (!competingPointerIds.delete(event.pointerId)) return;
    if (!competingPointerIds.size) resumeForceAfterCompetingGesture();
  };

  const onCompetingWheel = (event) => {
    if (!isCompetingSurfaceTarget(event.target)) return;
    pauseForceForCompetingGesture();
    resumeForceAfterCompetingGesture();
  };

  function keepForceActiveAfterInteraction() {
    clearInteractionSettleTimer();
    requestSimulation("post-drop", RELEASE_ALPHA_TARGET);
    interactionSettleTimer = globalThis.setTimeout(() => {
      interactionSettleTimer = 0;
      releaseSimulation("post-drop");
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

  function clampCameraTransform(transform) {
    if (
      !transform ||
      typeof transform.scale !== "function" ||
      !Number.isFinite(transform.k) ||
      transform.k <= 0
    ) {
      return null;
    }
    const boundedScale = Math.min(GRAPH_MAX_ZOOM, Math.max(GRAPH_MIN_ZOOM, transform.k));
    if (Math.abs(boundedScale - transform.k) < 1e-9) return transform;
    return transform.scale(boundedScale / transform.k);
  }

  function syncCameraZoomState() {
    const canvas = orb.canvas;
    const renderer = orb?._renderer;
    const transform = clampCameraTransform(renderer?.transform);
    if (!canvas || !transform) {
      if (
        canvas &&
        renderer?.transform &&
        (!Number.isFinite(renderer.transform.k) || renderer.transform.k <= 0)
      ) {
        orb.recenter();
      }
      return;
    }
    // D3 zoom updates canvas.__zoom before Orb's zoom callback runs. When
    // camera ownership is disabled, Orb intentionally ignores that callback,
    // so reset D3's private state to the renderer's authoritative transform
    // before changing ownership to avoid a jump on the next touch gesture.
    canvas.__zoom = transform;
    if (renderer && renderer.transform !== transform) renderer.transform = transform;
  }

  function setZoomEnabled(enabled) {
    syncCameraZoomState();
    orb.setSettings({ interaction: { isZoomEnabled: enabled } });
  }

  function cancelCameraInertia() {
    if (cameraInertiaAnimationFrame) cancelAnimationFrame(cameraInertiaAnimationFrame);
    cameraInertiaAnimationFrame = 0;
  }

  function markCameraOwnedByUser() {
    userOwnsCamera = true;
    pendingAutoFit = false;
  }

  function releaseCameraToAutoFit() {
    userOwnsCamera = false;
    pendingAutoFit = false;
  }

  function requestAutoFit() {
    if (!userOwnsCamera) pendingAutoFit = true;
  }

  function applyPendingAutoFit() {
    if (userOwnsCamera || !pendingAutoFit) return false;
    pendingAutoFit = false;
    orb.recenter();
    return true;
  }

  function applyCameraPan(deltaX, deltaY) {
    const canvas = orb.canvas;
    const transform = clampCameraTransform(canvas?.__zoom || orb?._renderer?.transform);
    if (!canvas || !transform || typeof transform.translate !== "function") return false;
    markCameraOwnedByUser();
    const next = transform.translate(deltaX / transform.k, deltaY / transform.k);
    canvas.__zoom = next;
    if (orb._renderer) orb._renderer.transform = next;
    orb.render();
    // Keep camera interaction cheap. The screen-space exclusion point is
    // reconciled after motion settles instead of restarting force each frame.
    settlePresentationForceUpdate();
    return true;
  }

  function startCameraInertia(velocity) {
    if (
      !velocity ||
      prefersReducedMotion() ||
      !motion?.decayVelocity ||
      velocity.magnitude < (motion.STOP_VELOCITY_PX_PER_MS || 0.012)
    ) {
      return;
    }
    cancelCameraInertia();
    let velocityX = velocity.x;
    let velocityY = velocity.y;
    let lastFrame = 0;

    const step = (now) => {
      cameraInertiaAnimationFrame = 0;
      const magnitude = Math.hypot(velocityX, velocityY);
      if (magnitude < (motion.STOP_VELOCITY_PX_PER_MS || 0.012)) return;

      const elapsed = lastFrame ? Math.min(48, Math.max(1, now - lastFrame)) : 16;
      lastFrame = now;
      velocityX = motion.decayVelocity(velocityX, elapsed);
      velocityY = motion.decayVelocity(velocityY, elapsed);
      if (!applyCameraPan(velocityX * elapsed, velocityY * elapsed)) return;

      if (Math.hypot(velocityX, velocityY) >= (motion.STOP_VELOCITY_PX_PER_MS || 0.012)) {
        cameraInertiaAnimationFrame = requestAnimationFrame(step);
      }
    };

    cameraInertiaAnimationFrame = requestAnimationFrame(step);
  }

  function beginCameraGesture(event, target) {
    cancelCameraInertia();
    const transform = orb.canvas?.__zoom || orb?._renderer?.transform;
    if (
      event.button !== 0 ||
      target?.object ||
      !transform ||
      typeof transform.translate !== "function" ||
      !motion?.appendPointerVectorSamples ||
      !motion?.estimatePointerVectorVelocity ||
      !motion?.responseForElapsed
    ) {
      cameraGesture = null;
      return;
    }
    const startClientPoint = eventClientPoint(event);
    if (!startClientPoint) {
      cameraGesture = null;
      return;
    }
    cameraGesture = {
      pointerId: event.pointerId,
      startClientPoint,
      startTransform: transform,
      weightedTransform: transform,
      lastTime: Number(event.timeStamp) || performance.now(),
      samples: [],
      moved: false,
    };
    motion.appendPointerVectorSamples(cameraGesture.samples, event);
    try {
      container.setPointerCapture?.(event.pointerId);
    } catch {
      // Weighted panning still works when pointer capture is unavailable.
    }
  }

  function updateCameraGesture(event) {
    if (!cameraGesture || cameraGesture.pointerId !== event.pointerId) return false;
    const gesture = cameraGesture;
    motion.appendPointerVectorSamples(gesture.samples, event);
    const origin = gesture.startClientPoint;
    if (!origin) return false;

    const deltaX = event.clientX - origin.x;
    const deltaY = event.clientY - origin.y;
    if (Math.hypot(deltaX, deltaY) > TOUCH_NODE_MOVE_TOLERANCE_PX) {
      gesture.moved = true;
    }

    const target = gesture.startTransform.translate(
      deltaX / gesture.startTransform.k,
      deltaY / gesture.startTransform.k,
    );
    const now = Number(event.timeStamp) || performance.now();
    const response = motion.responseForElapsed(now - gesture.lastTime);
    gesture.lastTime = now;
    const current = gesture.weightedTransform;
    const next = current.translate(
      ((target.x - current.x) * response) / current.k,
      ((target.y - current.y) * response) / current.k,
    );
    gesture.weightedTransform = next;
    if (orb.canvas) orb.canvas.__zoom = next;
    if (orb._renderer) orb._renderer.transform = next;
    orb.render();
    return true;
  }

  function finishCameraGesture(event) {
    if (!cameraGesture || cameraGesture.pointerId !== event.pointerId) return;
    const gesture = cameraGesture;
    cameraGesture = null;
    releaseTouchPointerCapture(event.pointerId);
    if (event.type === "pointercancel" || !gesture.moved) return;
    markCameraOwnedByUser();
    motion.appendPointerVectorSamples(gesture.samples, event);
    const velocity = motion.estimatePointerVectorVelocity(gesture.samples);
    suppressGraphClickUntil = performance.now() + 300;
    void motion.pulseHaptic?.("release");
    requestAnimationFrame(() => startCameraInertia(velocity));
  }

  function zoomGraphAtClientPoint(point) {
    if (!point || !orb.canvas) return;
    const event = new WheelEvent("wheel", {
      clientX: point.x,
      clientY: point.y,
      deltaY: GRAPH_DOUBLE_TAP_WHEEL_DELTA_PX,
      deltaMode: 0,
      bubbles: true,
      cancelable: true,
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

  function releaseTouchPointerCapture(pointerId) {
    if (!Number.isFinite(pointerId)) return;
    try {
      if (container.hasPointerCapture?.(pointerId)) container.releasePointerCapture(pointerId);
    } catch {
      // The browser can release capture before pointerup/pointercancel reaches us.
    }
  }

  function finishActiveTouchNodeDrag({ settle = true } = {}) {
    if (!touchHold?.activated) return false;
    const node = touchHold.node;
    const pointerId = touchHold.pointerId;
    const simulator = touchDragSimulator();
    if (simulator && node) simulator.endDragNode(node.getId());
    releaseSimulation("drag");
    // Mark inactive before releasing capture because browsers may dispatch
    // lostpointercapture synchronously from releasePointerCapture().
    touchHold.activated = false;
    releaseTouchPointerCapture(pointerId);
    if (settle) keepForceActiveAfterInteraction();
    return true;
  }

  function finishTouchGesture() {
    clearTouchReleaseFallback();
    clearTouchHoldTimer();
    if (touchHold?.activated) finishActiveTouchNodeDrag({ settle: false });
    touchHold = null;
    touchDragBlockedUntilRelease = false;
    delete container.dataset.touchDrag;
    clearTouchHoldVisual();
    setDragEnabled(true);
    setZoomEnabled(true);
  }

  function cancelPendingTouchHold() {
    if (!touchHold || touchHold.activated) return;
    markCameraOwnedByUser();
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
      y: Math.max(0, Math.min(rect.height, point.y - rect.top)),
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
      y: globalPoint.y,
    };
    const localStart = orb.getSimulationPosition(globalPoint);
    const localEnd = orb.getSimulationPosition(offsetPoint);
    return Math.hypot(localEnd.x - localStart.x, localEnd.y - localStart.y);
  }

  function expandedTouchNode(localPoint, globalPoint) {
    const exact = orb.data.getNearestNode(localPoint);
    if (exact) return exact;
    const minimumRadius = simulationRadiusForPixels(globalPoint, TOUCH_NODE_TARGET_DIAMETER_PX / 2);
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
      TOUCH_EDGE_TARGET_RADIUS_PX,
    );
    const edge = orb.data.getNearestEdge(geometry.localPoint, edgeTolerance);
    return edge
      ? { ...geometry, kind: "edge", object: edge }
      : { ...geometry, kind: null, object: null };
  }

  function _touchNodePayload(event) {
    const payload = touchTargetPayload(event);
    return payload?.kind === "node"
      ? {
          node: payload.object,
          event,
          globalPoint: payload.globalPoint,
          localPoint: payload.localPoint,
        }
      : null;
  }

  function beginTouchHold({ node, event, globalPoint, localPoint }) {
    clearTouchReleaseFallback();
    clearTouchHoldTimer();
    setDragEnabled(false);
    // Freeze the camera while the hold threshold is unresolved. If movement
    // exceeds the tolerance, cancelPendingTouchHold() re-enables camera zoom
    // before Orb receives the rest of that gesture.
    setZoomEnabled(false);
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
      timer: 0,
    };
    container.style.setProperty("--graph-touch-hold-x", `${globalPoint.x}px`);
    container.style.setProperty("--graph-touch-hold-y", `${globalPoint.y}px`);
    container.dataset.touchDrag = "holding";

    touchHold.timer = globalThis.setTimeout(() => {
      if (!touchHold || touchHold.node !== node || activeTouchPointers.size > 1) return;
      touchHold.activated = true;
      touchTap = null;
      lastTouchTap = null;
      touchDragBlockedUntilRelease = false;
      container.dataset.touchDrag = "active";
      // Once the long press resolves, Timeline owns this pointer. Do not rely
      // on Orb/D3 preserving a drag gesture that began while node dragging was
      // intentionally disabled during the hold threshold.
      setDragEnabled(false);
      setZoomEnabled(false);
      cancelCameraInertia();
      cameraGesture = null;
      const simulator = touchDragSimulator();
      // Apply force heat before entering the simulator's drag state so any
      // settings-driven simulation restart cannot clear or reorder drag setup.
      requestSimulation("drag", DRAG_ALPHA_TARGET);
      simulator?.startDragNode();
      try {
        container.setPointerCapture?.(touchHold.pointerId);
      } catch {
        // Pointer capture is an enhancement; direct simulator drag still works.
      }
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
    if (event.pointerType !== "touch" && event.button !== 0) return;
    const target = touchTargetPayload(event);
    if (event.pointerType !== "touch") {
      if (target?.kind === "node") {
        // Orb/D3 starts native mouse dragging from its later compatibility
        // mousedown handler. Apply force settings now, while capture-phase
        // pointerdown still precedes that drag start, so a settings-driven
        // simulation restart cannot disturb the active drag state.
        cancelCameraInertia();
        cameraGesture = null;
        requestSimulation("drag", DRAG_ALPHA_TARGET);
      } else {
        beginCameraGesture(event, target);
      }
      return;
    }

    activeTouchPointers.add(event.pointerId);
    if (activeTouchPointers.size > 1) {
      if (cameraGesture?.pointerId !== null && cameraGesture?.pointerId !== undefined)
        releaseTouchPointerCapture(cameraGesture.pointerId);
      cameraGesture = null;
      cancelCameraInertia();
      if (touchHold?.activated) {
        // An activated node drag owns the gesture until its original pointer
        // is released. Additional fingers must not turn camera zoom back on.
        touchTap = null;
        lastTouchTap = null;
        setDragEnabled(false);
        setZoomEnabled(false);
        return;
      }
      markCameraOwnedByUser();
    } else {
      beginCameraGesture(event, target);
    }
    touchTap = {
      pointerId: event.pointerId,
      startClientPoint: eventClientPoint(event),
      target,
      cancelled: false,
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

    const payload =
      target?.kind === "node"
        ? {
            node: target.object,
            event,
            globalPoint: target.globalPoint,
            localPoint: target.localPoint,
          }
        : null;
    if (payload) beginTouchHold(payload);
  }

  function onPointerMove(event) {
    // An activated touch node drag has exclusive ownership. Handle it before
    // camera motion so stale or interrupted camera state can never translate
    // the graph under the dragged node.
    if (
      event.pointerType === "touch" &&
      touchHold?.activated &&
      touchHold.pointerId === event.pointerId
    ) {
      event.preventDefault();
      event.stopPropagation();
      const geometry = touchGeometry(event);
      const simulator = touchDragSimulator();
      if (geometry && simulator) {
        simulator.dragNode(touchHold.node.getId(), geometry.localPoint);
        clearInteractionSettleTimer();
      }
      return;
    }

    updateCameraGesture(event);
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
    const origin = touchHold.startClientPoint;
    if (!origin) return;
    const distance = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
    if (distance > TOUCH_NODE_MOVE_TOLERANCE_PX) {
      cancelPendingTouchHold();
      beginCameraGesture(event, null);
    }
  }

  function _scheduleTouchReleaseFallback() {
    clearTouchReleaseFallback();
    touchReleaseFallback = globalThis.setTimeout(() => {
      if (touchHold?.activated || touchDragBlockedUntilRelease) finishTouchGesture();
    }, 48);
  }

  function onPointerUp(event) {
    finishCameraGesture(event);
    if (event.pointerType !== "touch") return;
    const tap = touchTap?.pointerId === event.pointerId ? touchTap : null;
    const ownsActiveNodeDrag = Boolean(
      touchHold?.activated && touchHold.pointerId === event.pointerId,
    );
    activeTouchPointers.delete(event.pointerId);

    if (ownsActiveNodeDrag) {
      touchTap = null;
      lastTouchTap = null;
      finishActiveTouchNodeDrag();
      // Keep the gesture exclusive until all contacts lift. D3 may have seen
      // the additional touch while zoom was disabled; handing it camera control
      // mid-gesture can produce a discontinuous transform.
      finishTouchGesture();
      if (activeTouchPointers.size) {
        setDragEnabled(false);
        setZoomEnabled(false);
        touchDragBlockedUntilRelease = true;
      }
      return;
    }

    if (activeTouchPointers.size) {
      touchTap = null;
      return;
    }
    if (touchHold?.activated) {
      touchTap = null;
      lastTouchTap = null;
      finishActiveTouchNodeDrag();
      finishTouchGesture();
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

  function onTouchMoveCapture(event) {
    if (activeTouchPointers.size > 1) settlePresentationForceUpdate();
    const nodeDragOwnsGesture = Boolean(touchHold?.activated);
    const weightedCameraOwnsGesture = Boolean(cameraGesture && activeTouchPointers.size === 1);
    if (!nodeDragOwnsGesture && !weightedCameraOwnsGesture) return;
    // Orb 1.1.0's camera uses D3 touch listeners on the canvas. Once Timeline
    // owns either an active node drag or a one-finger weighted camera pan,
    // block D3's direct touchmove path. Multi-touch remains available to D3
    // for pinch zoom because cameraGesture is cleared when a second touch lands.
    event.preventDefault();
    event.stopPropagation();
  }

  function onTouchEnd(event) {
    if (event.touches?.length) return;
    activeTouchPointers.clear();
    cameraGesture = null;
    if (touchHold?.activated) {
      finishActiveTouchNodeDrag();
      finishTouchGesture();
      return;
    }
    finishTouchGesture();
  }

  function abortTouchInteraction() {
    cancelCameraInertia();
    cameraGesture = null;
    touchTap = null;
    lastTouchTap = null;
    activeTouchPointers.clear();
    if (touchHold?.activated) finishActiveTouchNodeDrag();
    finishTouchGesture();
  }

  const onWindowBlur = () => abortTouchInteraction();
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      simulationCoordinator.suspend("hidden");
      abortTouchInteraction();
      return;
    }
    simulationCoordinator.resume("hidden");
  };

  const onClickCapture = (event) => {
    if (performance.now() >= suppressGraphClickUntil) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const onWheelCapture = () => {
    markCameraOwnedByUser();
    cancelCameraInertia();
    settlePresentationForceUpdate();
  };
  const onGraphKeyDown = (event) => {
    if (event.target !== container || event.altKey || event.ctrlKey || event.metaKey) return;
    let handled = true;
    cancelCameraInertia();
    switch (event.key) {
      case "ArrowLeft":
        applyCameraPan(GRAPH_KEYBOARD_PAN_PX, 0);
        break;
      case "ArrowRight":
        applyCameraPan(-GRAPH_KEYBOARD_PAN_PX, 0);
        break;
      case "ArrowUp":
        applyCameraPan(0, GRAPH_KEYBOARD_PAN_PX);
        break;
      case "ArrowDown":
        applyCameraPan(0, -GRAPH_KEYBOARD_PAN_PX);
        break;
      case "+":
      case "=":
        markCameraOwnedByUser();
        orb.zoomIn();
        break;
      case "-":
      case "_":
        markCameraOwnedByUser();
        orb.zoomOut();
        break;
      case "Home":
      case "0":
        releaseCameraToAutoFit();
        orb.recenter();
        break;
      default:
        handled = false;
    }
    if (handled) {
      event.preventDefault();
      queuePresentationForceUpdate();
    }
  };
  const onLostPointerCapture = (event) => {
    if (!touchHold?.activated || touchHold.pointerId !== event.pointerId) return;
    finishActiveTouchNodeDrag();
    finishTouchGesture();
  };

  container.addEventListener("click", onClickCapture, { capture: true });
  container.addEventListener("wheel", onWheelCapture, { capture: true, passive: true });
  container.addEventListener("keydown", onGraphKeyDown);
  container.addEventListener("pointerdown", onPointerDown, { capture: true });
  container.addEventListener("pointermove", onPointerMove, { capture: true });
  container.addEventListener("pointerup", onPointerUp, { capture: true });
  container.addEventListener("pointercancel", onPointerUp, { capture: true });
  container.addEventListener("lostpointercapture", onLostPointerCapture, { capture: true });
  container.addEventListener("touchmove", onTouchMoveCapture, { capture: true, passive: false });
  container.addEventListener("touchend", onTouchEnd);
  container.addEventListener("touchcancel", onTouchEnd);
  globalThis.addEventListener?.("blur", onWindowBlur);
  document.addEventListener("visibilitychange", onVisibilityChange);
  document.addEventListener("pointerdown", onCompetingPointerDown, true);
  document.addEventListener("pointerup", onCompetingPointerEnd, true);
  document.addEventListener("pointercancel", onCompetingPointerEnd, true);
  document.addEventListener("wheel", onCompetingWheel, { capture: true, passive: true });
  document.addEventListener("toggle", onPopoverToggle, true);
  globalThis.addEventListener?.("resize", onPresentationGeometryChange);

  function nodeStyle(data) {
    const type = semanticType(data);
    const transition = data?.__timelineTransition || "active";
    const exiting = transition === "exiting";
    const entering = transition === "entering";
    const baseColor =
      type === "event"
        ? palette.focus
        : type === "story"
          ? palette.story
          : type === "evidence"
            ? "#8a4f2b"
            : type === "place"
              ? "#3e6d5b"
              : type === "person"
                ? "#4b5f86"
                : type === "organization"
                  ? "#6b526f"
                  : palette.ink;
    const color = exiting ? palette.muted : baseColor;
    const size = type === "event" ? 12 : type === "story" ? 13 : 10;
    return {
      size: exiting ? Math.max(6, size * 0.72) : entering ? size * 0.88 : size,
      mass: type === "event" ? 3.4 : type === "story" ? 3 : 1.8,
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
      zIndex: type === "event" ? 4 : type === "story" ? 3 : 2,
    };
  }

  function edgeSemantic(data) {
    const label = String(data?.label || "").toLowerCase();
    if (/call|message|email|contact|communicat/.test(label))
      return { glyph: "☎", color: "#496f8c" };
    if (/transfer|own|pay|send|receive|deliver/.test(label))
      return { glyph: "⇢", color: "#8a5b2d" };
    if (/authoriz|approv|decid|permit/.test(label)) return { glyph: "✓", color: palette.story };
    if (/investigat|review|audit|inspect|verify/.test(label))
      return { glyph: "⌕", color: "#596b86" };
    if (/occur|locat|visit|travel|arriv/.test(label)) return { glyph: "⌖", color: "#3e6d5b" };
    if (/interview|witness|particip|meet|corroborat/.test(label))
      return { glyph: "↔", color: "#6b526f" };
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
      width: releasing
        ? 0.42
        : entering
          ? 1.45
          : inactive
            ? 0.35
            : timeless
              ? 0.6
              : changed
                ? 1.5
                : 0.9,
      widthHover: 1.8,
      widthSelected: 2.2,
      arrowSize: releasing ? 0.65 : entering ? 1.45 : inactive ? 0.8 : 1.25,
      label: inactive ? "" : `${semantic.glyph} ${data?.label || ""}`.trim(),
      fontSize: 11,
      fontColor: color,
      fontBackgroundColor: palette.paper,
      lineStyle:
        releasing || inactive
          ? { type: EdgeLineStyleType.DASHED }
          : { type: EdgeLineStyleType.SOLID },
    };
  }

  orb.data.setDefaultStyle({
    getNodeStyle(node) {
      return nodeStyle(node.getData());
    },
    getEdgeStyle(edge) {
      return edgeStyle(edge.getData());
    },
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
    // Capture-phase pointerdown already requested drag heat before Orb enters
    // native drag state. Do not independently restart the simulator here.
    clearInteractionSettleTimer();
  };
  const onNodeDrag = () => {
    clearInteractionSettleTimer();
  };
  const onNodeDragEnd = (payload) => {
    releaseSimulation("drag");
    keepForceActiveAfterInteraction();
    if (isTouchInput(payload.event) && touchHold?.activated) finishTouchGesture();
  };
  const onSimulationStart = () =>
    handlers.onSimulationState?.({ running: true, mode: currentMode });
  const onSimulationEnd = ({ durationMs }) => {
    handlers.onSimulationState?.({ running: false, mode: currentMode, durationMs });
    const simulationState = simulationCoordinator.getState();
    if (simulationState.reason === "topology" && topologyTimers.size === 0) {
      releaseSimulation("topology");
    }
    if (firstRender) {
      firstRender = false;
      requestAutoFit();
    }
    if (packDisconnectedComponents()) requestAutoFit();
    applyPendingAutoFit();
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
    // Renderer switches recreate the canvas and re-register Orb's D3 handlers.
    removeOrbTouchDragListeners();
    removeOrbNativeCameraDragListeners();
    orb.setSettings({
      render: {
        labelsIsEnabled: nodeCount < 1800,
        labelsOnEventIsEnabled: true,
        shadowIsEnabled: false,
        minZoom: GRAPH_MIN_ZOOM,
        maxZoom: GRAPH_MAX_ZOOM,
      },
      layout: {
        type: "force",
        options: {
          ...forceLayoutOptions(nodeCount, 0),
          useGPU: wantsGPU,
        },
      },
    });
    queuePresentationForceUpdate();
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

  function packDisconnectedComponents() {
    const nodeRecords = currentNodeRecords();
    const edgeRecords = currentEdgeRecords();
    const signature = graphComponentTopologySignature(nodeRecords, edgeRecords);
    if (signature === lastPackedTopologySignature) return false;
    lastPackedTopologySignature = signature;

    const components = connectedGraphComponents(nodeRecords, edgeRecords);
    if (components.length <= 1) return false;

    const nodeObjects = new Map(
      orb.data
        .getNodes()
        .map((node) => [String(node.getData()?.id ?? ""), node])
        .filter(([id]) => id),
    );
    const componentRects = [];

    for (const component of components) {
      let minX = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      for (const id of component) {
        const node = nodeObjects.get(String(id));
        const position = node?.getPosition?.() || node?.getCenter?.();
        if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) continue;
        const radius = Math.max(18, Number(node?.getBorderedRadius?.()) || 0);
        minX = Math.min(minX, position.x - radius);
        maxX = Math.max(maxX, position.x + radius);
        minY = Math.min(minY, position.y - radius);
        maxY = Math.max(maxY, position.y + radius);
      }

      if (![minX, maxX, minY, maxY].every(Number.isFinite)) continue;
      componentRects.push({
        key: component[0],
        nodeIds: component,
        minX,
        maxX,
        minY,
        maxY,
      });
    }

    if (componentRects.length <= 1) return false;

    const width = Math.max(1, Number(container.clientWidth) || 1);
    const height = Math.max(1, Number(container.clientHeight) || 1);
    const aspectRatio = Math.max(0.35, Math.min(3, width / height));
    const plan = packComponentRects(componentRects, {
      aspectRatio,
      gap: COMPONENT_PACKING_GAP,
    });
    const offsets = new Map(plan.placements.map((placement) => [placement.key, placement]));
    let moved = false;

    for (const component of componentRects) {
      const offset = offsets.get(component.key);
      if (!offset || !Number.isFinite(offset.dx) || !Number.isFinite(offset.dy)) continue;
      if (Math.abs(offset.dx) < 1 && Math.abs(offset.dy) < 1) continue;

      for (const id of component.nodeIds) {
        const node = nodeObjects.get(String(id));
        const position = node?.getPosition?.() || node?.getCenter?.();
        if (!node || !position || !Number.isFinite(position.x) || !Number.isFinite(position.y))
          continue;
        node.setPosition({
          x: position.x + offset.dx,
          y: position.y + offset.dy,
        });
      }
      moved = true;
    }

    if (moved) orb.render();
    return moved;
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
        .filter(
          (edge) =>
            String(edge.start) === String(record.id) || String(edge.end) === String(record.id),
        )
        .map((edge) => (String(edge.start) === String(record.id) ? edge.end : edge.start));
      const anchorId = adjacent.find((id) => !incomingIds.has(String(id))) ?? adjacent[0];
      if (anchorId === null || anchorId === undefined) continue;
      const anchor = orb.data.getNodeById(anchorId);
      const position = anchor?.getPosition?.();
      if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) continue;
      const angle = deterministicAngle(record.id);
      node.setPosition({
        x: position.x + Math.cos(angle) * TOPOLOGY_ENTRY_OFFSET,
        y: position.y + Math.sin(angle) * TOPOLOGY_ENTRY_OFFSET,
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
      edges: edges.map((edge) => transitionRecord(edge, "active")),
    });
    setPerformanceMode(nodes.length);
    orb.render();
  }

  function setData(data) {
    clearTopologyTimers();
    cancelCameraInertia();
    cameraGesture = null;
    finishTouchGesture();
    releaseCameraToAutoFit();
    lastPackedTopologySignature = "";
    selectedGraphObject = null;
    const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
    const edges = Array.isArray(data?.edges) ? data.edges : [];
    setPerformanceMode(nodes.length);
    firstRender = true;
    orb.data.setup({
      nodes: nodes.map((node) => transitionRecord(node, "active")),
      edges: edges.map((edge) => transitionRecord(edge, "active")),
    });
    hasGraphData = true;
    requestSimulation("topology", 0);
    orb.render();
    queuePresentationForceUpdate();
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
      return (
        current &&
        (String(current.start) !== String(edge.start) || String(current.end) !== String(edge.end))
      );
    });
    const rewiredIds = new Set(rewiredEdges.map((edge) => String(edge.id)));
    const enteringEdges = edges.filter((edge) => !currentEdgeById.has(String(edge.id)));
    const stableEdges = edges.filter(
      (edge) => currentEdgeById.has(String(edge.id)) && !rewiredIds.has(String(edge.id)),
    );
    const topologyChanged = Boolean(
      outgoingNodes.length ||
        outgoingEdges.length ||
        incomingNodes.length ||
        enteringEdges.length ||
        rewiredEdges.length,
    );
    if (topologyChanged) requestAutoFit();
    if (!topologyChanged) {
      orb.data.merge({
        nodes: nodes.map((node) => transitionRecord(node, "active")),
        edges: edges.map((edge) => transitionRecord(edge, "active")),
      });
      setPerformanceMode(nodes.length);
      orb.render();
      return;
    }

    if (prefersReducedMotion()) {
      const breakIds = [
        ...outgoingEdges.map((edge) => edge.id),
        ...rewiredEdges.map((edge) => currentEdgeById.get(String(edge.id))?.id),
      ].filter((id) => id !== null && id !== undefined);
      if (breakIds.length || outgoingNodes.length) {
        orb.data.remove({
          edgeIds: [...new Set(breakIds)],
          nodeIds: outgoingNodes.map((node) => node.id),
        });
      }
      orb.data.merge({
        nodes: nodes.map((node) => transitionRecord(node, "active")),
        edges: edges.map((edge) => transitionRecord(edge, "active")),
      });
      setPerformanceMode(nodes.length);
      orb.render();
      requestSimulation("topology", TOPOLOGY_ALPHA_TARGET, { reheat: false });
      return;
    }

    setPerformanceMode(Math.max(currentNodes.length, nodes.length));
    orb.data.merge({
      nodes: nodes.map((node) =>
        transitionRecord(node, currentNodeIds.has(String(node.id)) ? "active" : "entering"),
      ),
    });
    positionIncomingNodes(incomingNodes, edges);
    orb.data.merge({
      edges: [
        ...stableEdges.map((edge) => transitionRecord(edge, "active")),
        ...enteringEdges.map((edge) => transitionRecord(edge, "entering")),
      ],
    });

    for (const node of outgoingNodes) markNodeTransition(node.id, "exiting");
    for (const edge of outgoingEdges) markEdgeTransition(edge.id, "releasing");
    for (const edge of rewiredEdges)
      markEdgeTransition(currentEdgeById.get(String(edge.id))?.id, "releasing");

    orb.render();
    setInteractionHeat(TOPOLOGY_ALPHA_TARGET);

    scheduleTopologyStep(() => {
      const breakIds = [
        ...outgoingEdges.map((edge) => edge.id),
        ...rewiredEdges.map((edge) => currentEdgeById.get(String(edge.id))?.id),
      ].filter((id) => id !== null && id !== undefined);
      if (breakIds.length) orb.data.remove({ edgeIds: [...new Set(breakIds)] });
      if (rewiredEdges.length) {
        orb.data.merge({
          edges: rewiredEdges.map((edge) => transitionRecord(edge, "entering")),
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
      releaseSimulation("topology");
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
      const object = kind === "edge" ? orb.data.getEdgeById(id) : orb.data.getNodeById(id);
      if (!object) return false;
      selectGraphObject(object);
      return true;
    },
    recenter() {
      cancelCameraInertia();
      cameraGesture = null;
      releaseCameraToAutoFit();
      orb.recenter();
    },
    refreshLayout() {
      if (!hasGraphData) return;
      orb.render(() => {
        if (!userOwnsCamera) orb.recenter();
        queuePresentationForceUpdate();
      });
    },
    zoomIn() {
      cancelCameraInertia();
      markCameraOwnedByUser();
      orb.zoomIn();
    },
    zoomOut() {
      cancelCameraInertia();
      markCameraOwnedByUser();
      orb.zoomOut();
    },
    getNodePosition(id) {
      const position = orb.data.getNodeById(id)?.getPosition?.();
      if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return null;
      return { x: position.x, y: position.y };
    },
    getNodeCanvasPosition(id) {
      const position = orb.data.getNodeById(id)?.getPosition?.();
      if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return null;
      const canvasPoint = orb.getCanvasPosition(position);
      if (
        !canvasPoint ||
        !Number.isFinite(canvasPoint.x) ||
        !Number.isFinite(canvasPoint.y)
      ) {
        return null;
      }
      return { x: canvasPoint.x, y: canvasPoint.y };
    },
    getMode() {
      return currentMode;
    },
    getSimulationState() {
      return simulationCoordinator.getState();
    },
    destroy() {
      cancelCameraInertia();
      cameraGesture = null;
      finishTouchGesture();
      clearInteractionSettleTimer();
      clearCompetingGestureResumeTimer();
      if (presentationForceFrame) cancelAnimationFrame(presentationForceFrame);
      presentationForceFrame = 0;
      if (presentationForceSettleTimer) globalThis.clearTimeout(presentationForceSettleTimer);
      presentationForceSettleTimer = 0;
      if (presentationForceReleaseTimer) globalThis.clearTimeout(presentationForceReleaseTimer);
      presentationForceReleaseTimer = 0;
      simulationCoordinator.clear();
      competingPointerIds.clear();
      clearTopologyTimers();
      container.removeEventListener("click", onClickCapture, true);
      container.removeEventListener("wheel", onWheelCapture, true);
      container.removeEventListener("keydown", onGraphKeyDown);
      container.removeEventListener("pointerdown", onPointerDown, true);
      container.removeEventListener("pointermove", onPointerMove, true);
      container.removeEventListener("pointerup", onPointerUp, true);
      container.removeEventListener("pointercancel", onPointerUp, true);
      container.removeEventListener("lostpointercapture", onLostPointerCapture, true);
      container.removeEventListener("touchmove", onTouchMoveCapture, true);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
      globalThis.removeEventListener?.("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("pointerdown", onCompetingPointerDown, true);
      document.removeEventListener("pointerup", onCompetingPointerEnd, true);
      document.removeEventListener("pointercancel", onCompetingPointerEnd, true);
      document.removeEventListener("wheel", onCompetingWheel, true);
      document.removeEventListener("toggle", onPopoverToggle, true);
      globalThis.removeEventListener?.("resize", onPresentationGeometryChange);
      orb.events.off(OrbEventType.NODE_CLICK, onNodeClick);
      orb.events.off(OrbEventType.EDGE_CLICK, onEdgeClick);
      orb.events.off(OrbEventType.NODE_DRAG_START, onNodeDragStart);
      orb.events.off(OrbEventType.NODE_DRAG, onNodeDrag);
      orb.events.off(OrbEventType.NODE_DRAG_END, onNodeDragEnd);
      orb.events.off(OrbEventType.SIMULATION_START, onSimulationStart);
      orb.events.off(OrbEventType.SIMULATION_END, onSimulationEnd);
      orb.destroy();
    },
  });
}

globalThis.TimelineOrbGraph = Object.freeze({
  create,
  version: "1.1.0",
});
