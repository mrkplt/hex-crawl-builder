# Feature: Checklist Template Builder

## Purpose
Define the schema of fields that every hex on the map will carry. Acts as validation/display schema, not a hard data constraint.

## Initial state (first run)
On first run — no save file loaded — everything starts in a **completely new, empty state**: an empty template (no fields yet) and no placed hexes. The hex map screen is the primary surface (see doc 00, App shell), but with no fields defined the natural first step is to open the **Template editor** (via the Template edit button) and define the schema before placing hexes.

## Field model
```
Field {
  id: string          // stable, generated once, never reused/changed
  label: string        // user-editable display name
  type: FieldType       // extensible, see below
  required: boolean     // drives "incomplete" flag only, not save-blocking
  order: number         // position in the list, drives display order everywhere
}
```

## Field types (v1 + extensibility)
Ship with exactly two types:
- `short_text` — single-line input
- `long_text` — multi-line textarea

Design the type system as a registry/lookup (e.g. a map of `type -> { render component, default value, validation-empty check }`) rather than a hardcoded switch, so future types (`checkbox`, `number`, `select`, etc.) are additive, not a refactor.

## Actions
- **Add field** — appends a new field with a default label, defaults to `short_text` / optional, placed at the end of the order.
- **Edit field** — change label, type, or required flag in place. Same field `id` is retained.
- **Delete field** — removes the field from the template only. Does **not** touch any hex's already-stored value for that field id (see Hex Data Model doc).
- **Reorder** — drag-and-drop to rearrange. `order` is persisted and drives field order in the Hex Edit Form.

## Business rules
- Template is editable at any time, including after hexes exist and have data.
- Field `id` must be stable across renames — renaming a field is an edit, not a delete+recreate, so existing hex values stay attached to the (relabeled) field.
- No hard limit on number of fields for v1.

## Out of scope for v1 (but keep the door open)
- Multiple named templates / template library.
- Field-level validation beyond required/optional (e.g. max length, regex).
- Default values per field.

## Open questions
- ~~Should there be a way to see/manage orphaned-field data?~~ **Partly decided:** orphaned values are surfaced **read-only per hex** in a collapsed "Legacy fields" section of the Hex Edit Form (see doc 04). A *template-level* audit/management view (list all orphaned field ids across all hexes, bulk delete, or re-adopt into the template) remains deferred — not built for v1, but the read-only per-hex surfacing keeps the data reachable in the meantime.
