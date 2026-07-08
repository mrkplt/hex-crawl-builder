# Feature: Hex Map Grid & Placement

## Purpose
The visual surface: a growable true hex-grid where hexes get placed, moved, deleted, and clicked into for editing.

## Palette
- A single generic "new hex" tile sits in a palette/tray, always available, unlimited (no library of variants — there's only one kind of hex).

## Grid behavior
- True hex-grid coordinate system (axial), not free-form pixel placement — drops snap to the nearest valid grid cell.
- No fixed bounds. The visible grid area grows to accommodate hexes placed further out (as opposed to a fixed NxN grid chosen upfront).
- Hex render size is user-adjustable (zoom), independent of the underlying grid data.

## Placement
- Dragging the generic "new hex" tile onto an empty grid cell is the creation event: it instantiates a new `Hex` (see Data Model doc) at that coordinate, using whatever the live template looks like at that moment (empty field values).
- Neighbor links are computed and attached at this point (see Data Model doc).

## Moving
- Any already-placed hex can be freely dragged to a new position at any time.
- On drop: update the hex's `coordinate`, and recompute neighbor links for the hex and for both its old and new adjacent hexes.

## Deleting
- Drag a placed hex to a trash/delete zone (same interaction pattern as the `hex-flower` repo).
- **Dropping on the trash zone opens a confirmation modal** rather than deleting immediately. This is the one destructive action in the whole app, so it must be explicitly confirmed. Cancel = the hex snaps back unchanged; Confirm = deletion proceeds.
- On confirm: the hex and all its field values are permanently removed, and it's unlinked from every neighbor (each neighbor's reciprocal slot is cleared, per the Data Model doc).

## Incomplete indicator
- A hex that's "incomplete" (per the Data Model doc's `isIncomplete` check) gets a visual marker directly on its tile in the map (e.g. colored border or icon) — no separate list/panel needed.

## Clicking a hex
- Clicking a placed hex opens the Hex Edit Form (see that doc) for that hex.

## Explicitly out of scope
- Terrain types, hex skins/icons, or any "painting" behavior.
- Fog of war, pathing/travel logic (candidates for the future feature the neighbor graph is a hook for).

## Open questions
- ~~What happens if you drop a hex onto an already-occupied cell?~~ **Decided: reject** — the drop is rejected and the hex snaps back to its origin unchanged. No swap, no stack. (Applies to both placing a new hex from the palette and moving an existing one.)
- ~~Should deleting a hex show a confirmation prompt?~~ **Decided: yes** — dropping on the trash zone opens a confirmation modal (see Deleting).

## Technical addendum: rendering as a graph, not a populated field

Because the Hex Data Model stores explicit neighbor links (a graph), rendering doesn't need to be "iterate a bounding grid and check each cell for occupancy." It's a node-link graph render. Two distinct facts drive the picture, and it's important not to conflate them:
- **Node position** is derived from each hex's axial `{q, r}` coordinate (geometry math) — *not* from the neighbor graph. The edges do not place the nodes.
- **Edges** are the direction-indexed neighbor links from the data model; they carry the graph structure the future adjacency feature walks, but they are not what positions anything on screen.

This splits into two separate concerns, best handled by two different libraries rather than one:

**1. Hex geometry (axial ↔ pixel math, hex polygon shape, neighbor calculation)**
`react-hexgrid` is a good fit — it provides React components for interactive hexagon grids using a cubic coordinate system (q, r, s), rendered via SVG. Use it (or hand-rolled redblobgames-style axial math) purely to convert a hex's `{q, r}` into a pixel position and to draw the hexagon shape itself.

**Orientation and direction-vector alignment (must-match constraint):** hexes are **pointy-top** (per the Data Model doc, slot 0 = the top-right/NE edge). The geometry layer must be configured for pointy-top, and the six axial direction vectors — the `{q, r}` deltas used to resolve edges — must be pinned to the neighbor array's clockwise-from-NE ordering (slot 0 = NE, 1 = E, 2 = SE, 3 = SW, 4 = W, 5 = NW). If the geometry library's default orientation or direction ordering disagrees with the data model's slot ordering, "the NE neighbor" in the model will not render up-and-to-the-right on screen — a silent, confusing bug for the future adjacency feature. Define this direction-vector table once and share it between placement/move (edge resolution) and rendering (positioning).

**2. Interaction/canvas layer (drag, pan, zoom, click, growable canvas)**
React Flow (`@xyflow/react`) is a strong fit for this layer — it's built for node-based UIs with drag/pan/zoom, custom node rendering, and click handling out of the box. The integration pattern:
- Feed each `Hex` in as a React Flow node, with `position` computed from its axial coordinate via the hex-geometry layer above.
- Feed each neighbor link in as a React Flow edge.
- Use a custom node type to render the hexagon shape (via the geometry layer) plus the incomplete-marker styling.
- Rely on React Flow's built-in drag/pan/zoom/click handling instead of building that from scratch.

**Caveat to design around, not assume away:** React Flow's edges default to rendering as visible flowchart-style connector lines. That's wrong for this app — adjacent hexes should just visually touch, not have a line drawn between them. This needs an explicit styling decision (e.g. fully transparent/invisible edges used only for the underlying graph structure and future traversal features, with adjacency communicated purely by the hexagons sharing a border). Don't assume this is "free" just because the library provides edges.

**Net effect on this doc's design:** the palette drag-to-create, move, and pan/zoom/growable-canvas behaviors described above are largely delegated to React Flow's node interaction model rather than custom-built; the hex-grid-specific math (snapping, hex shape, positioning, and the shared pointy-top NE-clockwise direction-vector table) still needs the geometry layer.
