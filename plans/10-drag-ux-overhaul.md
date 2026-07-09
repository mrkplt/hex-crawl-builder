# Plan 10 — Drag UX Overhaul

**Implements:** [`prd/features/10-drag-ux-overhaul.md`](../prd/features/10-drag-ux-overhaul.md)
**Depends on:** plans 00–06 (the full map is built); plan 11 (contiguity) can
land before or after this plan — they touch the same `placement.ts` decision
layer but do not conflict.
**Goal:** fix four drag defects: palette tile reads as a button, canvas pans
during drags, drag preview doesn't follow the pointer, and drag-to-trash never
fires.

---

## Root cause

React Flow's canvas pan is active at all times, including during node drags. When
the user starts dragging a placed hex, RF pan competes: the canvas origin shifts
under the pointer, so `onNodeDragStop` fires with wrong coordinates and the trash
`<div>` hit-test fails. The single fix that unblocks three of the four defects is
**disabling RF pan while any drag is in progress**.

---

## Tasks

### Task 1 — Canvas-lock during drag (`HexMap.tsx`)

Add a `dragging` boolean to `HexMapInner`'s state (or a `useRef` — a ref is
sufficient since changing it does not need to re-render the component itself):

```ts
const isDragging = useRef(false);
```

Pass `panOnDrag={!isDragging.current}` (or the equivalent RF prop) to
`<ReactFlow>`. Because RF re-reads this prop on each render, we need to actually
trigger a re-render when the flag flips — use `useState` instead of `useRef` for
`isDragging`.

Set `isDragging = true` at drag start:
- **Palette drag:** in `onPaletteDragStart`.
- **Placed-hex drag:** in `onNodeDragStart` (add this RF callback alongside the
  existing `onNodeDragStop`).

Set `isDragging = false` at drag end:
- **Palette drag:** in `onDragEnd` on the palette tile (`<div onDragEnd>`) AND
  in `onDrop` on the canvas (whether the drop is accepted or rejected). Also
  handle the `onDragEnd` event on the `<div className="hex-map__canvas">` as a
  fallback for drops outside the canvas (Escape, drop on non-target).
- **Placed-hex drag:** in `onNodeDragStop` (already exists — add the flag clear
  there) and in `onNodeDragStart`'s cleanup path if RF fires it on cancel.

**Important:** the flag must never get stuck `true`. Add an `onDragEnd` handler
everywhere a drag can end, including cancel/abort paths. If in doubt, also clear
it on `onMouseUp` at the window level as a safety net.

ReactFlow pan prop: use `panOnDrag={!isDragging}` on `<ReactFlow>`. When
`panOnDrag` is `false`, RF still allows node dragging but canvas pan is
suppressed.

**Tests:**
- `isDragging` is `true` between `onPaletteDragStart` and `onDrop`/`onDragEnd`.
- `isDragging` is `true` between `onNodeDragStart` and `onNodeDragStop`.
- After drag end (any path), `isDragging` is `false`.
- These are unit tests on the handlers; assert the flag value, not the RF prop
  (the RF prop is tested implicitly by the E2E-level behavior).

---

### Task 2 — Palette tile affordance (`HexMap.tsx` + `HexMap.css`)

Replace the current `<div className="hex-map__palette-tile">+ New hex</div>`
with an SVG hex shape matching the placed hexes' visual style.

- Use the same pointy-top hex polygon points as `HexTile.tsx` (import the
  `hexPoints` / `polygonPoints` helper from `src/features/map/geometry.ts`).
- Render as an `<svg>` with a `<polygon>` inside a `<div>` that is still
  `draggable`. The label ("New hex" or similar) sits below or inside the SVG.
- Apply CSS `cursor: grab` on the element and `cursor: grabbing` on `:active`.
- Do not apply `role="button"` or button chrome (no border-radius button style).
- The tile remains always-present and unlimited.

The `HexTile` component is currently React-Flow-specific. Extract or duplicate
the polygon-points math into a standalone helper if it isn't already in
`geometry.ts`, so the palette can use it without importing RF internals.

**Tests:**
- The palette tile renders an `<svg>` with a `<polygon>` (assert via role or
  element query).
- The tile is `draggable` (assert `draggable` attribute).
- No `role="button"` on the palette tile.

---

### Task 3 — Drag preview for palette drag

The default HTML5 drag image is a snapshot of the `<div>` being dragged. Replace
it with a hex-shaped ghost that follows the pointer.

Implementation approach (HTML5 `dataTransfer.setDragImage`):
- In `onPaletteDragStart`, create an off-screen `<canvas>` or `<img>` element
  that renders a hex polygon at the palette's size.
- Call `event.dataTransfer.setDragImage(element, offsetX, offsetY)` so the hex
  ghost is centered on the pointer.
- Append the element to `document.body` temporarily during the drag (required by
  some browsers for `setDragImage` to work on an off-screen element), then remove
  it on `onDragEnd`.

