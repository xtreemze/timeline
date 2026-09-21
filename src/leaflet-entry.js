import * as LeafletModule from "leaflet";

const Leaflet = LeafletModule.default || LeafletModule;

globalThis.L = Leaflet;
globalThis.TimelineLeafletReady = Promise.resolve(Leaflet);
