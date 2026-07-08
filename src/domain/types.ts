/**
 * Core domain types. Framework-free (no React import) — see CLAUDE.md.
 *
 * The shapes here are the contract every surface builds on. Get them right and
 * the map, template editor, and edit form all become projections over this.
 */

/** The set of field types. Extensible via the field-type registry, not a switch. */
export type FieldType = 'short_text' | 'long_text';

export interface Field {
  /** Stable id, generated once (crypto.randomUUID) and never reused. */
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
}

export interface Template {
  fields: Field[];
}

/** Axial hex coordinate. Pointy-top orientation — see directions.ts. */
export interface AxialCoord {
  q: number;
  r: number;
}

/**
 * A hex's adjacency, as a fixed-length array of 6 edge slots. The slot index
 * *is* the direction, clockwise from NE: 0=NE, 1=E, 2=SE, 3=SW, 4=W, 5=NW.
 * A slot holds the neighbor's hex id, or null if that edge is open.
 *
 * Modeled as a real 6-tuple so the type system (with noUncheckedIndexedAccess)
 * enforces "exactly 6 slots".
 */
export type NeighborSlots = [
  string | null, // 0 = NE
  string | null, // 1 = E
  string | null, // 2 = SE
  string | null, // 3 = SW
  string | null, // 4 = W
  string | null, // 5 = NW
];

export interface Hex {
  id: string;
  coordinate: AxialCoord;
  /** Fixed length 6, index = edge direction. The source of truth for adjacency. */
  neighbors: NeighborSlots;
  /** Open bag keyed by Field.id. Values are never deleted when a field is removed. */
  fieldValues: Record<string, string>;
  createdAt: number;
  /* Reserved future-proofing hooks — declared optional now, never populated in v1. */
  templateId?: string;
  campaignId?: string;
}

/** A fresh, fully-disconnected neighbor array. */
export function emptyNeighbors(): NeighborSlots {
  return [null, null, null, null, null, null];
}
