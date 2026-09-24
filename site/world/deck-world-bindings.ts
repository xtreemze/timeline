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
  _GlobeView as GlobeView,
  _GlobeViewport as GlobeViewport,
  MapView,
} from "@deck.gl/core";
import {
  IconLayer,
  PathLayer,
  ScatterplotLayer,
  SolidPolygonLayer,
  TextLayer,
} from "@deck.gl/layers";
import { webgl2Adapter } from "@luma.gl/webgl";
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
    globeViewport(props) {
      return new GlobeViewport(props as ConstructorParameters<typeof GlobeViewport>[0]);
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
}

export const realDeckWorldBindings = createRealDeckWorldBindings();

export async function loadRealDeckWorldBindings(): Promise<DeckWorldBindings> {
  const requested = new URLSearchParams(globalThis.location?.search ?? "").get("renderer");
  if (requested !== "webgpu") return realDeckWorldBindings;
  const { webgpuAdapter } = await import("@luma.gl/webgpu");
  return createRealDeckWorldBindings(webgpuAdapter);
}
