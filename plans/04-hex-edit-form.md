# Plan 04 — Hex Edit Form

**Implements:** [`prd/features/04-hex-edit-form.md`](../prd/features/04-hex-edit-form.md)
**Depends on:** plans 00, 01, 02, 03.
**Goal:** the modal that opens when a placed hex is clicked — fill in that hex's
content against the **live template**, with buffered explicit-save semantics and
a read-only "Legacy fields" section for orphaned values.

---

## Deliverables (`src/features/hex-edit/`)

### 1. Modal opened from a map click
- Wire plan 03's `onHexClick(hexId)` to open this form for that hex. This
  completes the click-to-edit path stubbed in plan 03.

### 2. Live-template-driven inputs
- Render **one input per field in the current template, in `order`** (plan 02).
- Each input pre-filled with `hex.fieldValues[field.id]` if present, else blank.
- **Rendering by type comes from the field-type registry** (plan 01), not a
  switch — register each type's input component here (or in a shared registry
  module):
  - `short_text` → single-line input
  - `long_text` → textarea
  A future registered type gets an input by adding a registry entry.
- **Required fields are marked** (asterisk/label styling) but this is
  **informational only** — nothing blocks saving/closing with them empty. That
  emptiness is exactly what drives the map's incomplete marker (plan 03).

### 3. Buffered, explicit Save (PRD — decided: not live-save)
- Edits live in a **form-local buffer** while open; they commit to the hex's
  `fieldValues` (in-memory store, plan 01 `setHexFieldValues`) **only on
  explicit Save**.
- Closing/cancelling **without** saving discards buffered edits; the hex is
  unchanged.
- Because values commit on Save, the incomplete marker updates on Save, not per
  keystroke.
- **Discard guard:** if the form is closed with unsaved buffered edits, prompt
  to confirm discarding. (This is the form-local buffer — distinct from the
  file-level save/export in plan 05; Save here writes to memory, not disk.)

### 4. Legacy / orphaned fields (PRD — decided: read-only)
- Below the live inputs, show a **collapsed "Legacy fields" section** whenever
  the hex holds `fieldValues` entries whose id is **not** in the current
  template (use plan-01 `orphanedEntries`).
- List each orphaned entry (field id + stored value) as **read-only** — visible
  and copyable, clearly not a live/editable field.
- **Omit the section entirely** when there are no orphans (the common case) — no
  clutter for in-sync hexes.
- v1 is read-only only: no "delete this orphan" or "re-adopt into template"
  action (deferred, see PRD 01's audit-view note).

## Testing requirements

- **Component tests (Testing Library + user-event):**
  - Renders one input per live-template field, in `order`, pre-filled from
    `fieldValues`; blank where absent.
  - `short_text` → text input, `long_text` → textarea (registry-driven).
  - Required fields show the marker; saving/closing with a required field empty
    is **allowed** (nothing blocks) and the hex is (correctly) incomplete after.
  - **Buffered save:** typing then closing **without** Save → hex unchanged;
    typing then Save → `fieldValues` updated in the store.
  - **Discard guard:** closing with unsaved edits prompts; confirming discards,
    cancelling keeps the form open with edits intact.
  - **Legacy section:** hidden when no orphans; shown (collapsed) listing
    orphaned id+value read-only when the hex has values for fields not in the
    template; the orphaned inputs are non-editable.
- **Integration:** save-driven completeness — after Save fills the last empty
  required field, the hex's `isIncomplete` flips to false (drives plan 03's
  marker).

## Acceptance criteria

- [ ] Clicking a hex on the map opens this form for that hex.
- [ ] Inputs are driven by the live template + registry, in order, pre-filled.
- [ ] Required marking is informational; nothing blocks save/close.
- [ ] Edits are buffered and commit only on explicit Save; cancel discards.
- [ ] Closing with unsaved edits prompts to confirm discard.
- [ ] Orphaned values appear read-only in a collapsed "Legacy fields" section,
      and the section is absent when there are none.
- [ ] Saving updates completeness live (map marker reflects it).
- [ ] Coverage ≥ 80 % for `src/features/hex-edit/**`; `verify` passes.
