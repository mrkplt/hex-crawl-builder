# Feature: Drag UX Overhaul

## Purpose
Fix four drag-and-drop defects found in review of the current map (doc 03). Each
undermines the core placement/move/delete loop:

1. The "new hex" palette tile reads as a **button, not a draggable hex**.
2. The **canvas pans under the pointer during drags**, moving the target out from
   under the user.
3. The **drag preview** is the default browser drag image (palette) rather than a
   hex following the pointer.
4. **Drag-to-trash never fires** — the ReactFlow canvas pan intercepts node drags
   before the trash `<div>` can receive the drop, and `onNodeDragStop`'s
   trash hit-test is starved.

This feature amends doc 03 (Hex Map Grid & Placement). It changes interaction
feel and reliability only; it does not change what placement/move/delete *mean*
(that's doc 03), and it does not add contiguity rules (that's doc 11).

## Background: the two drag mechanisms in play
The map has **two distinct drag sources** and this doc must treat them
separately, because they use different browser mechanisms:

- **Palette "new hex" drag** — creating a brand-new hex. Currently HTML5
  drag-and-drop (`<div draggable>`). The dragged thing does not yet exist as a
  hex/node.
- **Placed-hex drag** — moving or trashing an existing hex. This is a ReactFlow
  node drag; the hex already exists as a node, and `onNodeDragStop` fires on
  release.

The root cause of defects 2 and 4 is that ReactFlow's canvas **pan** competes
with node dragging, so node drags don't cleanly reach `onNodeDragStop` and the
trash `<div>` never gets the drop. The unifying fix is **locking the canvas
during any drag** (requirement 2 below), which unblocks the trash path
(requirement 4).

---

## Requirement 1 — New-hex palette affordance
The palette tile must **look and behave like a draggable hex**, not a button.

- Render the palette tile as a **hex shape** matching the placed hexes' visual
  style (same polygon/orientation — pointy-top). It should read as "a hex you can
  pick up," visually consistent with what will land on the canvas.
- It carries a **drag cursor** (grab/grabbing affordance) so it signals
  draggability on hover and during drag.
- It is **labeled clearly** (so the user knows it creates a new hex) but the
  label must not make it look like a clickable button. No button chrome.
- It remains **always available and unlimited** (doc 03) — dragging it does not
  consume it; the palette tile stays in place ready for the next placement.

Note: exact colors/spacing/typography are out of scope (visual design). The
requirement is *affordance and shape parity with placed hexes*, not a specific
skin.

## Requirement 2 — Canvas lock during drag
While **any** drag is in progress, ReactFlow **panning is disabled**.

- "Any drag" includes: a new-hex drag from the palette, and a placed-hex drag
  (whether the user intends to move it or trash it).
- Panning must be **re-enabled on drag end** — on drop/commit, on cancel, and on
  any early abort. The canvas must never get stuck non-pannable after a drag.
- Zoom behavior during drag is not required to change, but the canvas **origin
  must not shift under the pointer** mid-drag — that shift is the defect being
  fixed. If zoom can also cause an origin shift mid-drag, lock it too.
