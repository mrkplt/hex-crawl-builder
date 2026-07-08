import { describe, it, expect } from 'vitest';
import { deleteHex, isOccupied, moveHex, placeHex, type GraphState } from './graph';
import { DIRECTIONS, DIRECTION_VECTORS, Direction, opposite } from './directions';
import { CoordinateIndex, neighborCoord } from './coordinates';
import { makeHex, makeTemplate } from '../test/factories';
import { expectIndexMatches, expectReciprocal } from '../test/invariants';
import type { AxialCoord } from './types';

const emptyTemplate = makeTemplate([]);
const origin: AxialCoord = { q: 0, r: 0 };

function emptyState(): GraphState {
  return { hexes: {}, index: new CoordinateIndex() };
}

describe('placeHex', () => {
  it('places into empty space with all slots null', () => {
    const { state, hex } = placeHex(emptyState(), origin, emptyTemplate);
    expect(hex.neighbors).toEqual([null, null, null, null, null, null]);
    expect(hex.coordinate).toEqual(origin);
    expect(state.index.get(origin)).toBe(hex.id);
    expectReciprocal(state);
    expectIndexMatches(state);
  });

  it('seeds fieldValues from template defaults', () => {
    const template = makeTemplate([
      { id: 'a', label: 'A', type: 'short_text', required: true, order: 0 },
    ]);
    const { hex } = placeHex(emptyState(), origin, template);
    expect(hex.fieldValues).toEqual({ a: '' });
  });

  it('does not mutate the input state', () => {
    const state = emptyState();
    placeHex(state, origin, emptyTemplate);
    expect(Object.keys(state.hexes)).toHaveLength(0);
    expect(state.index.size).toBe(0);
  });

  it('links reciprocally to a single existing neighbor', () => {
    let state = emptyState();
    const east = placeHex(state, neighborCoord(origin, Direction.E), emptyTemplate);
    state = east.state;
    const center = placeHex(state, origin, emptyTemplate);
    state = center.state;

    expect(center.hex.neighbors[Direction.E]).toBe(east.hex.id);
    expect(state.hexes[east.hex.id]?.neighbors[Direction.W]).toBe(center.hex.id);
    expectReciprocal(state);
    expectIndexMatches(state);
  });

  it('links reciprocally to all six neighbors when fully surrounded', () => {
    let state = emptyState();
    const neighborIds: Record<number, string> = {};
    for (const dir of DIRECTIONS) {
      const placed = placeHex(state, neighborCoord(origin, dir), emptyTemplate);
      state = placed.state;
      neighborIds[dir] = placed.hex.id;
    }
    const center = placeHex(state, origin, emptyTemplate);
    state = center.state;

    for (const dir of DIRECTIONS) {
      expect(center.hex.neighbors[dir]).toBe(neighborIds[dir]);
      const neighborId = neighborIds[dir];
      expect(state.hexes[neighborId!]?.neighbors[opposite(dir)]).toBe(center.hex.id);
    }
    expectReciprocal(state);
    expectIndexMatches(state);
  });
});

