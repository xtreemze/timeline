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

export const realDeckWorldBindings: DeckWorldBindings = Object.freeze({
  deck(props) {
    return wrapDeckInstance(new Deck(props as ConstructorParameters<typeof Deck>[0]));
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
