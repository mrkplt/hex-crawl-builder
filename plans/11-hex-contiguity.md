# Plan 11 — Hex Contiguity

**Implements:** [`prd/features/11-hex-contiguity.md`](../prd/features/11-hex-contiguity.md)
**Depends on:** plans 00–06. Can land before or after plan 10 — they touch the
same `placement.ts` file but different decision paths.
**Goal:** enforce that every placed hex is adjacent to at least one existing hex
(except the very first hex), and that a moved hex lands adjacent to at least one
other hex.

---

## Architecture

The adjacency check is **pure domain logic** — it lives in
`src/features/map/placement.ts` alongside the existing `decidePaletteDrop` and
`decideMove` functions. No React or store changes are needed for the decision
itself. The visual rejection feedback is handled at the `HexMap` component level.

The check reuses the `DIRECTION_VECTORS` table from `src/domain/directions.ts`
(the single source of axial deltas — never re-derived, per the project invariant)
and the `CoordinateIndex` from `src/domain/coordinates.ts` (the derived cache for
occupancy lookups).

---

## Tasks

### Task 1 — `isAdjacentToAny` in `src/features/map/placement.ts`

Add a new pure function:

```ts
/**
 * Returns true if `target` is adjacent to at least one occupied cell in
 * `index`, excluding `excludeId` from occupancy (used for move: the moving
 * hex doesn't count as its own neighbor).
 */
export function isAdjacentToAny(
  target: AxialCoord,
  index: CoordinateIndex,
  excludeId?: string,
): boolean;
```

Implementation:
- Iterate over the six `DIRECTION_VECTORS` (imported from
  `src/domain/directions.ts`).
- For each direction, compute the neighbor cell: `{ q: target.q + dq, r: target.r + dr }`.
- Look it up in `index` (the coordinate index's lookup method).
- If the result is a hex id and it is **not** `excludeId`, return `true`.
- If none of the six neighbors match, return `false`.

**Tests (pure, no DOM — high coverage required):**
- `isAdjacentToAny` returns `true` when at least one neighbor cell is occupied.
- Returns `false` when no neighbor cells are occupied (isolated target).
- Correctly excludes `excludeId`: a target adjacent only to the excluded hex
  returns `false`.
- Works for all six directions (test at least NE, E, SE, SW, W, NW — one test
  each or a parameterized suite).
- Empty index (no hexes) → returns `false`.

---

### Task 2 — Amend `decidePaletteDrop` in `src/features/map/placement.ts`

Current signature:
```ts
export function decidePaletteDrop(state: GraphState, coordinate: AxialCoord): PlacementDecision
```

Add contiguity check:
```
if (isOccupied(state, coordinate)) → rejected   (existing, unchanged)
if (state.index is empty) → place               (first-hex exception: no hexes yet)
if (isAdjacentToAny(coordinate, state.index)) → place
otherwise → rejected
```

The "index is empty" check is the first-hex exception: if the coordinate index
has no entries, the map is empty and any cell is valid.

`PlacementDecision` type already covers `'place'` and `'rejected'` — no new
variant needed.

**Tests:**
- Drop on empty map (no hexes) → `place` (first-hex exception).
- Drop adjacent to an existing hex → `place`.
- Drop not adjacent to any hex (isolated) → `rejected`.
- Drop on occupied cell → `rejected` (unchanged).
- Drop adjacent to an existing hex but on an occupied cell → `rejected` (occupancy
  check takes precedence; order doesn't matter since both reject, but verify the
  occupied check still fires).

---

### Task 3 — Amend `decideMove` in `src/features/map/placement.ts`

Current signature:
```ts
export function decideMove(
  state: GraphState,
  hexId: string,
  destination: AxialCoord,
): MoveDecision
```

Add contiguity check:
```
if (destination is occupied by another hex) → rejected   (existing, unchanged)
if (destination === hex's current cell, i.e. no-op) → rejected   (existing, unchanged)
if (there is only one hex total, i.e. the hex being moved is the only one)
    → move (lone-hex exception: nothing to disconnect)
if (isAdjacentToAny(destination, state.index, hexId)) → move
otherwise → rejected
```

The lone-hex exception: `state.index.size === 1`. With one hex in the map, there
are no other hexes to be adjacent to, so the moved hex can land anywhere empty.

`excludeId` is `hexId` — the moving hex's own cells must not count as the
adjacency neighbor (the moving hex is vacating its current cell, and it must not
satisfy its own adjacency requirement at the destination).

`MoveDecision` type already covers `'move'` and `'rejected'` — no new variant
needed.

**Tests:**
- Move to a cell adjacent to a different hex → `move`.
- Move to a cell not adjacent to any other hex → `rejected`.
- Move to a cell adjacent only to the hex's own current position (self-adjacency
  via `excludeId`) → `rejected`.
