/**
 * Real deck.gl bindings for the renderer-neutral DeckWorldRuntime adapter.
 *
 * This is the only module in the world execution path that is allowed to
 * import deck.gl/luma.gl directly. `deck-world-runtime.ts` and
 * `deck-world-surface.ts` stay renderer-neutral and depend only on the
 * structural `DeckWorldBindings` interface; this module fulfils that
 * interface with the actual `@deck.gl/core` / `@deck.gl/layers` classes.
 */
import {
  Deck,
  FlyToInterpolator,
  _GlobeController as GlobeController,
  _GlobeView as GlobeView,
  MapController,
  MapView,
} from "@deck.gl/core";
import { CollisionFilterExtension } from "@deck.gl/extensions";
import {
  IconLayer,
  PathLayer,
  ScatterplotLayer,
  SolidPolygonLayer,
  TextLayer,
} from "@deck.gl/layers";
import { webgl2Adapter } from "@luma.gl/webgl";
import { TimelineMotion } from "../timeline-motion.ts";
import type { DeckWorldBindings } from "./deck-world-runtime.ts";
import type { DeckRuntimeInstance, DeckRuntimePickingInfo } from "./deck-world-surface.ts";

function wrapDeckInstance(deck: InstanceType<typeof Deck>): DeckRuntimeInstance {
  return Object.freeze({
    setProps(props) {
      deck.setProps(props as Parameters<typeof deck.setProps>[0]);
    },
    pickObject(options) {
      return (deck.pickObject(options as Parameters<typeof deck.pickObject>[0]) ??
        null) as DeckRuntimePickingInfo | null;
    },
    async pickObjectAsync(options) {
      return (await deck.pickObjectAsync(
        options as Parameters<typeof deck.pickObjectAsync>[0],
      )) as DeckRuntimePickingInfo | null;
    },
    getViewports(rect) {
      return deck.getViewports(rect as Parameters<typeof deck.getViewports>[0]);
    },
    redraw(force) {
      deck.redraw(force);
    },
    finalize() {
      deck.finalize();
    },
  });
}

type WebGpuAdapter = typeof import("@luma.gl/webgpu")["webgpuAdapter"];

const WEIGHTED_GLOBE_DECAY = 5;
const WEIGHTED_GLOBE_NORMALIZATION = 1 / (1 - Math.exp(-WEIGHTED_GLOBE_DECAY));

function weightedGlobeEasing(progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  return (1 - Math.exp(-WEIGHTED_GLOBE_DECAY * t)) * WEIGHTED_GLOBE_NORMALIZATION;
}

type GlobeControllerEvent = Parameters<InstanceType<typeof GlobeController>["handleEvent"]>[0];
type GlobeControllerCenterEvent = Parameters<InstanceType<typeof GlobeController>["getCenter"]>[0];

function globeEventTimestamp(event: GlobeControllerCenterEvent): number {
  const candidate = event as GlobeControllerCenterEvent & {
    readonly timeStamp?: unknown;
    readonly srcEvent?: { readonly timeStamp?: unknown };
  };
  const timestamp = Number(candidate.srcEvent?.timeStamp ?? candidate.timeStamp);
  if (Number.isFinite(timestamp)) return timestamp;
  return globalThis.performance?.now?.() ?? Date.now();
}

interface TouchBearingConstraintState {
  bearing: number | null;
  singleTouchPan: boolean;
  awaitingTransitionEnd: boolean;
  inTransition: boolean;
}

interface WeightedPanSample {
  x: number;
  y: number;
  time: number;
}

function pointerTypeForGlobeEvent(event: GlobeControllerEvent): string | undefined {
  const candidate = event as GlobeControllerEvent & {
    readonly pointerType?: unknown;
    readonly srcEvent?: { readonly pointerType?: unknown };
  };
  if (typeof candidate.pointerType === "string") return candidate.pointerType;
  return typeof candidate.srcEvent?.pointerType === "string"
    ? candidate.srcEvent.pointerType
    : undefined;
}

/**
 * deck.gl owns globe gesture recognition and globe projection. Lūm filters
 * ordinary direct pan through the shared weighted response, then derives its
 * release velocity from that same rendered path including the lift timestamp.
 * This avoids handing a slowed/stationary pointer to deck.gl's older five-move
 * history. A one-finger touch pan may change longitude/latitude but must not
 * introduce camera roll. Explicit rotation and multi-touch remain deck-native.
 */
class TimelineWeightedGlobeController extends GlobeController {
  readonly #touchBearing: TouchBearingConstraintState;
  #weightedPanCenter: [number, number] | null = null;
  #weightedPanLastTime = 0;
  #weightedPanSamples: WeightedPanSample[] = [];

