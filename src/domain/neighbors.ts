import type { Hex } from './types';
import { DIRECTIONS } from './directions';

/**
 * The six neighbors of `hex`, indexed by Direction (0=NE … 5=NW); `null` where
 * the edge is open or the referenced id is missing from `hexesById`. Reads
 * `hex.neighbors` — the graph is the source of truth, not coordinate math.
 */
export function directionalNeighbors(hex: Hex, hexesById: Record<string, Hex>): (Hex | null)[] {
  return DIRECTIONS.map((dir) => {
    const neighborId = hex.neighbors[dir];
    if (neighborId === null) {
      return null;
    }
    return hexesById[neighborId] ?? null;
  });
}
