import { describe, it, expect } from 'vitest';
import { DIRECTION_VECTORS, DIRECTIONS, Direction, directionVector, opposite } from './directions';

describe('direction table', () => {
  it('has exactly six distinct vectors', () => {
    expect(DIRECTION_VECTORS).toHaveLength(6);
    const keys = new Set(DIRECTION_VECTORS.map((v) => `${v.q},${v.r}`));
    expect(keys.size).toBe(6);
  });

  it('pins pointy-top / clockwise-from-NE vectors to hand-worked values', () => {
    expect(DIRECTION_VECTORS[Direction.NE]).toEqual({ q: 1, r: -1 });
    expect(DIRECTION_VECTORS[Direction.E]).toEqual({ q: 1, r: 0 });
    expect(DIRECTION_VECTORS[Direction.SE]).toEqual({ q: 0, r: 1 });
    expect(DIRECTION_VECTORS[Direction.SW]).toEqual({ q: -1, r: 1 });
    expect(DIRECTION_VECTORS[Direction.W]).toEqual({ q: -1, r: 0 });
    expect(DIRECTION_VECTORS[Direction.NW]).toEqual({ q: 0, r: -1 });
  });

  it('opposite(d) === (d + 3) % 6 for all six slots', () => {
    for (const dir of DIRECTIONS) {
      expect(opposite(dir)).toBe((dir + 3) % 6);
    }
  });

  it('each vector negates its opposite', () => {
    for (const dir of DIRECTIONS) {
      const v = directionVector(dir);
      const o = directionVector(opposite(dir));
      expect({ q: v.q + o.q, r: v.r + o.r }).toEqual({ q: 0, r: 0 });
    }
  });

  it('directionVector throws on an out-of-range slot', () => {
    expect(() => directionVector(6)).toThrow(RangeError);
    expect(() => directionVector(-1)).toThrow(RangeError);
  });
});