If `setDragImage` proves unreliable across browsers, an alternative is to
suppress the default drag image entirely (`setDragImage(document.createElement
('span'), 0, 0)`) and render a custom floating hex overlay (a `position: fixed`
SVG that follows `pointermove`) while `isDragging` is true. Either approach is
acceptable as long as the user sees a hex polygon following their pointer during
a palette drag. Document which approach was used in a comment.

**Tests:**
- `dataTransfer.setDragImage` is called in `onPaletteDragStart` (mock
  `dataTransfer` and assert the call).
- The drag image element is a hex polygon, not the original `<div>` snapshot
  (assert it is a different element / an SVG/canvas type).

---

### Task 4 — Trash zone prominence during drag

While `isDragging` is `true`, the trash zone should be visually prominent
(highlighted, larger, or otherwise clearly a target). It returns to its resting
state when `isDragging` is `false`.

- Pass `isDragging` as a prop to the trash `<div>` (or apply a CSS class
  conditionally): `className={isDragging ? 'hex-map__trash hex-map__trash--active' : 'hex-map__trash'}`.
- `hex-map__trash--active` styles the zone to be visually prominent (specific
  styling is out of scope — the requirement is that the class is toggled).
- The trash zone shows this state during **both** palette drags and placed-hex
  drags (a single `isDragging` flag drives it). However, palette drags have no
  effect when dropped on the trash (see task 5).

**Tests:**
- Trash element has the active class when `isDragging` is `true`.
- Trash element does not have the active class when `isDragging` is `false`.

---

### Task 5 — Trash drop for placed hexes (verify the existing path works
post-lock)

The existing `onNodeDragStop` already contains the trash hit-test via
`resolveDragStop` → `isOverTrash`. The reason it doesn't fire today is that
canvas pan interferes with `onNodeDragStop`. With task 1 in place (pan locked),
this path should now work correctly.

Verify and if needed fix:
- `onNodeDragStop` must receive `event.clientX / event.clientY` coordinates that
  are in screen space, not flow space. Confirm the pointer coordinates passed to
  `resolveDragStop` are screen coordinates (they are used by `isOverTrash` which
  compares against `getBoundingClientRect()`). This is the existing behavior —
  just verify it's still correct.
- The `trashRef.current?.getBoundingClientRect()` must be called at drop time, not
  cached from render time. This is the existing behavior — confirm it's called
  inside `onNodeDragStop`.

For the **palette drag → trash** case: the palette uses HTML5 drag-and-drop, and
the canvas `onDrop` handler fires (the canvas is the `onDrop` target). In `onDrop`,
the existing code checks `event.dataTransfer.getData(PALETTE_MIME)` and only acts
if it's `'new-hex'`. If a palette drag is released over the trash `<div>` inside
the canvas, the canvas `onDrop` fires. Add an explicit no-op guard: if the drop
target is the trash zone (check `event.target` or the pointer position against
`trashRef.current`), skip creation and return — no hex is placed.

**Tests:**
- `resolveDragStop` returns `{ kind: 'delete' }` when pointer is over the trash
  rect (existing test — verify it still passes after task 1 changes).
- Palette drop over the trash zone: `placeHex` is NOT called (no hex created).
- Palette drop over a valid empty cell adjacent to an existing hex: `placeHex` IS
  called (sanity-check the non-trash path still works).

---

### Task 6 — Verify placed-hex move works post-lock

Moving a placed hex by dragging it to a new cell is currently broken for the same
root cause (canvas pan). With task 1 in place, verify the existing `onNodeDragStop`
→ `resolveDragStop` → `moveHex` path works end-to-end.

- The `nodePixel` passed to `resolveDragStop` is `node.position` from React
  Flow's `onNodeDragStop` callback. Confirm this is in flow space and that
  `pixelToAxial(node.position, HEX_SIZE)` correctly snaps to the destination
  cell.
- If `node.position` is the top-left of the node bounding box (not the center),
  and the `nodeOrigin={[0.5, 0.5]}` prop is set on `<ReactFlow>`, RF adjusts
  the position to the center — confirm this is the case and the snapping math
  accounts for it.

**Tests:**
- `resolveDragStop` with a pointer not over trash and a valid destination returns
  `{ kind: 'move' }` (existing test — verify passing).
- `onNodeDragStop` for a valid destination calls `moveHex` with the correct
  destination coordinate (component test with a mocked store).
- `onNodeDragStop` for an occupied destination calls `resetFromStore` (snap back,
  no `moveHex` call).

---

## Acceptance criteria

- [ ] Canvas does not pan during a palette drag or a placed-hex drag.
- [ ] Canvas pan resumes after any drag ends (including cancel/Escape).
- [ ] Palette tile renders as a hex SVG polygon with grab cursor; no button chrome.
- [ ] Dragging the palette tile shows a hex-shaped ghost following the pointer.
- [ ] Dropping a placed hex on the trash zone opens the confirm dialog (with pan
      locked).
- [ ] Dropping a placed hex on an empty valid cell moves it correctly.
- [ ] Trash zone is visually prominent while any drag is in progress.
- [ ] Dropping a palette drag on the trash zone does not create a hex.
- [ ] Coverage ≥ 80 % for `src/features/map/**`; `verify` passes.
