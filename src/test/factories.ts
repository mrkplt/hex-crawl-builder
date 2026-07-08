import type { AxialCoord, Field, Hex, Template } from '../domain/types';
import { emptyNeighbors } from '../domain/types';
import { CoordinateIndex } from '../domain/coordinates';
import type { GraphState } from '../domain/graph';

let fieldCounter = 0;

/** A template field with sensible defaults; override any part. */
export function makeField(overrides: Partial<Field> = {}): Field {
  fieldCounter += 1;
  return {
    id: overrides.id ?? `field-${fieldCounter}`,
    label: overrides.label ?? `Field ${fieldCounter}`,
    type: overrides.type ?? 'short_text',
    required: overrides.required ?? false,
    order: overrides.order ?? fieldCounter,
    ...overrides,
  };
}

export function makeTemplate(fields: Field[] = []): Template {
  return { fields };
}

let hexCounter = 0;

/** A standalone hex (no links) at the given coordinate. */
export function makeHex(coordinate: AxialCoord, overrides: Partial<Hex> = {}): Hex {
  hexCounter += 1;
  return {
    id: overrides.id ?? `hex-${hexCounter}`,
    coordinate,
    neighbors: overrides.neighbors ?? emptyNeighbors(),
    fieldValues: overrides.fieldValues ?? {},
    createdAt: overrides.createdAt ?? hexCounter,
    ...overrides,
  };
}

/** An empty graph state (no hexes, empty index). */
export function emptyGraphState(): GraphState {
  return { hexes: {}, index: new CoordinateIndex() };
}
