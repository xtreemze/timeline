/**
 * Real deck.gl bindings for the renderer-neutral DeckWorldRuntime adapter.
 *
 * This is the only module in the world execution path that is allowed to
 * import deck.gl/luma.gl directly. `deck-world-runtime.ts` and
 * `deck-world-surface.ts` stay renderer-neutral and depend only on the
 * structural `DeckWorldBindings` interface; this module fulfils that
 * interface with the actual `@deck.gl/core` / `@deck.gl/layers` classes.
 */
import { Deck, _GlobeView as GlobeView, MapView } from "@deck.gl/core";
import {
  IconLayer,
  PathLayer,
  ScatterplotLayer,
  SolidPolygonLayer,
  TextLayer,
} from "@deck.gl/layers";
import { webgl2Adapter } from "@luma.gl/webgl";
import { webgpuAdapter } from "@luma.gl/webgpu";
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

/**
 * Resolves true once the browser actually grants a WebGPU adapter. luma's
 * "best-available" only checks that `navigator.gpu` exists and then fails
 * outright when no adapter is granted (blocklisted GPU, headless, policy).
 */
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

/**
 * WebGPU adapter that falls back to WebGL2 when no WebGPU adapter is
 * granted, so device selection never fails the world view (Orb would then
 * take over).
 */
const webgpuOrWebgl2Adapter: typeof webgpuAdapter = Object.assign(Object.create(webgpuAdapter), {
  async create(props: Parameters<typeof webgpuAdapter.create>[0]) {
    return (await webgpuUsable) ? webgpuAdapter.create(props) : webgl2Adapter.create(props);
  },
});

/**
 * WebGL2 by default. deck.gl 9.4's WebGPU backend renders the globe but
 * cannot pick yet (synchronous readback is "not implemented" and async
 * readback returns empty), which would break clicking and dragging nodes.
 * `?renderer=webgpu` opts in to WebGPU (falling back to WebGL2 when no
 * adapter is granted) for evaluation until deck supports WebGPU picking.
 */
function worldDeviceProps() {
  const requested = new URLSearchParams(globalThis.location?.search ?? "").get("renderer");
  if (requested !== "webgpu") return { type: "webgl" as const };
  return {
    type: "best-available" as const,
    adapters: [webgpuOrWebgl2Adapter],
    // Deck only defaults to a premultiplied (transparent) canvas when the
    // type is exactly "webgpu"; without it WebGPU composites over black.
    createCanvasContext: { alphaMode: "premultiplied" as const },
  };
}

export const realDeckWorldBindings: DeckWorldBindings = Object.freeze({
  deck(props) {
    return wrapDeckInstance(
      new Deck({
        ...(props as ConstructorParameters<typeof Deck>[0]),
        deviceProps: worldDeviceProps(),
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
});
