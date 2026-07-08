import type { Hex, Template } from './types';

export interface OrphanedEntry {
  id: string;
  value: string;
}

/**
 * The stored `fieldValues` whose id is not in the current template — data left
 * behind when a field was deleted or renamed. Never removed (template edits are
 * non-destructive to hex data); surfaced read-only by the edit form and carried
 * through save/load.
 */
export function orphanedEntries(hex: Hex, template: Template): OrphanedEntry[] {
  const known = new Set(template.fields.map((field) => field.id));
  return Object.entries(hex.fieldValues)
    .filter(([id]) => !known.has(id))
    .map(([id, value]) => ({ id, value }));
}
