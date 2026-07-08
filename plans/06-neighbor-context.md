# Plan 06 — Neighbor Context (Hex Focus View)

**Implements:** [`prd/features/06-neighbor-context.md`](../prd/features/06-neighbor-context.md)
**Depends on:** plans 00–05 (data model, template, map, edit form, persistence).
**Goal:** evolve the hex edit modal into a **focus view** that surrounds the
editable hex with its six directional neighbors — read-only, collapsed-by-default
with expand, `+`-to-create on empty edges, and Edit-to-navigate — as pure a view
as possible over the existing graph. **No data-model or save-format change.**

---

## Deliverables (`src/domain/`, `src/features/hex-edit/`)

### 1. Directional neighbor lookup (`src/domain/neighbors.ts`) — pure

```ts
// Length-6, indexed by Direction (0=NE … 5=NW); null where the edge is open
// or the referenced id is missing. Reads hex.neighbors — the graph is the
// source of truth, not coordinate math.
directionalNeighbors(hex: Hex, hexesById: Record<string, Hex>): (Hex | null)[]
```

Framework-free, reuses `Direction`/`DIRECTIONS` from plan 01. Target ~100 %.

> Do **not** re-derive neighbors from coordinates here — read the neighbor slots.
> The coordinate index stays a placement cache, not an adjacency source (plan 01
> invariant).

### 2. Neighbor panel (`src/features/hex-edit/NeighborPanel.tsx`)

One read-only panel for a single direction.

- **Props:** `direction`, `neighbor: Hex | null`, `template`, `onCreate(direction)`,
  `onEdit(hexId)`.
- **Empty slot** → a `+` create affordance, accessibly labelled by direction
  (e.g. "Create hex to the NE"); calls `onCreate(direction)`.
- **Populated, collapsed (default)** → a ~4-line truncated preview of the
  live-template fields in `order` (CSS line-clamp / fixed max-height), plus the
  incomplete marker when `isIncomplete(neighbor, template)`.
- **Click toggles expand.** Expanded shows the full live fields, then a read-only
  **Legacy fields** block from `orphanedEntries` (shown only when expanded), plus
  a collapse control and an **Edit** button that calls `onEdit(neighbor.id)`.
- Purely presentational — no store access; all mutation flows through the two
  callbacks.

### 3. Focus view container (`src/features/hex-edit/HexFocusView.tsx`)

- Modal shell + three-column grid: left column `NW / W / SW`, center the editable
  hex, right column `NE / E / SE`. Renders a `NeighborPanel` per direction from
  `directionalNeighbors(center, hexes)`.
- **Center pane is the existing edit form** (see task 4): buffered inputs,
  required markers, legacy section, Save / Close, discard guard — unchanged.
- **Wiring:**
  - `onCreate(direction)` → `store.placeHex(neighborCoord(center.coordinate, direction))`;
    the slot fills; **focus stays** on the current center.
  - `onEdit(neighborId)` → **navigate**: if the center buffer is dirty, show the
    discard confirm; on confirm switch center to `neighborId` (and reset panel
    expand state), else stay. With a clean buffer, switch immediately.
- **Responsive:** below a breakpoint, render the six panels as a single
  direction-labeled list beneath the center editor.

### 4. Editor/navigation refactor (`src/features/hex-edit/`)

- Factor the center editing form so `HexFocusView` composes it: the buffered
  form body becomes the center pane; the modal backdrop/shell lives in
  `HexFocusView`. Preserve doc-04 behavior exactly (buffered save, required
  marking, legacy section, discard-on-close).
- Share the dirty/discard logic between **close** and **navigate** (both leave
  the current hex) rather than duplicating it.
- `App` wires the map's `onHexClick` to open `HexFocusView` (replacing the direct
  `HexEditForm` modal); the selected/center hex id is view state that navigation
  updates.

## Out of scope (per PRD)
- Second-ring neighbors; editing neighbor content in place; a title/summary
  field; auto-navigating into a `+`-created hex.

## Testing requirements

- **`directionalNeighbors` (pure, ~100 %):** the right hex per direction; `null`
  for open edges and dangling ids; a fully-surrounded hub returns all six; the
  slot for direction *d* matches `hex.neighbors[d]`.
- **NeighborPanel (Testing Library + user-event):**
  - Empty → renders the create affordance; activating it calls `onCreate` with
    the direction.
  - Populated collapsed → shows a truncated preview; incomplete neighbor shows
    the marker; orphaned values are **not** shown while collapsed.
  - Expand → full fields + legacy (orphaned) values shown; Edit calls `onEdit`
    with the id; collapse hides them again.
  - No editable controls (read-only).
- **HexFocusView (integration):**
  - Renders the center editor plus six panels in the correct direction slots
    (assert placement/labels: right = NE/E/SE, left = NW/W/SW).
  - `+` on an empty edge places a hex adjacent to center (via `placeHex`), fills
    that slot, and leaves focus on the current hex.
  - Edit with a **clean** center navigates immediately and the new center's
    neighbors render; Edit with **unsaved** edits prompts — Cancel stays, Confirm
    discards and navigates.
  - Save still commits only the center hex; navigation never saves.
- **No persistence regression:** a save/load round-trip is unchanged by this
  feature (light guard test acceptable).

## Acceptance criteria

- [ ] Clicking a hex opens the focus view: editable center + six neighbors, right
      column NE/E/SE and left column NW/W/SW; no panel above/below center.
- [ ] Neighbor panels are read-only, collapsed to a ~4-line preview by default,
      expandable to full content, with orphaned values shown only when expanded.
- [ ] Incomplete neighbors show the incomplete marker.
- [ ] Empty edges offer `+` to create an adjacent, auto-linked hex, filling the
      slot without navigating.
- [ ] An expanded panel's Edit re-centers the view on that neighbor; leaving a
      hex with unsaved edits prompts to discard.
- [ ] No data-model or save-format change; existing save files still load.
- [ ] Coverage ≥ 80 % for new code (`src/domain/neighbors.ts` ≈ 100 %);
      `npm run verify` passes.