- This is the linchpin fix: with pan disabled, ReactFlow node drags reach
  `onNodeDragStop` reliably (fixing requirement 4's trash path), and the moved
  hex tracks the pointer (requirement 3, placed-hex case).

State to track: a single "drag in progress" flag driving pan enable/disable.
It must be set at drag start for **both** drag sources and cleared at drag end
for both, including error/cancel paths.

## Requirement 3 — Drag preview under the pointer
The thing being dragged must visibly follow the pointer as a hex.

- **Palette new-hex drag:** the drag ghost/preview is a **hex shape that follows
  the pointer**, not the default browser drag image (which is currently a
  snapshot of the `<div>`). The preview should read as the same hex that will be
  placed on drop.
- **Placed-hex drag:** the hex itself should visually follow the pointer.
  ReactFlow's built-in node drag already does this; the requirement is to
  **confirm it works correctly once panning is disabled** (requirement 2). With
  pan competing, the node's apparent motion was wrong; with pan locked it should
  track cleanly. No separate custom preview is needed for placed hexes if the
  built-in behavior is correct post-lock.

## Requirement 4 — Reliable drag-to-trash
The trash zone must reliably receive drags of **placed** hexes and delete them
(via the doc 03 confirmation modal).

- **Placed-hex → trash** is the case that must work. The delete decision is made
  in **`onNodeDragStop`** (already in the code): on drag end, hit-test the
  pointer/node against the trash zone; if it's over the trash zone, treat it as a
  trash drop (⇒ doc 03 confirmation modal). The fix that makes this fire reliably
  is the canvas lock (requirement 2), which stops pan from stealing the drag so
  `onNodeDragStop` runs with correct coordinates.
- **Trash zone prominence during drag:** while a drag is in progress, the trash
  zone must become **prominent** (e.g. highlighted or expanded) so it's an
  obvious, easy-to-hit target, then return to its resting appearance on drag end.
  (Highlight/expand is the required behavior; exact styling is out of scope.)
- **Palette new-hex → trash is irrelevant.** You cannot trash a hex that isn't
  placed yet. The trash zone plays no role in a palette drag: dropping a new-hex
  drag on the trash zone is a **no-op** (no hex is created, nothing is deleted) —
  equivalent to dropping it off-grid. The trash zone may still show its prominent
  state during a palette drag (a single "drag in progress" flag drives it), but
  it has no trash effect for that source. State this explicitly so the engineer
  doesn't wire the palette drag to the trash hit-test.

### Trash hit-test outcomes (placed-hex drag)
| Drop location | Outcome |
|---|---|
| Over trash zone | Trash drop ⇒ doc 03 delete-confirmation modal (Cancel snaps back; Confirm deletes) |
| Over a valid grid cell | Move (subject to doc 03 occupancy + doc 11 contiguity) |
| Elsewhere / off-grid | Snap back to origin, no change |

## Interaction with other docs
- **Occupancy (doc 03):** dropping onto an occupied cell is still rejected (snap
  back). This doc doesn't change that.
- **Contiguity (doc 11):** a move/placement that lands on a valid, empty,
  non-trash cell is still subject to the adjacency check. Trash drops bypass
  contiguity (deleting is always allowed, with confirmation).
- **Autosave (doc 09):** persistence fires on the **committed** transition
  (accepted drop / confirmed delete) in `onNodeDragStop`, not on intermediate
  drag frames.

## Edge cases
- **Drag released outside the window / drag canceled (Esc):** clear the
  drag-in-progress flag, re-enable pan (requirement 2), snap any placed hex back
  to origin, and return the trash zone to rest. No accidental deletes or
  placements.
- **A drag that both overlaps trash and a grid cell** at release: the trash
  hit-test takes precedence (if over trash ⇒ trash), per the table above.
- **Fast drags:** the canvas-lock flag must be set synchronously at drag start so
  a fast initial motion can't pan before the lock applies.
- **Palette drag dropped on empty grid cell:** normal creation (doc 03), subject
  to doc 11 contiguity. Unchanged.

## Explicitly out of scope
- Contiguity/adjacency rules (doc 11).
- Occupancy resolution / swap behavior (doc 03 already decided: reject).
- Visual design specifics (exact colors, sizes, spacing) of the hex, palette
  tile, trash highlight, or drag ghost.
- Multi-select drag / dragging more than one hex at once.

## Open questions
- For the palette drag ghost: is a hex-shaped preview following the pointer
  acceptable via the existing HTML5 drag mechanism, or should the palette drag be
  reimplemented on the same pointer/drag model as placed hexes for consistency?
  Either is acceptable if the observable behavior (hex preview under pointer, no
  canvas pan) is met; unifying the two drag mechanisms may reduce edge cases.
- Should the trash hit-test key off the **pointer** position or the **node
  center/bounds** at `onNodeDragStop`? Pointer is usually what the user aims;
  pick one and be consistent, and account for it in the prominence sizing so the
  visible target matches the hit area.
