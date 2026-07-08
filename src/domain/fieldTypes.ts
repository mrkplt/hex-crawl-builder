import type { FieldType } from './types';

/**
 * A field-type definition. The registry (below) is a lookup, NOT a switch:
 * adding a type (`checkbox`, `number`, …) must be a new entry here, never an
 * edit spread across consumers.
 *
 * The render component for each type is registered later (plans 02/04); the
 * shape is deliberately left open for a `render` slot so that addition stays
 * additive.
 */
export interface FieldTypeDef {
  id: FieldType;
  /** Human name for the type picker. */
  label: string;
  defaultValue: string;
  /** Drives completeness — an empty required field makes a hex incomplete. */
  isEmpty: (value: string) => boolean;
}

const isBlank = (value: string): boolean => value.trim().length === 0;

const shortText: FieldTypeDef = {
  id: 'short_text',
  label: 'Short text',
  defaultValue: '',
  isEmpty: isBlank,
};

const longText: FieldTypeDef = {
  id: 'long_text',
  label: 'Long text',
  defaultValue: '',
  isEmpty: isBlank,
};

/** The registry. Keyed by FieldType so lookups are total and exhaustive. */
export const FIELD_TYPES: Record<FieldType, FieldTypeDef> = {
  short_text: shortText,
  long_text: longText,
};

/** The registered type defs, for populating a type picker. */
export const FIELD_TYPE_LIST: readonly FieldTypeDef[] = Object.values(FIELD_TYPES);

export function getFieldTypeDef(type: FieldType): FieldTypeDef {
  return FIELD_TYPES[type];
}
