import type { AxialCoord, Hex, NeighborSlots, Template } from './types';
import { emptyNeighbors } from './types';
import { CoordinateIndex, neighborCoord } from './coordinates';
import { DIRECTIONS, opposite } from './directions';
import { getFieldTypeDef } from './fieldTypes';

/**
 * The graph state the pure ops operate over: the authoritative hex map plus its
 * derived coordinate index. Every op returns the *next* state without mutating
 * the input (hexes touched are replaced with fresh objects and neighbor tuples;
 * the index is cloned), so the store can treat results immutably.
 */
export interface GraphState {
  hexes: Record<string, Hex>;
  index: CoordinateIndex;
}

/** Seed a new hex's field bag with the current template's default values. */
function seedFieldValues(template: Template): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of template.fields) {
    values[field.id] = getFieldTypeDef(field.type).defaultValue;
  }
  return values;
}

/** Set `slot` on a copy of `hex` and return the copy. */
function withNeighbor(hex: Hex, slot: number, value: string | null): Hex {
  const neighbors = [...hex.neighbors] as NeighborSlots;
  neighbors[slot] = value;
  return { ...hex, neighbors };
}

/**
 * Resolve the 6 edges of `hex` (already placed at its coordinate in `hexes`) by
 * position via the index, writing both this hex's slot and each occupant's
 * reciprocal slot. Mutates the passed `hexes`/`index` working copies and the
 * `hex.neighbors` tuple in place — callers pass fresh copies. `skipId` excludes
 * the moving hex from matching its own (already-removed) index entry.
 */
function linkEdges(
  hex: Hex,
  hexes: Record<string, Hex>,
  index: CoordinateIndex,
  skipId?: string,
): void {
  for (const dir of DIRECTIONS) {
    const occupantId = index.get(neighborCoord(hex.coordinate, dir));
    if (occupantId === undefined || occupantId === skipId) {
      continue;
    }
    const occupant = hexes[occupantId];
    if (occupant === undefined) {
      continue;
    }
    hex.neighbors[dir] = occupantId;
    hexes[occupantId] = withNeighbor(occupant, opposite(dir), hex.id);
  }
}

/**
 * Clear every edge of `hex`, removing the reciprocal slot on each former
 * neighbor. Mutates the passed `hexes` working copy. Returns nothing — the
 * caller decides what to do with `hex` itself.
 */
function unlinkEdges(hex: Hex, hexes: Record<string, Hex>): void {
  for (const dir of DIRECTIONS) {
    const neighborId = hex.neighbors[dir];
    if (neighborId === null) {
      continue;
    }
    const neighbor = hexes[neighborId];
    if (neighbor === undefined) {
      continue;
    }
    hexes[neighborId] = withNeighbor(neighbor, opposite(dir), null);
  }
}

export interface PlaceResult {
  state: GraphState;
  hex: Hex;
}

/**
 * Place a new hex at `coordinate`. Assumes a validated, empty destination
 * (occupied-cell rejection is a plan-03 policy, not enforced here). Resolves all
 * six edges by position and updates the index.
 */
export function placeHex(
  state: GraphState,
  coordinate: AxialCoord,
  template: Template,
): PlaceResult {
  const hex: Hex = {
    id: crypto.randomUUID(),
    coordinate,
    neighbors: emptyNeighbors(),
    fieldValues: seedFieldValues(template),
    createdAt: Date.now(),
  };

  const hexes = { ...state.hexes };
  const index = state.index.clone();

  linkEdges(hex, hexes, index);
  hexes[hex.id] = hex;
  index.set(coordinate, hex.id);

  return { state: { hexes, index }, hex };
}

/**
 * Move `hexId` to `destination`. Detaches from all former neighbors, then
 * re-resolves the six edges at the destination exactly as placement does.
 * No-op if the hex does not exist.
 */
export function moveHex(state: GraphState, hexId: string, destination: AxialCoord): GraphState {
  const existing = state.hexes[hexId];
  if (existing === undefined) {
    return state;
  }

  const hexes = { ...state.hexes };
  const index = state.index.clone();

  unlinkEdges(existing, hexes);
  index.delete(existing.coordinate);

  const moved: Hex = { ...existing, coordinate: destination, neighbors: emptyNeighbors() };
  linkEdges(moved, hexes, index, hexId);
  hexes[hexId] = moved;
  index.set(destination, hexId);

  return { hexes, index };
}

/**
 * Delete `hexId`, clearing each neighbor's reciprocal slot and dropping the hex
 * (and its field values) and its index entry. No-op if the hex does not exist.
 */
export function deleteHex(state: GraphState, hexId: string): GraphState {
  const existing = state.hexes[hexId];
  if (existing === undefined) {
    return state;
  }

  const hexes = { ...state.hexes };
  const index = state.index.clone();

  unlinkEdges(existing, hexes);
  delete hexes[hexId];
  index.delete(existing.coordinate);

  return { hexes, index };
}

/** Whether a hex occupies `coordinate`. Used by the map to reject drops. */
export function isOccupied(state: GraphState, coordinate: AxialCoord): boolean {
  return state.index.get(coordinate) !== undefined;
}
