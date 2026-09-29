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

/**
 * deck.gl computes globe fling distance as releaseVelocity * duration / 2.
 * A quadratic ease-out has derivative 2 at release and 0 at completion, so
 * that distance begins at exactly the measured drag velocity and decelerates
 * continuously to rest instead of accelerating on pointer-up.
 */
function velocityContinuousGlobeInertiaEasing(progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  return t * (2 - t);
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
 * deck.gl owns globe gesture recognition and weighted fling physics. Lūm adds
 * one mobile geographic convention: a one-finger touch pan may change
 * longitude/latitude, but it must not introduce camera roll. Preserve the
 * bearing present at touch-down through direct manipulation and any resulting
 * inertia transition. Explicit two-finger rotation, mouse rotation and
 * keyboard rotation remain untouched.
 */
class TimelineWeightedGlobeController extends GlobeController {
  readonly #touchBearing: TouchBearingConstraintState;
  #weightedPanCenter: [number, number] | null = null;
  #weightedPanLastTime = 0;

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

      this.#weightedPanCenter = raw;
      this.#weightedPanLastTime = globeEventTimestamp(event);
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
        ? ({ ...extraProps, transitionEasing: velocityContinuousGlobeInertiaEasing } as never)
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
 * WebGPU stays out of the default production graph. deck.gl 9.4 cannot pick
 * on its WebGPU backend yet, so the app remains WebGL2-first and loads the
 * experimental adapter only for the explicit `?renderer=webgpu` path.
 */
function createWebgpuOrWebgl2Adapter(webgpuAdapter: WebGpuAdapter): WebGpuAdapter {
  const webgpuUsable: Promise<boolean> = (async () => {
    try {
      const gpu = (
        globalThis.navigator as { gpu?: { requestAdapter(): Promise<unknown> } } | undefined
      )?.gpu;
      return Boolean(await gpu?.requestAdapter());
    } catch {
      return false;
    }
  })();

  return Object.assign(Object.create(webgpuAdapter), {
    async create(props: Parameters<WebGpuAdapter["create"]>[0]) {
      return (await webgpuUsable) ? webgpuAdapter.create(props) : webgl2Adapter.create(props);
    },
  });
}

function worldDeviceProps(webgpuAdapter?: WebGpuAdapter) {
  if (!webgpuAdapter) return { type: "webgl" as const };
  return {
    type: "best-available" as const,
    adapters: [createWebgpuOrWebgl2Adapter(webgpuAdapter)],
    // Deck only defaults to a premultiplied (transparent) canvas when the
    // type is exactly "webgpu"; without it WebGPU composites over black.
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
