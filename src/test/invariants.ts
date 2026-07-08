import { expect } from 'vitest';
import { coordKey } from '../domain/coordinates';
import { DIRECTIONS, opposite } from '../domain/directions';
import type { GraphState } from '../domain/graph';

/**
 * Assert the neighbor graph is fully reciprocal: for every non-null
 * `A.neighbors[i] = B`, `B.neighbors[opposite(i)] = A`, and every referenced id
 * exists.
 */
export function expectReciprocal(state: GraphState): void {
  for (const hex of Object.values(state.hexes)) {
    for (const dir of DIRECTIONS) {
      const neighborId = hex.neighbors[dir];
      if (neighborId === null) {
        continue;
      }
      const neighbor = state.hexes[neighborId];
      expect(neighbor, `neighbor ${neighborId} of ${hex.id} exists`).toBeDefined();
      expect(neighbor?.neighbors[opposite(dir)]).toBe(hex.id);
    }
  }
}

/**
 * Assert the coordinate index exactly matches the hex set: same size, and each
 * hex's coordinate maps back to its id.
 */
export function expectIndexMatches(state: GraphState): void {
  const hexes = Object.values(state.hexes);
  expect(state.index.size).toBe(hexes.length);
  for (const hex of hexes) {
    expect(state.index.get(hex.coordinate)).toBe(hex.id);
  }
  // No stale entries pointing at missing hexes.
  for (const [key, id] of state.index.entries()) {
    const hex = state.hexes[id];
    expect(hex, `index entry ${key} → ${id} refers to a live hex`).toBeDefined();
    expect(hex && coordKey(hex.coordinate)).toBe(key);
  }
}
