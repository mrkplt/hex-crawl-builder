import type { Hex, Template } from '../../domain/types';
import { getFieldTypeDef } from '../../domain/fieldTypes';

/**
 * Pure helpers for the edit form's local buffer, kept out of the component so
 * the save/dirty semantics are unit-testable.
 */

/** The initial buffer: each live-template field pre-filled from the hex. */
export function initialFieldValues(hex: Hex, template: Template): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of template.fields) {
    values[field.id] = hex.fieldValues[field.id] ?? getFieldTypeDef(field.type).defaultValue;
  }
  return values;
}

/** Whether the buffer differs from the hex's stored values for live fields. */
export function hasUnsavedChanges(
  buffer: Record<string, string>,
  hex: Hex,
  template: Template,
): boolean {
  return template.fields.some((field) => {
    const stored = hex.fieldValues[field.id] ?? getFieldTypeDef(field.type).defaultValue;
    return buffer[field.id] !== stored;
  });
}
