import type { AxialCoord } from '../../domain/types';

/**
 * Pointy-top axial ↔ pixel geometry, hand-rolled redblobgames-style so it can
 * reuse plan 01's DIRECTION_VECTORS (model and render can never disagree) and
 * be unit-tested without a canvas.
 *
 * `size` is the hex circumradius (center → vertex). For pointy-top:
 *   width  = √3 · size   (flat-to-flat, horizontal)
 *   height = 2 · size    (vertex-to-vertex, vertical)
 */

export interface Pixel {
  x: number;
  y: number;
}

const SQRT3 = Math.sqrt(3);

/** Center pixel position of a hex at axial `{q, r}`. */
export function axialToPixel(coordinate: AxialCoord, size: number): Pixel {
  const x = size * (SQRT3 * coordinate.q + (SQRT3 / 2) * coordinate.r);
  const y = size * ((3 / 2) * coordinate.r);
  return { x, y };
}

/** Round fractional axial coordinates to the nearest hex via cube rounding. */
export function axialRound(qFractional: number, rFractional: number): AxialCoord {
  // Axial → cube.
  const x = qFractional;
  const z = rFractional;
  const y = -x - z;

  let rx = Math.round(x);
  const ry = Math.round(y);
  let rz = Math.round(z);

  const dx = Math.abs(rx - x);
  const dy = Math.abs(ry - y);
  const dz = Math.abs(rz - z);

  // Reset the component with the largest rounding delta to preserve x+y+z = 0.
  // We only output q (rx) and r (rz), so the case where ry has the largest
  // delta leaves both untouched — no assignment needed there.
  if (dx > dy && dx > dz) {
    rx = -ry - rz;
  } else if (!(dy > dz)) {
    rz = -rx - ry;
  }

  // `|| 0` normalizes a possible -0 (from Math.round) to 0 so equality checks
  // and coordinate keys stay canonical.
  return { q: rx || 0, r: rz || 0 };
}

/** Nearest hex cell to a pixel position (inverse of axialToPixel, then snap). */
export function pixelToAxial(pixel: Pixel, size: number): AxialCoord {
  const qFractional = ((SQRT3 / 3) * pixel.x - (1 / 3) * pixel.y) / size;
  const rFractional = ((2 / 3) * pixel.y) / size;
  return axialRound(qFractional, rFractional);
}

/**
 * The six vertices of a pointy-top hexagon of `size`, as an SVG `points`
 * string, centered on the origin. Vertices start at the top and go clockwise.
 */
export function hexPolygonPoints(size: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 90);
    const x = size * Math.cos(angle);
    const y = size * Math.sin(angle);
    points.push(`${x.toFixed(3)},${y.toFixed(3)}`);
  }
  return points.join(' ');
}

/** Pixel width/height of a pointy-top hex of `size`. */
export function hexDimensions(size: number): { width: number; height: number } {
  return { width: SQRT3 * size, height: 2 * size };
}