  constructor(options: ConstructorParameters<typeof GlobeController>[0]) {
    const touchBearing: TouchBearingConstraintState = {
      bearing: null,
      singleTouchPan: false,
      awaitingTransitionEnd: false,
      inTransition: false,
    };
    const clearTouchBearing = () => {
      touchBearing.bearing = null;
      touchBearing.awaitingTransitionEnd = false;
    };

    super({
      ...options,
      onViewStateChange: (parameters) => {
        const shouldLockBearing =
          touchBearing.bearing !== null &&
          (touchBearing.singleTouchPan || touchBearing.awaitingTransitionEnd);
        options.onViewStateChange({
          ...parameters,
          viewState: shouldLockBearing
            ? { ...parameters.viewState, bearing: touchBearing.bearing }
            : parameters.viewState,
        });
      },
      onStateChange: (interactionState) => {
        if (interactionState.inTransition === true) {
          touchBearing.inTransition = true;
        } else if (interactionState.inTransition === false) {
          touchBearing.inTransition = false;
          if (touchBearing.awaitingTransitionEnd && !touchBearing.singleTouchPan) {
            clearTouchBearing();
          }
        }
        options.onStateChange(interactionState);
      },
    });

    this.#touchBearing = touchBearing;
    this.transition = Object.assign({}, this.transition, {
      transitionDuration: TimelineMotion.INERTIA_TAU_MS,
      transitionEasing: weightedGlobeEasing,
    });
  }

