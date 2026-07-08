import { describe, it, expect } from 'vitest';
import {
  axialRound,
  axialToPixel,
  hexDimensions,
  hexPolygonPoints,
  pixelToAxial,
} from './geometry';
import { DIRECTIONS, Direction } from '../../domain/directions';
import { neighborCoord } from '../../domain/coordinates';

const SQRT3 = Math.sqrt(3);
const size = 40;

describe('axialToPixel', () => {
  it('places the origin at (0, 0)', () => {
    expect(axialToPixel({ q: 0, r: 0 }, size)).toEqual({ x: 0, y: 0 });
  });

  it('places the E neighbor due right', () => {
    const p = axialToPixel({ q: 1, r: 0 }, size);
    expect(p.x).toBeCloseTo(SQRT3 * size);
    expect(p.y).toBeCloseTo(0);
  });

  it('places the NE neighbor up and to the right', () => {
    const p = axialToPixel({ q: 1, r: -1 }, size);
    expect(p.x).toBeGreaterThan(0);
    expect(p.y).toBeLessThan(0);
  });
});

describe('pixelToAxial', () => {
  it('round-trips exact hex centers', () => {
    for (let q = -3; q <= 3; q += 1) {
      for (let r = -3; r <= 3; r += 1) {
        expect(pixelToAxial(axialToPixel({ q, r }, size), size)).toEqual({ q, r });
      }
    }
  });

  it('snaps an off-center point to the nearest cell', () => {
    const center = axialToPixel({ q: 2, r: -1 }, size);
    const jittered = { x: center.x + 4, y: center.y - 5 };
    expect(pixelToAxial(jittered, size)).toEqual({ q: 2, r: -1 });
  });
});

describe('axialRound', () => {
  it('rounds a fractional coordinate to the nearest cell', () => {
    expect(axialRound(0.1, -0.2)).toEqual({ q: 0, r: 0 });
    expect(axialRound(0.9, 0.1)).toEqual({ q: 1, r: 0 });
  });
});

describe('model/render agreement', () => {
  it('every direction-vector neighbor renders adjacent (touching) to the origin', () => {
    const origin = axialToPixel({ q: 0, r: 0 }, size);
    for (const dir of DIRECTIONS) {
      const neighborPixel = axialToPixel(neighborCoord({ q: 0, r: 0 }, dir), size);
      const distance = Math.hypot(neighborPixel.x - origin.x, neighborPixel.y - origin.y);
      // Adjacent pointy-top hex centers are √3·size apart.
      expect(distance).toBeCloseTo(SQRT3 * size);
    }
  });

  it("the model's NE neighbor renders up-and-to-the-right", () => {
    const ne = axialToPixel(neighborCoord({ q: 0, r: 0 }, Direction.NE), size);
    expect(ne.x).toBeGreaterThan(0);
    expect(ne.y).toBeLessThan(0);
  });
});

describe('hexPolygonPoints', () => {
  it('returns six vertices', () => {
    const points = hexPolygonPoints(size).split(' ');
    expect(points).toHaveLength(6);
  });

  it('has a top vertex (pointy-top) at (0, -size)', () => {
    const first = hexPolygonPoints(size).split(' ')[0];
    expect(first).toBe(`0.000,${(-size).toFixed(3)}`);
  });
});

describe('hexDimensions', () => {
  it('is √3·size wide and 2·size tall', () => {
    expect(hexDimensions(size)).toEqual({ width: SQRT3 * size, height: 2 * size });
  });
});