describe('moveHex', () => {
  it('detaches from former neighbors and clears their reciprocal slots', () => {
    let state = emptyState();
    const a = placeHex(state, origin, emptyTemplate);
    state = a.state;
    const b = placeHex(state, neighborCoord(origin, Direction.E), emptyTemplate);
    state = b.state;

    // Move A far away so it no longer touches B.
    state = moveHex(state, a.hex.id, { q: 10, r: 10 });

    expect(state.hexes[a.hex.id]?.neighbors).toEqual([null, null, null, null, null, null]);
    expect(state.hexes[b.hex.id]?.neighbors[Direction.W]).toBeNull();
    expect(state.index.get(origin)).toBeUndefined();
    expect(state.index.get({ q: 10, r: 10 })).toBe(a.hex.id);
    expectReciprocal(state);
    expectIndexMatches(state);
  });

  it('re-resolves edges at the destination', () => {
    let state = emptyState();
    const target = placeHex(state, { q: 5, r: 5 }, emptyTemplate);
    state = target.state;
    const mover = placeHex(state, origin, emptyTemplate);
    state = mover.state;

    // Move mover next to target (west of it).
    const dest = neighborCoord({ q: 5, r: 5 }, Direction.W);
    state = moveHex(state, mover.hex.id, dest);

    expect(state.hexes[mover.hex.id]?.neighbors[Direction.E]).toBe(target.hex.id);
    expect(state.hexes[target.hex.id]?.neighbors[Direction.W]).toBe(mover.hex.id);
    expectReciprocal(state);
    expectIndexMatches(state);
  });

  it('handles a hex with neighbors on both ends', () => {
    let state = emptyState();
    const w = placeHex(state, neighborCoord(origin, Direction.W), emptyTemplate);
    state = w.state;
    const e = placeHex(state, neighborCoord(origin, Direction.E), emptyTemplate);
    state = e.state;
    const mid = placeHex(state, origin, emptyTemplate);
    state = mid.state;
    // mid links W and E; move it away.
    state = moveHex(state, mid.hex.id, { q: -9, r: -9 });

    expect(state.hexes[w.hex.id]?.neighbors[Direction.E]).toBeNull();
    expect(state.hexes[e.hex.id]?.neighbors[Direction.W]).toBeNull();
    expectReciprocal(state);
    expectIndexMatches(state);
  });

  it('is a no-op for an unknown hex', () => {
    const state = emptyState();
    expect(moveHex(state, 'nope', origin)).toBe(state);
  });
});

describe('deleteHex', () => {
  it('clears every former neighbor reciprocal slot and drops the hex', () => {
    let state = emptyState();
    const neighborIds: string[] = [];
    for (const dir of DIRECTIONS) {
      const placed = placeHex(state, neighborCoord(origin, dir), emptyTemplate);
      state = placed.state;
      neighborIds.push(placed.hex.id);
    }
    const center = placeHex(state, origin, emptyTemplate);
    state = center.state;

    state = deleteHex(state, center.hex.id);

    expect(state.hexes[center.hex.id]).toBeUndefined();
    expect(state.index.get(origin)).toBeUndefined();
    for (const id of neighborIds) {
      expect(state.hexes[id]?.neighbors).not.toContain(center.hex.id);
    }
    expectReciprocal(state);
    expectIndexMatches(state);
  });

  it('deletes an isolated hex and its field values', () => {
    const template = makeTemplate([
      { id: 'a', label: 'A', type: 'short_text', required: false, order: 0 },
    ]);
    let state = emptyState();
    const placed = placeHex(state, origin, template);
    state = placed.state;
    state = deleteHex(state, placed.hex.id);
    expect(state.hexes[placed.hex.id]).toBeUndefined();
    expect(state.index.size).toBe(0);
  });

  it('is a no-op for an unknown hex', () => {
    const state = emptyState();
    expect(deleteHex(state, 'nope')).toBe(state);
  });
});

describe('isOccupied', () => {
  it('reflects the index', () => {
    let state = emptyState();
    expect(isOccupied(state, origin)).toBe(false);
    state = placeHex(state, origin, emptyTemplate).state;
    expect(isOccupied(state, origin)).toBe(true);
    expect(isOccupied(state, { q: 1, r: 0 })).toBe(false);
  });
});

describe('resilience to an inconsistent index (defensive guards)', () => {
  it('ignores an index entry that points to a missing hex when linking', () => {
    const index = new CoordinateIndex();
    index.set(neighborCoord(origin, Direction.E), 'ghost'); // dangling entry
    const state: GraphState = { hexes: {}, index };

    const placed = placeHex(state, origin, emptyTemplate);
    expect(placed.hex.neighbors[Direction.E]).toBeNull();
  });

  it('ignores a neighbor slot that points to a missing hex when unlinking', () => {
    const hex = makeHex(origin, {
      id: 'h',
      neighbors: ['ghost', null, null, null, null, null],
    });
    const index = new CoordinateIndex();
    index.set(origin, 'h');
    const state: GraphState = { hexes: { h: hex }, index };

    const next = deleteHex(state, 'h');
    expect(next.hexes.h).toBeUndefined();
    expect(next.index.size).toBe(0);
  });
});

// Guard: the direction vectors used above are the shared table, not re-derived.
describe('shared direction table', () => {
  it('matches DIRECTION_VECTORS length', () => {
    expect(DIRECTION_VECTORS).toHaveLength(6);
  });
});
