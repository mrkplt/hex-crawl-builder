# Plan 03 — Hex Map Grid & Placement

**Implements:** [`prd/features/03-hex-map-grid-placement.md`](../prd/features/03-hex-map-grid-placement.md)
**Depends on:** plans 00, 01, 02.
**Goal:** the primary working surface — a growable true hex-grid where hexes are
dragged in from a palette, moved, deleted (with confirmation), marked incomplete,
and clicked to edit. Rendered as a **node-link graph**, not a scanned grid.

---

## Architecture: two layers, kept separate (per PRD technical addendum)

The PRD is explicit that **node position** (from axial `{q,r}` geometry) and
**edges** (the neighbor graph) are different concerns and should be handled by
different libraries. Honor that split:

**Layer 1 — hex geometry (positioning + shape + snapping).**
- **Decision: hand-roll redblobgames-style pointy-top axial math** rather than
  pull in `react-hexgrid`. The PRD names `react-hexgrid` as a good fit *or*
  "hand-rolled redblobgames-style axial math." We choose hand-rolled because:
  (a) it's ~30 lines, fully unit-testable (helps the coverage mandate), (b) it
  avoids a second SVG layout system fighting React Flow, and (c) it lets us
  reuse the **exact same `DIRECTION_VECTORS` table from plan 01** so model and
  render can never disagree. *This is a deliberate, documented deviation from
  the PRD's first-named suggestion — revisit if `react-hexgrid` is preferred.*
- Provides: `axialToPixel({q,r}, size) → {x,y}`, `pixelToAxial({x,y}, size) →
  {q,r}` (with cube-rounding to snap to the nearest cell), and the hex polygon
  points for a given size. **Pointy-top**, sharing plan 01's direction table.

**Layer 2 — interaction/canvas (drag, pan, zoom, click, growable).**
- **React Flow (`@xyflow/react`).** Each `Hex` → a React Flow node with
  `position = axialToPixel(hex.coordinate, size)`. Each neighbor link → a React
  Flow edge (structure only). Custom node type renders the hex polygon +
  incomplete marker. Rely on RF's built-in drag/pan/zoom/click.
- **Invisible edges (PRD caveat — do not assume free):** RF edges default to
  visible connector lines, which is wrong here. Style edges fully
  transparent/hidden; adjacency is communicated by hexagons sharing a border,
  not by drawn lines. The edges exist only to carry graph structure for the
  future traversal feature.

## Deliverables (`src/features/map/`)

### 1. Palette / tray
- A single generic "new hex" tile, always available, unlimited (one kind of
  hex, no variants). Draggable onto the canvas.

### 2. Placement (drag from palette)
- Dropping the palette tile on an empty cell instantiates a `Hex` at the
  snapped coordinate via plan-01 `placeHex`, using the **live template** for
  (empty) field values. Neighbor links are computed at this point by `placeHex`.
- **Reject drop on an occupied cell** (PRD Open Question — decided): if
  `isOccupied` (plan 01) is true at the target, reject and snap back; no swap,
  no stack. Applies to palette drops **and** moves.

### 3. Moving
- Any placed hex can be dragged to a new empty cell. On drop, call plan-01
  `moveHex` (updates coordinate + recomputes links for the hex and both its old
  and new neighbors). Occupied-target → reject + snap back.

### 4. Deleting (the one destructive action)
- A trash/delete zone. Dropping a hex on it **opens a confirmation modal** (PRD
  Open Question — decided). Cancel → hex snaps back unchanged. Confirm → plan-01
  `deleteHex` (removes the hex + its values, clears every neighbor's reciprocal
  slot).

### 5. Incomplete indicator
- A hex where `isIncomplete(hex, liveTemplate)` (plan 01) is true gets a visual
  marker on its tile (e.g. colored border / icon). No separate list/panel.
  Because it reads the live template, editing the schema (plan 02) updates
  markers immediately — verify this cross-feature.

### 6. Zoom
- Hex render size is user-adjustable (zoom) independent of the underlying grid
  data — drive it through RF's zoom and/or the geometry `size` param.

### 7. Growable canvas
- No fixed bounds; the surface grows to accommodate hexes placed further out
  (RF's pannable/zoomable infinite canvas gives this).

### 8. Click-to-edit (stub now, wired in plan 04)
- Clicking a placed hex fires an `onHexClick(hexId)` callback. In this plan it's
  a stub (e.g. logs / selects). **Plan 04 wires it to open the Hex Edit Form.**

## Out of scope (per PRD)
- Terrain types, skins/icons, any painting behavior.
- Fog of war, pathing/travel (future feature the neighbor graph is a hook for).

## Testing requirements

Split logic from rendering so the math is testable without a canvas.

- **Geometry (pure unit tests, high coverage):**
  - `axialToPixel` for known coordinates matches expected pixel positions.
  - `pixelToAxial` round-trips `axialToPixel` and snaps off-center points to the
    correct nearest cell (test points near a hex edge/vertex).
  - Adjacent axial coordinates via plan-01 direction vectors map to adjacent
    (touching) pixel hexes — the model/render agreement check.
- **Interaction logic (unit tests on the handlers, not RF internals):**
  - Palette drop on empty cell → `placeHex` called with snapped coord + live
    template.
  - Drop on occupied cell → rejected, `placeHex`/`moveHex` **not** called.
  - Move to empty cell → `moveHex` called; move to occupied → rejected.
  - Drop on trash → opens confirmation modal; Confirm → `deleteHex` called;
    Cancel → nothing changes.
- **Component tests (Testing Library):**
  - A hex that is incomplete renders the marker; filling required fields (or
    removing the required field from the template) removes it.
  - Clicking a hex calls `onHexClick` with its id.
  - Confirmation modal Confirm/Cancel paths.
- **Edges are invisible:** assert the edge styling renders no visible connector
  (class/style assertion) — guards against the PRD's default-visible caveat
  regressing.

## Acceptance criteria

- [ ] Geometry is hand-rolled, pointy-top, and reuses plan 01's direction table;
      model "NE neighbor" renders up-and-to-the-right.
- [ ] Palette drag creates a hex via `placeHex` using the live template.
- [ ] Occupied-cell drops (place and move) are rejected with snap-back.
- [ ] Move recomputes links via `moveHex`.
- [ ] Trash drop → confirmation modal → `deleteHex` on confirm only.
- [ ] Incomplete marker is live against the current template.
- [ ] Zoom and growable/pannable canvas work.
- [ ] React Flow edges are invisible; adjacency shown by shared borders.
- [ ] `onHexClick` fires (edit-form wiring deferred to plan 04).
- [ ] Coverage ≥ 80 % for `src/features/map/**` (geometry ≈ 100 %); `verify`
      passes.
