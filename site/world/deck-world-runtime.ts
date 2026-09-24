import type {
  DeckRuntimeInstance,
  DeckRuntimeViewport,
  DeckWorldRuntime,
} from "./deck-world-surface.ts";

export interface DeckWorldBindings {
  readonly deck: (props: Readonly<Record<string, unknown>>) => DeckRuntimeInstance;
  readonly globeView: (props: Readonly<Record<string, unknown>>) => unknown;
  readonly globeViewport?: (props: Readonly<Record<string, unknown>>) => DeckRuntimeViewport;
  readonly mapView?: (props: Readonly<Record<string, unknown>>) => unknown;
  readonly mapViewport?: (props: Readonly<Record<string, unknown>>) => DeckRuntimeViewport;
  readonly scatterplotLayer: (props: Readonly<Record<string, unknown>>) => unknown;
  readonly pathLayer: (props: Readonly<Record<string, unknown>>) => unknown;
  readonly textLayer?: (props: Readonly<Record<string, unknown>>) => unknown;
  readonly iconLayer?: (props: Readonly<Record<string, unknown>>) => unknown;
  readonly solidPolygonLayer?: (props: Readonly<Record<string, unknown>>) => unknown;
}

export function createDeckWorldRuntime(bindings: DeckWorldBindings): DeckWorldRuntime {
  const globeViewport = bindings.globeViewport;
  const mapView = bindings.mapView;
  const mapViewport = bindings.mapViewport;
  return Object.freeze({
    createDeck(props) {
      return bindings.deck(props);
    },
    createGlobeView(props) {
      return bindings.globeView(props);
    },
    ...(globeViewport
      ? {
          createGlobeViewport(props: Readonly<Record<string, unknown>>) {
            return globeViewport(props);
          },
        }
      : {}),
    ...(mapView
      ? {
          createMapView(props: Readonly<Record<string, unknown>>) {
            return mapView(props);
          },
        }
      : {}),
    ...(mapViewport
      ? {
          createMapViewport(props: Readonly<Record<string, unknown>>) {
            return mapViewport(props);
          },
        }
      : {}),
    createScatterplotLayer(props) {
      return bindings.scatterplotLayer(props);
    },
    createPathLayer(props) {
      return bindings.pathLayer(props);
    },
    ...(bindings.solidPolygonLayer
      ? {
          createSolidPolygonLayer(props: Readonly<Record<string, unknown>>) {
            return bindings.solidPolygonLayer?.(props) ?? null;
          },
        }
      : {}),
    ...(bindings.iconLayer
      ? {
          createIconLayer(props: Readonly<Record<string, unknown>>) {
            return bindings.iconLayer?.(props) ?? null;
          },
        }
      : {}),
    ...(bindings.textLayer
      ? {
          createTextLayer(props: Readonly<Record<string, unknown>>) {
            return bindings.textLayer?.(props) ?? null;
          },
        }
      : {}),
  });
}
