import { Deck, _GlobeView as GlobeView, MapView } from "@deck.gl/core";
import { PathLayer, ScatterplotLayer } from "@deck.gl/layers";

import { registerTimelineWorldView } from "./world-view-registration.ts";

registerTimelineWorldView({
  deck(props) {
    const deck = new Deck(props as ConstructorParameters<typeof Deck>[0]);

    return {
      setProps(nextProps) {
        deck.setProps(nextProps as Parameters<Deck["setProps"]>[0]);
      },
      pickObject(options) {
        const info = deck.pickObject(
          options as Parameters<Deck["pickObject"]>[0],
        );
        if (!info) return null;
        return {
          object: info.object,
          ...(info.layer ? { layer: { id: info.layer.id } } : {}),
          x: info.x,
          y: info.y,
        };
      },
      getViewports(rect) {
        return deck.getViewports(
          rect as Parameters<Deck["getViewports"]>[0],
        );
      },
      redraw(force) {
        deck.redraw(force ? "forced by Lūm WorldSurface" : undefined);
      },
      finalize() {
        deck.finalize();
      },
    };
  },
  globeView(props) {
    return new GlobeView(props as ConstructorParameters<typeof GlobeView>[0]);
  },
  mapView(props) {
    return new MapView(props as ConstructorParameters<typeof MapView>[0]);
  },
  scatterplotLayer(props) {
    return new ScatterplotLayer(
      props as ConstructorParameters<typeof ScatterplotLayer>[0],
    );
  },
  pathLayer(props) {
    return new PathLayer(
      props as ConstructorParameters<typeof PathLayer>[0],
    );
  },
});
