import type { AxialCoord, Hex } from './types';
import { directionVector } from './directions';

/** Canonical `"q,r"` string key for an axial coordinate. */
export function coordKey(coordinate: AxialCoord): string {
  return `${coordinate.q},${coordinate.r}`;
}

/** The coordinate adjacent to `coordinate` across edge `dir`. */
export function neighborCoord(coordinate: AxialCoord, dir: number): AxialCoord {
  const delta = directionVector(dir);
  return { q: coordinate.q + delta.q, r: coordinate.r + delta.r };
}

/**
 * A derived cache mapping `"q,r" → hexId`. It accelerates the one seeding
 * question the neighbor graph cannot answer for a not-yet-connected node —
 * "which hex, if any, sits at this cell?" — and nothing more.
 *
 * NEVER treat it as authoritative for adjacency: the direction-indexed neighbor
 * graph is the source of truth. This index is rebuilt on load and updated on
 * every place/move/delete.
 */
export class CoordinateIndex {
  private readonly byCell: Map<string, string>;

  constructor(entries?: Iterable<readonly [string, string]>) {
    this.byCell = new Map(entries);
  }

  get(coordinate: AxialCoord): string | undefined {
    return this.byCell.get(coordKey(coordinate));
  }

  has(coordinate: AxialCoord): boolean {
    return this.byCell.has(coordKey(coordinate));
  }

  set(coordinate: AxialCoord, hexId: string): void {
    this.byCell.set(coordKey(coordinate), hexId);
  }

  delete(coordinate: AxialCoord): void {
    this.byCell.delete(coordKey(coordinate));
  }

  /** Discard all entries and repopulate from the given hexes. */
  rebuild(hexes: Iterable<Hex>): void {
    this.byCell.clear();
    for (const hex of hexes) {
      this.byCell.set(coordKey(hex.coordinate), hex.id);
    }
  }

  /** A detached copy — used by pure ops that return a next state. */
  clone(): CoordinateIndex {
    return new CoordinateIndex(this.byCell);
  }

  get size(): number {
    return this.byCell.size;
  }

  /** Snapshot of entries, for tests and equality checks. */
  entries(): [string, string][] {
    return [...this.byCell.entries()];
  }
}

/** Build a fresh index from a hex collection. */
export function buildIndex(hexes: Iterable<Hex>): CoordinateIndex {
  const index = new CoordinateIndex();
  index.rebuild(hexes);
  return index;
}
