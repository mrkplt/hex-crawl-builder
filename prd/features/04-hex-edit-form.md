# Feature: Hex Edit Form

## Purpose
The form that opens when you click a placed hex on the map — where the actual hex content gets filled in, using the live template as its layout/schema.

## Behavior
- Renders one input per field in the **current** template, in the template's `order`.
- Each input is pre-filled with `hex.fieldValues[field.id]` if present, otherwise blank.
- Field rendering by type:
  - `short_text` → single-line input
  - `long_text` → textarea
- Required fields (per the live template) are visually marked (e.g. asterisk/label styling) but this is informational only — nothing blocks saving or closing the form with required fields still empty. That incompleteness is exactly what drives the map's incomplete marker.

## Orphaned data
A hex may hold values for fields no longer in the current template (deleted from the template after being filled in). Per the data model, that data is never deleted — but by default it also won't render in the main form since it has no current field definition to render against.

## Open questions
- **Orphaned field visibility:** should there be a collapsed "legacy fields" section in the edit form showing old data that no longer maps to a template field, so it isn't silently inaccessible? Recommend yes, but not decided.
- **Save behavior:** should edits save live as you type/blur each field, or only on an explicit Save/Close action? This affects whether "unsaved changes" concepts exist at the form level, separate from the overall file save/load. Recommend live-save into in-memory state (explicit file save/export is a separate, later action per the Persistence doc), but confirm.
