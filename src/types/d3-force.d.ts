declare module "d3-force" {
  export interface SimulationNodeDatum {
    index?: number;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
  }

  export interface SimulationLinkDatum<NodeDatum extends SimulationNodeDatum> {
    source: NodeDatum | string | number;
    target: NodeDatum | string | number;
    index?: number;
  }

  export interface Simulation<
    NodeDatum extends SimulationNodeDatum,
    LinkDatum extends SimulationLinkDatum<NodeDatum>,
  > {
    alpha(): number;
    alpha(value: number): this;
    alphaMin(): number;
    alphaMin(value: number): this;
    alphaDecay(value: number): this;
    alphaTarget(value: number): this;
    force(name: string, force: unknown | null): this;
    stop(): this;
    tick(iterations?: number): this;
  }

  export interface ForceLink<
    NodeDatum extends SimulationNodeDatum,
    LinkDatum extends SimulationLinkDatum<NodeDatum>,
  > {
    id(accessor: (node: NodeDatum) => string | number): this;
    distance(distance: number | ((link: LinkDatum) => number)): this;
    strength(strength: number | ((link: LinkDatum) => number)): this;
  }

  export interface ForceManyBody<NodeDatum extends SimulationNodeDatum> {
    strength(strength: number | ((node: NodeDatum) => number)): this;
    distanceMin(distance: number): this;
    distanceMax(distance: number): this;
  }

  export interface ForceCollide<NodeDatum extends SimulationNodeDatum> {
    radius(radius: number | ((node: NodeDatum) => number)): this;
    strength(strength: number): this;
    iterations(iterations: number): this;
  }

  export interface ForceX<NodeDatum extends SimulationNodeDatum> {
    strength(strength: number | ((node: NodeDatum) => number)): this;
  }

  export interface ForceY<NodeDatum extends SimulationNodeDatum> {
    strength(strength: number | ((node: NodeDatum) => number)): this;
  }

  export function forceSimulation<NodeDatum extends SimulationNodeDatum>(
    nodes?: NodeDatum[],
  ): Simulation<NodeDatum, SimulationLinkDatum<NodeDatum>>;

  export function forceLink<
    NodeDatum extends SimulationNodeDatum,
    LinkDatum extends SimulationLinkDatum<NodeDatum>,
  >(links?: LinkDatum[]): ForceLink<NodeDatum, LinkDatum>;

  export function forceManyBody<NodeDatum extends SimulationNodeDatum>(): ForceManyBody<NodeDatum>;
  export function forceCollide<NodeDatum extends SimulationNodeDatum>(): ForceCollide<NodeDatum>;
  export function forceX<NodeDatum extends SimulationNodeDatum>(x?: number): ForceX<NodeDatum>;
  export function forceY<NodeDatum extends SimulationNodeDatum>(y?: number): ForceY<NodeDatum>;
}
