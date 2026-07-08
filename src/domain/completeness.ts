import type { Hex, Template, FieldType } from './types';
import { getFieldTypeDef } from './fieldTypes';

/**
 * Whether a stored value counts as empty for a given field type. A missing
 * value (never written) is always empty.
 */
export function isFieldEmpty(value: string | undefined, type: FieldType): boolean {
  if (value === undefined) {
    return true;
  }
  return getFieldTypeDef(type).isEmpty(value);
}

/**
 * Whether a hex is incomplete against the *live* template: some field currently
 * marked `required` has an empty stored value.
 *
 * This is derived on demand, never stored and never frozen to a template
 * snapshot — editing the schema (e.g. adding a required field) flips a hex's
 * marker immediately, with no re-touch of the hex.
 */
export function isIncomplete(hex: Hex, template: Template): boolean {
  return template.fields.some(
    (field) => field.required && isFieldEmpty(hex.fieldValues[field.id], field.type),
  );
}
