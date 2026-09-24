import type { DeckWorldBindings } from "./deck-world-runtime.ts";
import {
  createWorldViewFactory,
  type WorldViewFactory,
  type WorldViewFactoryOptions,
} from "./world-view-factory.ts";

export interface WorldViewRegistrationTarget {
  TimelineWorldView?: WorldViewFactory;
}

export type WorldViewRegistrationOptions = Omit<WorldViewFactoryOptions, "bindings">;

export function registerTimelineWorldView(
  bindings: DeckWorldBindings,
  options: WorldViewRegistrationOptions = {},
  target: WorldViewRegistrationTarget = globalThis as typeof globalThis &
    WorldViewRegistrationTarget,
): WorldViewFactory {
  const factory = createWorldViewFactory({
    bindings,
    ...options,
  });
  target.TimelineWorldView = factory;
  return factory;
}
