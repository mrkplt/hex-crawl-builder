import { describe, it, expect } from 'vitest';
import { deleteHex, moveHex, placeHex, type GraphState } from './graph';
import { CoordinateIndex } from './coordinates';
import { makeTemplate } from '../test/factories';
import { expectIndexMatches, expectReciprocal } from '../test/invariants';
import type { AxialCoord } from './types';

const template = makeTemplate([]);

/** A small deterministic PRNG so the sequence is reproducible on failure. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    // xorshift32
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}

function randomCoord(rng: () => number): AxialCoord {
  const span = 5;
  return {
    q: Math.floor(rng() * (2 * span + 1)) - span,
    r: Math.floor(rng() * (2 * span + 1)) - span,
  };
}

describe('graph invariants under random place/move/delete sequences', () => {
  it('stays fully reciprocal with the index matching the hex set', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const rng = makeRng(seed * 2654435761);
      let state: GraphState = { hexes: {}, index: new CoordinateIndex() };
      const ids: string[] = [];

      for (let step = 0; step < 60; step += 1) {
        const roll = rng();
        const occupiedCoords = new Set(state.index.entries().map(([key]) => key));

        if (roll < 0.5 || ids.length === 0) {
          // Place at an unoccupied cell.
          const coord = randomCoord(rng);
          if (occupiedCoords.has(`${coord.q},${coord.r}`)) {
            continue;
          }
          const placed = placeHex(state, coord, template);
          state = placed.state;
          ids.push(placed.hex.id);
        } else if (roll < 0.8) {
          // Move an existing hex to an unoccupied cell.
          const id = ids[Math.floor(rng() * ids.length)]!;
          const coord = randomCoord(rng);
          if (occupiedCoords.has(`${coord.q},${coord.r}`)) {
            continue;
          }
          state = moveHex(state, id, coord);
        } else {
          // Delete an existing hex.
          const idx = Math.floor(rng() * ids.length);
          const id = ids[idx]!;
          state = deleteHex(state, id);
          ids.splice(idx, 1);
        }

        expectReciprocal(state);
        expectIndexMatches(state);
      }

      expect(Object.keys(state.hexes).length).toBe(state.index.size);
    }
  });
});