- Move to an occupied cell → `rejected` (unchanged).
- No-op move (same cell) → `rejected` (unchanged).
- Lone-hex map (only one hex total) → `move` regardless of destination (as long
  as cell is empty).
- Move on a two-hex map where the destination is adjacent only to the moved hex's
  origin (not any other hex) → `rejected`.

---

### Task 4 — Rejection feedback in `HexMap.tsx`

When a drop is rejected (placement or move), the hex snaps back (existing
behavior via `resetFromStore`). Add a brief visual indicator that the rejection
was specifically a contiguity rejection.

Implementation:
- Add a `rejectionReason: 'occupied' | 'not-adjacent' | null` state to
  `HexMapInner`.
- In `onDrop` (palette) and `onNodeDragStop` (move), when the decision is
  `'rejected'`, determine why:
  - `isOccupied` → `'occupied'`
  - `!isAdjacentToAny` → `'not-adjacent'`
  - (Existing rejections from occupancy remain labelled `'occupied'`.)
- Apply a CSS class to the canvas or a transient overlay element when
  `rejectionReason === 'not-adjacent'` (e.g. `hex-map__canvas--rejected-adjacency`).
- Clear `rejectionReason` after a short timeout (e.g. 800 ms via `setTimeout` in
  the effect or directly after `resetFromStore`).

The exact visual treatment (color, animation) is out of scope — the requirement
is that a distinguishable class is applied briefly and then removed. The engineer
chooses the animation.

**Tests:**
- Palette drop not adjacent: `rejectionReason` is set to `'not-adjacent'` (or
  the canvas class is applied briefly) after the drop.
- Palette drop occupied: `rejectionReason` is `'occupied'` (or the corresponding
  class).
- Move not adjacent: same as palette case.
- After the timeout, `rejectionReason` is `null` / class is removed (use
  `vitest`'s fake timers).
- Accepted drop: no rejection class is applied.

---

### Task 5 — Update `placement.test.ts`

The existing `src/features/map/placement.test.ts` tests `decidePaletteDrop` and
`decideMove`. Extend it to cover the new contiguity branches (tasks 2 and 3 test
cases above). Keep the existing tests — they must still pass.

Also add tests for `isAdjacentToAny` here (or in a sibling file — keep it
alongside `placement.ts`).

---

## Acceptance criteria

- [ ] Dropping the palette tile on an empty map (no hexes) places a hex
      (first-hex exception).
- [ ] Dropping the palette tile on a cell not adjacent to any hex is rejected
      (snaps back with feedback).
- [ ] Dropping the palette tile on a cell adjacent to an existing hex places a
      hex.
- [ ] Moving a placed hex to a cell adjacent to a different hex is accepted.
- [ ] Moving a placed hex to a non-adjacent cell is rejected (snaps back with
      feedback).
- [ ] Moving the only hex on the map succeeds (lone-hex exception).
- [ ] Moving a hex to a cell adjacent only to its own current position is
      rejected.
- [ ] Rejected contiguity drops produce a visible, brief feedback indicator
      distinct from a successful drop.
- [ ] Trashing a hex is unaffected by contiguity (the delete path doesn't go
      through `decideMove`).
- [ ] The shared `DIRECTION_VECTORS` table is used — no re-derived deltas at this
      call site.
- [ ] Coverage ≥ 80 % for `src/features/map/**` (placement logic ≈ 100 %);
      `verify` passes.
