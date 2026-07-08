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
A hex may hold values for fields no longer in the current template (deleted from the template after being filled in). Per the data model, that data is never deleted — but it has no current field definition to render against in the main form.

**Decided: surface it read-only.** Below the live-template inputs, the edit form shows a **collapsed "Legacy fields" section** whenever the hex holds one or more `fieldValues` entries whose id is not in the current template. It lists each orphaned entry (its field id and stored value) as **read-only** — visible and copyable, but clearly not a live field and not editable. This keeps deliberately-preserved data from becoming silently inaccessible, without re-promoting it into the schema.
- The section is omitted entirely when a hex has no orphaned values (the common case), so it adds no clutter for hexes that are fully in sync with the template.
- Read-only only for v1: no in-form "delete this orphaned value" or "re-adopt into template" action yet (that's the deferred option, see doc 01's audit-view note).

## Save behavior
**Decided: explicit Save, not live-save.** Edits are held in a form-local buffer while the form is open; they are only committed to the hex's `fieldValues` (in-memory state) when the user explicitly **Saves**. Closing/cancelling without saving discards the buffered edits and leaves the hex unchanged.
- Because values commit only on Save, a hex's incomplete marker (per doc 02) updates when the form is saved, not keystroke-by-keystroke.
- If the form is closed with unsaved edits in the buffer, prompt to confirm discarding them (this is a form-local buffer, distinct from the file-level save/export in doc 05 — Saving here writes to memory, not to disk).
