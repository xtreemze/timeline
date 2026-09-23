import type {
  DeckRuntimeInstance,
  DeckWorldRuntime,
} from "./deck-world-surface.ts";

export interface DeckWorldBindings {
  readonly deck: (
    props: Readonly<Record<string, unknown>>,
  ) => DeckRuntimeInstance;
  readonly globeView: (
    props: Readonly<Record<string, unknown>>,
  ) => unknown;
  readonly mapView?: (
    props: Readonly<Record<string, unknown>>,
  ) => unknown;
  readonly scatterplotLayer: (
    props: Readonly<Record<string, unknown>>,
  ) => unknown;
  readonly pathLayer: (
    props: Readonly<Record<string, unknown>>,
  ) => unknown;
}

export function createDeckWorldRuntime(
  bindings: DeckWorldBindings,
): DeckWorldRuntime {
  return Object.freeze({
    createDeck(props) {
      return bindings.deck(props);
    },
    createGlobeView(props) {
      return bindings.globeView(props);
    },
    ...(bindings.mapView
      ? {
          createMapView(props: Readonly<Record<string, unknown>>) {
            return bindings.mapView?.(props) ?? null;
          },
        }
      : {}),
    createScatterplotLayer(props) {
      return bindings.scatterplotLayer(props);
    },
    createPathLayer(props) {
      return bindings.pathLayer(props);
    },
  });
}
