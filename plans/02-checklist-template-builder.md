# Plan 02 — Checklist Template Builder

**Implements:** [`prd/features/01-checklist-template-builder.md`](../prd/features/01-checklist-template-builder.md)
**Depends on:** plans 00, 01.
**Goal:** the Template editor surface — add / edit / delete / reorder the fields
that define the per-hex schema — wired to the store from plan 01 so edits update
completeness everywhere live.

---

## Deliverables (`src/features/template/`)

### 1. Template editor surface

- Reached via the **"Template" edit button** in the app shell (product vision,
  doc 00). Renders the current template's fields in `order`.
- **Initial/empty state:** on first run the template is empty; show an
  empty-state prompt inviting the user to add the first field (this is the
  natural first step before placing hexes, per PRD 01 "Initial state").

### 2. Per-field editor row

Each field renders controls for:
- **Label** — text input, editable in place. Editing keeps the same `Field.id`
  (rename is an edit, not delete+recreate) so hex values stay attached.
- **Type** — a picker populated **from the field-type registry** (plan 01), not
  a hardcoded list. Ships with `short_text` / `long_text`; a future registered
  type appears automatically.
- **Required** — a toggle. Drives the incomplete flag only; never blocks
  anything.
- **Delete** — removes the field from the template only. **Must not** touch any
  hex's stored value for that field id (calls plan-01 `deleteField`, which
  preserves values). Consider a light confirm since data becomes "legacy," but
  note per PRD this is *not* destructive to hex data.

### 3. Reordering

- Drag-and-drop to reorder fields; persist the new `order`. It drives field
  order in the Hex Edit Form (plan 04) and everywhere.
- **Recommended lib:** `dnd-kit` (`@dnd-kit/core` + `@dnd-kit/sortable`) —
  accessible, keyboard-operable, testable. Keep the reorder *result* (an ordered
  id list → `order` values) computed by a pure function so it's unit-testable
  without simulating a drag.

### 4. Add field

- "Add field" appends a new field: default label, `short_text`, optional, placed
  at the end of the order (calls plan-01 `addField`).

### 5. Live completeness wiring

- All edits go through the store. Because completeness is derived live
  (plan 01), editing the schema must immediately update every hex's incomplete
  marker on the map — verify this integration once the map (plan 03) exists; for
  this plan, assert the store state changes that drive it.

## Out of scope (per PRD, keep the door open)

- Multiple named templates / template library.
- Field validation beyond required/optional.
- Per-field default values.
- A template-level orphaned-field audit/management view (deferred; per-hex
  read-only surfacing is handled in plan 04).

## Testing requirements

- **Component tests (Testing Library + user-event):**
  - Empty state renders the "add your first field" prompt.
  - Add field appends a row with the documented defaults.
  - Editing a label updates it while the `Field.id` is unchanged (assert via
    store/state, not the DOM label alone).
  - Changing type via the picker updates the field; the picker options come from
    the registry (assert both shipped types appear).
  - Toggling required updates the field.
  - Deleting a field removes the row **and** leaves any hex's stored value for
    that id intact (seed a hex with a value, delete the field, assert value
    persists — the non-destructive guarantee).
- **Reorder logic (pure unit test):** given an ordered id list, produces correct
  `order` numbers; moving first→last and last→first behave.
- **Registry-driven picker:** adding a hypothetical third registry type makes it
  selectable without editing the component (structural/integration test).

## Acceptance criteria

- [ ] Template editor opens from the "Template" button and lists fields in order.
- [ ] Add / edit / delete / reorder all work and persist through the store.
- [ ] Renaming preserves `Field.id`; deleting a field preserves hex data.
- [ ] Type picker is registry-driven, not hardcoded.
- [ ] Empty-first-run state guides the user to add the first field.
- [ ] Coverage ≥ 80 % for `src/features/template/**`; `verify` passes.
