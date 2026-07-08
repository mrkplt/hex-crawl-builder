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
- This is the one destructive action in the whole app: the hex and all its field values are permanently removed, and it's unlinked from any neighbors' lists.

## Incomplete indicator
- A hex that's "incomplete" (per the Data Model doc's `isIncomplete` check) gets a visual marker directly on its tile in the map (e.g. colored border or icon) — no separate list/panel needed.

## Clicking a hex
- Clicking a placed hex opens the Hex Edit Form (see that doc) for that hex.

## Explicitly out of scope
- Terrain types, hex skins/icons, or any "painting" behavior.
- Fog of war, pathing/travel logic (candidates for the future feature the neighbor graph is a hook for).

## Open questions
- What happens if you drop a hex onto an already-occupied cell? Recommend: reject the drop (snap back), rather than swap or stack. Confirm.
- Should deleting a hex show a confirmation prompt, given it's the one irreversible action in the app? Recommend yes, but flagging since it wasn't specified.

## Technical addendum: rendering as a graph, not a populated field

Because the Hex Data Model stores explicit neighbor links (a graph), rendering doesn't need to be "iterate a bounding grid and check each cell for occupancy." It can instead be a node-link graph render, where node position happens to be derived from axial coordinates and edges happen to be the neighbor links. This splits into two separate concerns, best handled by two different libraries rather than one:

**1. Hex geometry (axial ↔ pixel math, hex polygon shape, neighbor calculation)**
`react-hexgrid` is a good fit — it provides React components for interactive hexagon grids using a cubic coordinate system (q, r, s), rendered via SVG. Use it (or hand-rolled redblobgames-style axial math) purely to convert a hex's `{q, r}` into a pixel position and to draw the hexagon shape itself.

**2. Interaction/canvas layer (drag, pan, zoom, click, growable canvas)**
React Flow (`@xyflow/react`) is a strong fit for this layer — it's built for node-based UIs with drag/pan/zoom, custom node rendering, and click handling out of the box. The integration pattern:
- Feed each `Hex` in as a React Flow node, with `position` computed from its axial coordinate via the hex-geometry layer above.
- Feed each neighbor link in as a React Flow edge.
- Use a custom node type to render the hexagon shape (via the geometry layer) plus the incomplete-marker styling.
- Rely on React Flow's built-in drag/pan/zoom/click handling instead of building that from scratch.

**Caveat to design around, not assume away:** React Flow's edges default to rendering as visible flowchart-style connector lines. That's wrong for this app — adjacent hexes should just visually touch, not have a line drawn between them. This needs an explicit styling decision (e.g. fully transparent/invisible edges used only for the underlying graph structure and future traversal features, with adjacency communicated purely by the hexagons sharing a border). Don't assume this is "free" just because the library provides edges.

**Net effect on this doc's design:** the palette drag-to-create, move, and pan/zoom/growable-canvas behaviors described above are largely delegated to React Flow's node interaction model rather than custom-built; the hex-grid-specific math (snapping, hex shape, adjacency computation) still needs the geometry layer.