  #clearWeightedPan(): void {
    this.#weightedPanCenter = null;
    this.#weightedPanLastTime = 0;
    this.#weightedPanSamples = [];
  }

  #appendWeightedPanSample(center: [number, number], time: number): void {
    this.#weightedPanSamples.push({ x: center[0], y: center[1], time });
    if (this.#weightedPanSamples.length > 24) {
      this.#weightedPanSamples.splice(0, this.#weightedPanSamples.length - 24);
    }
  }

  /**
   * deck.gl 9.4 applies the pointer center directly during globe pan. Filter
   * only ordinary one-pointer pan through Lūm's shared response curve. Its
   * globe controller records the resulting camera states for release inertia,
   * so the fling naturally continues from the weighted path without a second
   * inertia implementation. Rotation and multi-touch remain deck-native.
   */
  override getCenter(event: GlobeControllerCenterEvent): [number, number] {
    const raw = super.getCenter(event);

    if (event.type === "panstart") {
      const candidate = event as GlobeControllerCenterEvent & {
        readonly rightButton?: boolean;
      };
      const directPan = !candidate.rightButton && !this.isFunctionKeyPressed(event);
      if (!directPan) {
        this.#clearWeightedPan();
        return raw;
      }

      const now = globeEventTimestamp(event);
      this.#weightedPanCenter = raw;
      this.#weightedPanLastTime = now;
      this.#weightedPanSamples = [];
      this.#appendWeightedPanSample(raw, now);
      return raw;
    }

    const current = this.#weightedPanCenter;
    if (event.type !== "panmove" || !current) return raw;
    const now = globeEventTimestamp(event);
    const response = TimelineMotion.responseForElapsed(now - this.#weightedPanLastTime);
    this.#weightedPanLastTime = now;
    const weighted: [number, number] = [
      current[0] + (raw[0] - current[0]) * response,
      current[1] + (raw[1] - current[1]) * response,
    ];
    this.#weightedPanCenter = weighted;
    return weighted;
  }

  protected override _onPanMove(event: GlobeControllerCenterEvent): boolean {
    if (!this.dragPan || !this.#weightedPanCenter) {
      return super._onPanMove(event as never);
    }

    const pos = this.getCenter(event);
    const newControllerState = this.controllerState.pan({ pos } as never);
    this.updateViewport(
      newControllerState,
      { transitionDuration: 0 },
      { isDragging: true, isPanning: true },
    );
    this.#appendWeightedPanSample(pos, globeEventTimestamp(event));
    return true;
  }

  protected override _onPanMoveEnd(event: GlobeControllerCenterEvent): boolean {
    const center = this.#weightedPanCenter;
    if (!center) return super._onPanMoveEnd(event as never);

    const releaseTime = globeEventTimestamp(event);
    this.#appendWeightedPanSample(center, releaseTime);
    const velocity = TimelineMotion.estimatePointerVectorVelocity(this.#weightedPanSamples);

    if (
      this.dragPan &&
      this.inertia > 0 &&
      velocity.magnitude >= TimelineMotion.STOP_VELOCITY_PX_PER_MS
    ) {
      const endPos: [number, number] = [
        center[0] + TimelineMotion.releaseMomentumDistance(velocity.x, this.inertia),
        center[1] + TimelineMotion.releaseMomentumDistance(velocity.y, this.inertia),
      ];
      const newControllerState = this.controllerState.pan({ pos: endPos } as never).panEnd();
      this.updateViewport(
        newControllerState,
        {
          ...this._getTransitionProps(),
          transitionDuration: this.inertia,
          transitionEasing: TimelineMotion.releaseMomentumEasing,
        },
        { isDragging: false, isPanning: true },
      );
      return true;
    }

    const newControllerState = this.controllerState.panEnd();
    this.updateViewport(newControllerState, null, {
      isDragging: false,
      isPanning: false,
    });
    return true;
  }

  protected override updateViewport(
    newControllerState: unknown,
    extraProps: Record<string, unknown> | null = null,
    interactionState: { isDragging?: boolean; isPanning?: boolean } = {},
  ): void {
    const isPanRelease =
      interactionState.isDragging === false &&
      interactionState.isPanning === true &&
      extraProps !== null &&
      Number(extraProps.transitionDuration) > 0;

    super.updateViewport(
      newControllerState as never,
      isPanRelease
        ? ({ ...extraProps, transitionEasing: TimelineMotion.releaseMomentumEasing } as never)
        : (extraProps as never),
      interactionState as never,
    );
  }

  override handleEvent(event: GlobeControllerEvent): boolean {
    if (event.type === "panstart") {
      if (pointerTypeForGlobeEvent(event) === "touch") {
        const { bearing = 0 } = this.controllerState.getViewportProps();
        this.#touchBearing.bearing = bearing;
        this.#touchBearing.singleTouchPan = true;
        this.#touchBearing.awaitingTransitionEnd = false;
      } else {
        this.#touchBearing.bearing = null;
        this.#touchBearing.singleTouchPan = false;
        this.#touchBearing.awaitingTransitionEnd = false;
      }
    }

    const endsSingleTouchPan = event.type === "panend" && this.#touchBearing.singleTouchPan;
    if (endsSingleTouchPan) {
      this.#touchBearing.awaitingTransitionEnd = true;
    }

    if (event.type === "pinchstart" || event.type === "multipanstart") {
      this.#clearWeightedPan();
    }

    const handled = super.handleEvent(event);

    if (event.type === "panend") this.#clearWeightedPan();

    if (endsSingleTouchPan) {
      this.#touchBearing.singleTouchPan = false;
      if (!this.#touchBearing.inTransition) {
        this.#touchBearing.bearing = null;
        this.#touchBearing.awaitingTransitionEnd = false;
      }
    }

    return handled;
  }
}

/**
 * WebGPU stays opt-in until Lūm's interaction and visual certification suites
 * establish parity with the production WebGL2 backend. deck.gl 9.4 supports
 * async picking on WebGPU; unsupported extensions (notably collision filtering)
 * continue to use Lūm's CPU semantic/declutter fallback.
 */
export function worldDeviceProps(webgpuAdapter?: WebGpuAdapter) {
  if (!webgpuAdapter) return { type: "webgl" as const };
  return {
    type: "best-available" as const,
    // luma.gl selects the first usable backend and falls through to WebGL2 if
    // WebGPU device creation is unavailable or fails.
    adapters: [webgpuAdapter, webgl2Adapter],
    // Preserve transparent composition over the application's world surface.
    createCanvasContext: { alphaMode: "premultiplied" as const },
  };
}

function createRealDeckWorldBindings(webgpuAdapter?: WebGpuAdapter): DeckWorldBindings {
  return Object.freeze({
    deck(props) {
      return wrapDeckInstance(
        new Deck({
          ...(props as ConstructorParameters<typeof Deck>[0]),
          deviceProps: worldDeviceProps(webgpuAdapter),
          // Exposes the negotiated backend ("webgpu" | "webgl") to CSS/tests.
          onDeviceInitialized: (device) => {
            const parent = (props as { parent?: HTMLElement }).parent;
            parent?.setAttribute?.("data-world-renderer", device.type);
          },
        }),
      );
    },
    globeView(props) {
      return new GlobeView(props as ConstructorParameters<typeof GlobeView>[0]);
    },
    globeControllerType() {
      return TimelineWeightedGlobeController;
    },
    flyToInterpolator() {
      return new FlyToInterpolator();
    },
    mapControllerType() {
      return MapController;
    },
    mapView(props) {
      return new MapView(props as ConstructorParameters<typeof MapView>[0]);
    },
    scatterplotLayer(props) {
      return new ScatterplotLayer(props as ConstructorParameters<typeof ScatterplotLayer>[0]);
    },
    pathLayer(props) {
      return new PathLayer(props as ConstructorParameters<typeof PathLayer>[0]);
    },
    solidPolygonLayer(props) {
      return new SolidPolygonLayer(props as ConstructorParameters<typeof SolidPolygonLayer>[0]);
    },
    iconLayer(props) {
      return new IconLayer(props as ConstructorParameters<typeof IconLayer>[0]);
    },
    textLayer(props) {
      return new TextLayer(props as ConstructorParameters<typeof TextLayer>[0]);
    },
    // CollisionFilterExtension currently relies on WebGL picking passes.
    // Keep WebGPU on the existing CPU semantic/declutter fallback until the
    // deck backend supports the same extension behavior there.
    ...(webgpuAdapter
      ? {}
      : {
          collisionFilterExtension() {
            return new CollisionFilterExtension();
          },
        }),
  });
}

export const realDeckWorldBindings = createRealDeckWorldBindings();

export async function loadRealDeckWorldBindings(): Promise<DeckWorldBindings> {
  const requested = new URLSearchParams(globalThis.location?.search ?? "").get("renderer");
  if (requested !== "webgpu") return realDeckWorldBindings;
  const { webgpuAdapter } = await import("@luma.gl/webgpu");
  return createRealDeckWorldBindings(webgpuAdapter);
}
