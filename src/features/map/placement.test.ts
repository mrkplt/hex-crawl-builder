import { describe, it, expect } from 'vitest';
import { decideMove, decidePaletteDrop, isOverTrash, resolveDragStop } from './placement';
import { placeHex, type GraphState } from '../../domain/graph';
import { CoordinateIndex } from '../../domain/coordinates';
import { makeTemplate } from '../../test/factories';
import { axialToPixel } from './geometry';

const template = makeTemplate([]);

function emptyState(): GraphState {
  return { hexes: {}, index: new CoordinateIndex() };
}

describe('decidePaletteDrop', () => {
  it('places on an empty cell', () => {
    expect(decidePaletteDrop(emptyState(), { q: 1, r: 2 })).toEqual({
      kind: 'place',
      coordinate: { q: 1, r: 2 },
    });
  });

  it('rejects a drop on an occupied cell', () => {
    const { state } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    expect(decidePaletteDrop(state, { q: 0, r: 0 })).toEqual({ kind: 'rejected' });
  });
});

describe('decideMove', () => {
  it('moves to an empty cell', () => {
    const { state, hex } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    expect(decideMove(state, hex.id, { q: 3, r: 3 })).toEqual({
      kind: 'move',
      hexId: hex.id,
      destination: { q: 3, r: 3 },
    });
  });

  it('rejects a move onto a cell occupied by another hex', () => {
    let { state } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    const second = placeHex(state, { q: 5, r: 5 }, template);
    state = second.state;
    const first = state.index.get({ q: 0, r: 0 })!;
    expect(decideMove(state, first, { q: 5, r: 5 })).toEqual({ kind: 'rejected' });
  });

  it('rejects a no-op move onto the hex own cell', () => {
    const { state, hex } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    expect(decideMove(state, hex.id, { q: 0, r: 0 })).toEqual({ kind: 'rejected' });
  });
});

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

  it('resolves to a move to the snapped empty destination', () => {
    const { state, hex } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    const destinationPixel = axialToPixel({ q: 2, r: -1 }, size);
    const outcome = resolveDragStop({
      hexId: hex.id,
      pointerScreen: { x: 500, y: 500 }, // away from trash
      nodePixel: destinationPixel,
      trashRect,
      state,
      size,
    });
    expect(outcome).toEqual({ kind: 'move', hexId: hex.id, destination: { q: 2, r: -1 } });
  });

  it('rejects a move onto an occupied destination', () => {
    let { state } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    const second = placeHex(state, { q: 2, r: -1 }, template);
    state = second.state;
    const mover = state.index.get({ q: 0, r: 0 })!;
    const outcome = resolveDragStop({
      hexId: mover,
      pointerScreen: { x: 500, y: 500 },
      nodePixel: axialToPixel({ q: 2, r: -1 }, size),
      trashRect,
      state,
      size,
    });
    expect(outcome).toEqual({ kind: 'rejected' });
  });
});
