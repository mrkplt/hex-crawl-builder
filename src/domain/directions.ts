import type { AxialCoord } from './types';

/**
 * The load-bearing constant: the six pointy-top edge directions and their axial
 * deltas, defined ONCE here and shared by the graph ops (this plan) and the
 * render geometry (plan 03). Never re-derive them per call site — a mismatch is
 * the exact silent bug where the model's "NE neighbor" renders in the wrong
 * place.
 *
 * Orientation: pointy-top hexes, edges facing NE, E, SE, SW, W, NW, indexed
 * clockwise from NE. Axial convention: +q is East, +r is "down and to the
 * right" (screen y grows downward), matching the pointy-top axial→pixel math
 * in plan 03:
 *   x = size * (√3 · q + √3/2 · r)
 *   y = size * (3/2 · r)
 *
 * Worked from that pixel mapping:
 *   E  (+1,  0) → due right
 *   W  (-1,  0) → due left
 *   SE ( 0, +1) → down-right
 *   NW ( 0, -1) → up-left
 *   NE (+1, -1) → up-right
 *   SW (-1, +1) → down-left
 */
export enum Direction {
  NE = 0,
  E = 1,
  SE = 2,
  SW = 3,
  W = 4,
  NW = 5,
}

/** Axial (q, r) deltas ordered to match the neighbor slot indices. */
export const DIRECTION_VECTORS: readonly AxialCoord[] = [
  { q: 1, r: -1 }, // 0 = NE
  { q: 1, r: 0 }, // 1 = E
  { q: 0, r: 1 }, // 2 = SE
  { q: -1, r: 1 }, // 3 = SW
  { q: -1, r: 0 }, // 4 = W
  { q: 0, r: -1 }, // 5 = NW
];

/** All six direction slot indices, in order. */
export const DIRECTIONS: readonly Direction[] = [
  Direction.NE,
  Direction.E,
  Direction.SE,
  Direction.SW,
  Direction.W,
  Direction.NW,
];

/** Short display label for a direction slot, shared by any UI naming a neighbor. */
export const DIRECTION_LABELS: Record<Direction, string> = {
  [Direction.NE]: 'NE',
  [Direction.E]: 'E',
  [Direction.SE]: 'SE',
  [Direction.SW]: 'SW',
  [Direction.W]: 'W',
  [Direction.NW]: 'NW',
};

/** The reciprocal edge: NE↔SW, E↔W, SE↔NW. */
export function opposite(dir: number): number {
  return (dir + 3) % 6;
}

/**
 * The axial delta for a direction slot. Guards the lookup so
 * noUncheckedIndexedAccess is satisfied and an out-of-range index fails loudly
 * rather than producing undefined arithmetic.
 */
export function directionVector(dir: number): AxialCoord {
  const vector = DIRECTION_VECTORS[dir];
  if (vector === undefined) {
    throw new RangeError(`Invalid direction slot: ${dir}`);
  }
  return vector;
}
