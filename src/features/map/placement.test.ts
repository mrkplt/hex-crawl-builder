import { describe, it, expect } from 'vitest';
import {
  decideMove,
  decidePaletteDrop,
  isAdjacentToAny,
  isOverTrash,
  resolveDragStop,
} from './placement';
import { placeHex, type GraphState } from '../../domain/graph';
import { CoordinateIndex, buildIndex } from '../../domain/coordinates';
import { makeTemplate } from '../../test/factories';
import { axialToPixel } from './geometry';

const template = makeTemplate([]);

function emptyState(): GraphState {
  return { hexes: {}, index: new CoordinateIndex() };
}

// ──────────────────────────────────────────────────────────────────────────────
// isAdjacentToAny
// ──────────────────────────────────────────────────────────────────────────────
describe('isAdjacentToAny', () => {
  it('returns false for an empty index', () => {
    expect(isAdjacentToAny({ q: 0, r: 0 }, new CoordinateIndex())).toBe(false);
  });

  it('returns true when the NE neighbor is occupied (direction 0)', () => {
    // {q:1,r:-1} is NE of {q:0,r:0}
    const idx = buildIndex([{ id: 'a', coordinate: { q: 1, r: -1 }, neighbors: [null,null,null,null,null,null], fieldValues: {}, createdAt: 0 }]);
    expect(isAdjacentToAny({ q: 0, r: 0 }, idx)).toBe(true);
  });

  it('returns true when the E neighbor is occupied (direction 1)', () => {
    const idx = buildIndex([{ id: 'a', coordinate: { q: 1, r: 0 }, neighbors: [null,null,null,null,null,null], fieldValues: {}, createdAt: 0 }]);
    expect(isAdjacentToAny({ q: 0, r: 0 }, idx)).toBe(true);
  });

  it('returns true when the SE neighbor is occupied (direction 2)', () => {
    const idx = buildIndex([{ id: 'a', coordinate: { q: 0, r: 1 }, neighbors: [null,null,null,null,null,null], fieldValues: {}, createdAt: 0 }]);
    expect(isAdjacentToAny({ q: 0, r: 0 }, idx)).toBe(true);
  });

  it('returns true when the SW neighbor is occupied (direction 3)', () => {
    const idx = buildIndex([{ id: 'a', coordinate: { q: -1, r: 1 }, neighbors: [null,null,null,null,null,null], fieldValues: {}, createdAt: 0 }]);
    expect(isAdjacentToAny({ q: 0, r: 0 }, idx)).toBe(true);
  });

  it('returns true when the W neighbor is occupied (direction 4)', () => {
    const idx = buildIndex([{ id: 'a', coordinate: { q: -1, r: 0 }, neighbors: [null,null,null,null,null,null], fieldValues: {}, createdAt: 0 }]);
    expect(isAdjacentToAny({ q: 0, r: 0 }, idx)).toBe(true);
  });

  it('returns true when the NW neighbor is occupied (direction 5)', () => {
    const idx = buildIndex([{ id: 'a', coordinate: { q: 0, r: -1 }, neighbors: [null,null,null,null,null,null], fieldValues: {}, createdAt: 0 }]);
    expect(isAdjacentToAny({ q: 0, r: 0 }, idx)).toBe(true);
  });

  it('returns false when no neighbor cells are occupied', () => {
    const idx = buildIndex([{ id: 'a', coordinate: { q: 5, r: 5 }, neighbors: [null,null,null,null,null,null], fieldValues: {}, createdAt: 0 }]);
    expect(isAdjacentToAny({ q: 0, r: 0 }, idx)).toBe(false);
  });

  it('excludes the specified id: returns false when only the excluded hex is adjacent', () => {
    const idx = buildIndex([{ id: 'moving', coordinate: { q: 1, r: 0 }, neighbors: [null,null,null,null,null,null], fieldValues: {}, createdAt: 0 }]);
    expect(isAdjacentToAny({ q: 0, r: 0 }, idx, 'moving')).toBe(false);
  });

  it('excludes the specified id but returns true when another hex is also adjacent', () => {
    const idx = buildIndex([
      { id: 'moving', coordinate: { q: 1, r: 0 }, neighbors: [null,null,null,null,null,null], fieldValues: {}, createdAt: 0 },
      { id: 'other', coordinate: { q: -1, r: 0 }, neighbors: [null,null,null,null,null,null], fieldValues: {}, createdAt: 0 },
    ]);
    expect(isAdjacentToAny({ q: 0, r: 0 }, idx, 'moving')).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// decidePaletteDrop
// ──────────────────────────────────────────────────────────────────────────────
describe('decidePaletteDrop', () => {
  it('first-hex exception: places anywhere on an empty map', () => {
    expect(decidePaletteDrop(emptyState(), { q: 5, r: 5 })).toEqual({
      kind: 'place',
      coordinate: { q: 5, r: 5 },
    });
  });

  it('places on a cell adjacent to an existing hex', () => {
    const { state } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    // {q:1,r:0} is E of {q:0,r:0}
    expect(decidePaletteDrop(state, { q: 1, r: 0 })).toEqual({
      kind: 'place',
      coordinate: { q: 1, r: 0 },
    });
  });

  it('rejects a drop on a cell not adjacent to any hex', () => {
    const { state } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    expect(decidePaletteDrop(state, { q: 5, r: 5 })).toEqual({ kind: 'rejected' });
  });

  it('rejects a drop on an occupied cell (regardless of adjacency)', () => {
    const { state } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    expect(decidePaletteDrop(state, { q: 0, r: 0 })).toEqual({ kind: 'rejected' });
  });

  it('rejects when target is adjacent to an existing hex but is occupied', () => {
    let { state } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    ({ state } = placeHex(state, { q: 1, r: 0 }, template));
    // {q:1,r:0} is occupied AND adjacent — occupancy wins
    expect(decidePaletteDrop(state, { q: 1, r: 0 })).toEqual({ kind: 'rejected' });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// decideMove
// ──────────────────────────────────────────────────────────────────────────────
describe('decideMove', () => {
  it('lone-hex exception: the only hex can move freely', () => {
    const { state, hex } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    expect(decideMove(state, hex.id, { q: 5, r: 5 })).toEqual({
      kind: 'move',
      hexId: hex.id,
      destination: { q: 5, r: 5 },
    });
  });

  it('moves to a cell adjacent to a different hex', () => {
    let { state } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    const second = placeHex(state, { q: 1, r: 0 }, template);
    state = second.state;
    const hexA = state.index.get({ q: 0, r: 0 })!;
    // {q:2,r:0} is E of {q:1,r:0} (a different hex)
    expect(decideMove(state, hexA, { q: 2, r: 0 })).toEqual({
      kind: 'move',
      hexId: hexA,
      destination: { q: 2, r: 0 },
    });
  });

  it('rejects a move to a cell not adjacent to any other hex', () => {
    let { state } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    const second = placeHex(state, { q: 1, r: 0 }, template);
    state = second.state;
    const hexA = state.index.get({ q: 0, r: 0 })!;
    expect(decideMove(state, hexA, { q: 10, r: 10 })).toEqual({ kind: 'rejected' });
  });

  it('rejects a move adjacent only to the moving hex\'s own origin (self-adjacency)', () => {
    let { state } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    const second = placeHex(state, { q: 1, r: 0 }, template);
    state = second.state;
    const hexA = state.index.get({ q: 0, r: 0 })!;
    // {q:-1,r:0} is W of hexA (only adjacent to hexA's origin, not hexB)
    expect(decideMove(state, hexA, { q: -1, r: 0 })).toEqual({ kind: 'rejected' });
  });

  it('rejects a move onto a cell occupied by another hex', () => {
    let { state } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    const second = placeHex(state, { q: 1, r: 0 }, template);
    state = second.state;
    const hexA = state.index.get({ q: 0, r: 0 })!;
    expect(decideMove(state, hexA, { q: 1, r: 0 })).toEqual({ kind: 'rejected' });
  });

  it('rejects a no-op move onto the hex\'s own cell', () => {
    const { state, hex } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    expect(decideMove(state, hex.id, { q: 0, r: 0 })).toEqual({ kind: 'rejected' });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// isOverTrash
// ──────────────────────────────────────────────────────────────────────────────
describe('isOverTrash', () => {
  const rect = { left: 10, top: 10, right: 50, bottom: 50 };

  it('is true inside the rect', () => {
    expect(isOverTrash({ x: 30, y: 30 }, rect)).toBe(true);
  });

  it('is false outside the rect', () => {
    expect(isOverTrash({ x: 5, y: 30 }, rect)).toBe(false);
    expect(isOverTrash({ x: 30, y: 99 }, rect)).toBe(false);
  });

  it('is false when there is no trash rect', () => {
    expect(isOverTrash({ x: 30, y: 30 }, null)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// resolveDragStop
// ──────────────────────────────────────────────────────────────────────────────
describe('resolveDragStop', () => {
  const size = 40;
  const trashRect = { left: 0, top: 0, right: 100, bottom: 100 };

  it('resolves to delete when released over the trash zone', () => {
    const { state, hex } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    const outcome = resolveDragStop({
      hexId: hex.id,
      pointerScreen: { x: 50, y: 50 },
      nodePixel: { x: 500, y: 500 },
      trashRect,
      state,
      size,
    });
    expect(outcome).toEqual({ kind: 'delete', hexId: hex.id });
  });

  it('resolves to a move to an adjacent empty destination (lone-hex)', () => {
    const { state, hex } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    const destinationPixel = axialToPixel({ q: 2, r: -1 }, size);
    const outcome = resolveDragStop({
      hexId: hex.id,
      pointerScreen: { x: 500, y: 500 },
      nodePixel: destinationPixel,
      trashRect,
      state,
      size,
    });
    expect(outcome).toEqual({ kind: 'move', hexId: hex.id, destination: { q: 2, r: -1 } });
  });

  it('rejects a move onto an occupied destination', () => {
    let { state } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    const second = placeHex(state, { q: 1, r: 0 }, template);
    state = second.state;
    const mover = state.index.get({ q: 0, r: 0 })!;
    const outcome = resolveDragStop({
      hexId: mover,
      pointerScreen: { x: 500, y: 500 },
      nodePixel: axialToPixel({ q: 1, r: 0 }, size),
      trashRect,
      state,
      size,
    });
    expect(outcome).toEqual({ kind: 'rejected' });
  });
});
