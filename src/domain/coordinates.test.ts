import { describe, it, expect } from 'vitest';
import { CoordinateIndex, buildIndex, coordKey, neighborCoord } from './coordinates';
import { Direction } from './directions';
import { makeHex } from '../test/factories';

describe('coordKey', () => {
  it('round-trips q,r into a stable string', () => {
    expect(coordKey({ q: 0, r: 0 })).toBe('0,0');
    expect(coordKey({ q: 2, r: -3 })).toBe('2,-3');
  });
});

describe('neighborCoord', () => {
  it('adds the direction vector', () => {
    expect(neighborCoord({ q: 0, r: 0 }, Direction.NE)).toEqual({ q: 1, r: -1 });
    expect(neighborCoord({ q: 5, r: 5 }, Direction.SE)).toEqual({ q: 5, r: 6 });
  });
});

describe('CoordinateIndex', () => {
  it('sets, gets, has, and deletes by coordinate', () => {
    const index = new CoordinateIndex();
    expect(index.get({ q: 1, r: 1 })).toBeUndefined();
    expect(index.has({ q: 1, r: 1 })).toBe(false);

    index.set({ q: 1, r: 1 }, 'a');
    expect(index.get({ q: 1, r: 1 })).toBe('a');
    expect(index.has({ q: 1, r: 1 })).toBe(true);
    expect(index.size).toBe(1);

    index.delete({ q: 1, r: 1 });
    expect(index.get({ q: 1, r: 1 })).toBeUndefined();
    expect(index.size).toBe(0);
  });

  it('rebuilds from a hex collection, discarding prior entries', () => {
    const index = new CoordinateIndex();
    index.set({ q: 9, r: 9 }, 'stale');
    const hexes = [makeHex({ q: 0, r: 0 }, { id: 'a' }), makeHex({ q: 1, r: 0 }, { id: 'b' })];
    index.rebuild(hexes);

    expect(index.size).toBe(2);
    expect(index.get({ q: 0, r: 0 })).toBe('a');
    expect(index.get({ q: 1, r: 0 })).toBe('b');
    expect(index.get({ q: 9, r: 9 })).toBeUndefined();
  });

  it('clone is independent of the original', () => {
    const index = new CoordinateIndex();
    index.set({ q: 0, r: 0 }, 'a');
    const copy = index.clone();
    copy.set({ q: 1, r: 0 }, 'b');

    expect(index.get({ q: 1, r: 0 })).toBeUndefined();
    expect(copy.get({ q: 0, r: 0 })).toBe('a');
    expect(index.entries()).toEqual([['0,0', 'a']]);
  });

  it('buildIndex constructs from hexes', () => {
    const index = buildIndex([makeHex({ q: 2, r: 2 }, { id: 'z' })]);
    expect(index.get({ q: 2, r: 2 })).toBe('z');
  });
});
