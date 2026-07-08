import type { Field, Hex, NeighborSlots } from '../../domain/types';
import { FIELD_TYPES } from '../../domain/fieldTypes';
import { SAVE_VERSION, type SaveFile } from './format';

export type ParseResult = { ok: true; value: SaveFile } | { ok: false; error: string };

function err(message: string): ParseResult {
  return { ok: false, error: message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFieldType(value: unknown): boolean {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(FIELD_TYPES, value);
}

function validateField(raw: unknown, index: number): Field | string {
  if (!isRecord(raw)) {
    return `Field ${index} is not an object.`;
  }
  if (typeof raw.id !== 'string') return `Field ${index} is missing a string id.`;
  if (typeof raw.label !== 'string') return `Field ${index} is missing a string label.`;
  if (!isFieldType(raw.type)) return `Field ${index} has an unknown type.`;
  if (typeof raw.required !== 'boolean') return `Field ${index} is missing a boolean required.`;
  if (typeof raw.order !== 'number') return `Field ${index} is missing a numeric order.`;
  return {
    id: raw.id,
    label: raw.label,
    type: raw.type as Field['type'],
    required: raw.required,
    order: raw.order,
  };
}

function validateNeighbors(raw: unknown): NeighborSlots | null {
  if (!Array.isArray(raw) || raw.length !== 6) {
    return null;
  }
  for (const slot of raw) {
    if (slot !== null && typeof slot !== 'string') {
      return null;
    }
  }
  return raw as NeighborSlots;
}

function validateFieldValues(raw: unknown): Record<string, string> | null {
  if (!isRecord(raw)) {
    return null;
  }
  for (const value of Object.values(raw)) {
    if (typeof value !== 'string') {
      return null;
    }
  }
  return raw as Record<string, string>;
}

function validateHex(raw: unknown, index: number): Hex | string {
  if (!isRecord(raw)) return `Hex ${index} is not an object.`;
  if (typeof raw.id !== 'string') return `Hex ${index} is missing a string id.`;
  if (
    !isRecord(raw.coordinate) ||
    typeof raw.coordinate.q !== 'number' ||
    typeof raw.coordinate.r !== 'number'
  ) {
    return `Hex ${index} has an invalid coordinate.`;
  }
  const neighbors = validateNeighbors(raw.neighbors);
  if (neighbors === null) return `Hex ${index} has an invalid neighbors array (must be length 6).`;
  const fieldValues = validateFieldValues(raw.fieldValues);
  if (fieldValues === null) return `Hex ${index} has invalid fieldValues.`;
  if (typeof raw.createdAt !== 'number') return `Hex ${index} is missing a numeric createdAt.`;

  const hex: Hex = {
    id: raw.id,
    coordinate: { q: raw.coordinate.q, r: raw.coordinate.r },
    neighbors,
    fieldValues,
    createdAt: raw.createdAt,
  };
  if (typeof raw.templateId === 'string') hex.templateId = raw.templateId;
  if (typeof raw.campaignId === 'string') hex.campaignId = raw.campaignId;
  return hex;
}

/** Validate a v1-shaped object into a SaveFile, or return a clear error. */
function validateV1(raw: Record<string, unknown>): ParseResult {
  if (!isRecord(raw.template) || !Array.isArray(raw.template.fields)) {
    return err('Save file is missing a template.fields array.');
  }
  if (!Array.isArray(raw.hexes)) {
    return err('Save file is missing a hexes array.');
  }

  const fields: Field[] = [];
  for (let i = 0; i < raw.template.fields.length; i += 1) {
    const result = validateField(raw.template.fields[i], i);
    if (typeof result === 'string') return err(result);
    fields.push(result);
  }

  const hexes: Hex[] = [];
  for (let i = 0; i < raw.hexes.length; i += 1) {
    const result = validateHex(raw.hexes[i], i);
    if (typeof result === 'string') return err(result);
    hexes.push(result);
  }

  return { ok: true, value: { version: SAVE_VERSION, template: { fields }, hexes } };
}

/**
 * Migration seam keyed on `version`. v1 validates as-is; unknown versions are
 * rejected cleanly. A future v2 adds a case that upgrades to the current shape,
 * not a rewrite.
 */
export function migrate(raw: unknown): ParseResult {
  if (!isRecord(raw)) {
    return err('Save file must be a JSON object.');
  }
  switch (raw.version) {
    case SAVE_VERSION:
      return validateV1(raw);
    default:
      return err(
        `Unsupported save version: ${String(raw.version)}. This app supports version ${SAVE_VERSION}.`,
      );
  }
}

/** Parse save-file text: JSON-decode, then validate/migrate. Never throws. */
export function parseSaveFile(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return err('File is not valid JSON.');
  }
  return migrate(raw);
}
