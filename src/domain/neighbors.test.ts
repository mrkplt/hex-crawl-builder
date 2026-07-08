import { describe, it, expect } from 'vitest';
import { directionalNeighbors } from './neighbors';
import { Direction } from './directions';
import { emptyNeighbors } from './types';
import { makeHex } from '../test/factories';

describe('directionalNeighbors', () => {
  it('returns the right hex per direction slot', () => {
    const ne = makeHex({ q: 1, r: -1 }, { id: 'ne' });
    const hexes = { ne };
    const neighbors = emptyNeighbors();
    neighbors[Direction.NE] = 'ne';
    const center = makeHex({ q: 0, r: 0 }, { id: 'center', neighbors });

    const result = directionalNeighbors(center, hexes);

    expect(result[Direction.NE]).toBe(ne);
    expect(result[Direction.E]).toBeNull();
  });

  it('is null for an open edge', () => {
    const center = makeHex({ q: 0, r: 0 }, { id: 'center' });
    const result = directionalNeighbors(center, { center });
    expect(result).toEqual([null, null, null, null, null, null]);
  });

  it('is null for a dangling id not present in hexesById', () => {
    const neighbors = emptyNeighbors();
    neighbors[Direction.W] = 'missing';
    const center = makeHex({ q: 0, r: 0 }, { id: 'center', neighbors });

    const result = directionalNeighbors(center, { center });

    expect(result[Direction.W]).toBeNull();
  });

  it('returns all six neighbors for a fully-surrounded hub', () => {
    const hexes: Record<string, ReturnType<typeof makeHex>> = {};
    const neighbors = emptyNeighbors();
    for (const dir of [
      Direction.NE,
      Direction.E,
      Direction.SE,
      Direction.SW,
      Direction.W,
      Direction.NW,
    ]) {
      const id = `n${dir}`;
      hexes[id] = makeHex({ q: dir, r: 0 }, { id });
      neighbors[dir] = id;
    }
    const center = makeHex({ q: 0, r: 0 }, { id: 'center', neighbors });
    hexes.center = center;

    const result = directionalNeighbors(center, hexes);

    expect(result.every((hex) => hex !== null)).toBe(true);
    expect(result).toHaveLength(6);
  });

  it('the slot for direction d matches hex.neighbors[d]', () => {
    const neighbor = makeHex({ q: -1, r: 0 }, { id: 'w-neighbor' });
    const neighbors = emptyNeighbors();
    neighbors[Direction.W] = 'w-neighbor';
    const center = makeHex({ q: 0, r: 0 }, { id: 'center', neighbors });
    const hexes = { center, 'w-neighbor': neighbor };

    const result = directionalNeighbors(center, hexes);

    for (const dir of [0, 1, 2, 3, 4, 5] as const) {
      const expectedId = center.neighbors[dir];
      expect(result[dir]?.id ?? null).toBe(expectedId);
    }
  });
});
