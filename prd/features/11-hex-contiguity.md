# Feature: Hex Contiguity

## Purpose
Keep the map a connected region rather than a scatter of isolated hexes. A hex
crawl is a contiguous map — you walk from hex to adjacent hex — so placing a hex
floating in empty space, unreachable from the rest of the map, is almost always
a mistake. This feature **requires each placed hex to be adjacent to at least one
existing hex**, with the sole exception of the very first hex on an empty map.

This feature amends doc 03 (Hex Map Grid & Placement). It adds an acceptance
check to placement and move; it does not change occupancy rules (doc 03),
deletion, or the drag mechanics (doc 10).

## Core rule
A hex may occupy a target cell only if that cell is **adjacent to at least one
already-placed hex** — with one exception:

- **First-hex exception:** if there are **no placed hexes at all**, the drop is
  accepted anywhere (there's nothing to be adjacent to). This applies only to the
  genuinely empty map. As soon as one hex exists, the rule is in force for every
  subsequent placement.

"Adjacent" means the target cell is one of the six direction-neighbor cells of an
existing hex, computed with the shared direction-vector table — see below.

## Placement (new hex from palette)
- Compute the target cell (doc 03 snapping).
- **Accept** the drop iff either:
  - no hexes exist yet (first-hex exception), **or**
  - the target cell is adjacent to ≥1 already-placed hex.
- Otherwise **reject**: the hex is not created and the drag snaps back (nothing is
  placed), with rejection feedback (see Feedback).
- This check is in addition to, not instead of, the doc 03 occupancy check
  (occupied target ⇒ reject) and runs on the same accepted-drop path as doc 10's
  `onNodeDragStop` / drop handling.

## Moving an existing hex
Moving must not strand the moved hex.

- Compute the destination cell.
- **Accept** the move iff the destination is adjacent to ≥1 placed hex **that is
  not the hex being moved**.
  - The "not the hex being moved" qualifier matters: the moved hex must not count
    itself (or its own about-to-be-vacated origin) as the neighbor that satisfies
    adjacency. Evaluate adjacency against the *other* hexes, as they will sit
    after the move.
- Otherwise **reject**: snap back to origin unchanged, with rejection feedback.

### v1 scope limit — deliberately simple
- v1 enforces **local adjacency of the moved hex only**. It does **not** perform
  a global connectivity check.
- This means a move that keeps the moved hex adjacent to some other hex is
  accepted **even if** it would split the overall map into two disconnected
  regions (e.g. moving a hex that was the sole bridge between two clusters). That
  global-connectivity guarantee is explicitly **out of scope for v1** — keep it
  simple: just check the moved hex's own adjacency.
- Single-hex map edge case: if there is exactly **one** hex and the user drags it,
  there are no *other* hexes to be adjacent to. Treat this as the first-hex
  exception — the lone hex may be repositioned freely (moving the only hex can
  never disconnect anything). See edge cases.

## Adjacency computation
- Adjacency uses the **same direction-vector table** as the rest of the domain:
  `src/domain/directions.ts` — the single source of the six axial `{q,r}` deltas
  (slot order clockwise from NE: `0=NE, 1=E, 2=SE, 3=SW, 4=W, 5=NW`; doc 00,
  doc 03). Do **not** re-derive deltas at this call site — a mismatch would make
  "adjacent" mean something different here than in the neighbor graph and render
  geometry, which is exactly the silent bug the shared table exists to prevent.
- The check is a lookup: for the target cell, compute its six neighbor cells via
  the direction table and test whether any is occupied (using the coordinate
  index, `"q,r" → hexId`, the derived cache from doc 00). For a move, exclude the
  moved hex's own id from that occupancy test.
- Because the coordinate index is a **derived cache**, ensure it reflects the
  pre-move/pre-place state when testing (the moved hex hasn't landed yet), then
  update it on accept (doc 03 / doc 00).

## Feedback on rejection
- A rejected drop (placement or move) **snaps back** — nothing is created/moved
  — matching doc 03's existing snap-back for occupied cells.
- Provide **clear visual feedback** that the rejection was due to non-adjacency,
  so the user understands *why* the drop bounced (vs. silently snapping, which
  reads like a bug). A brief indicator is sufficient (e.g. a transient
  highlight/flash on the rejected target or the snapped-back hex). Exact styling
  is out of scope (visual design); the requirement is that the rejection is
  perceptible and distinguishable from a successful drop.
- Optional but encouraged: **pre-drop affordance** — during a drag, indicate which
  target cells are valid (adjacent to an existing hex) so the user can aim before
  releasing. Not required for v1; the required behavior is post-drop feedback.
  Flagged in open questions.

## Interaction with other docs
- **Occupancy (doc 03):** independent and both apply. A drop is accepted only if
  the cell is empty (doc 03) **and** adjacency is satisfied (this doc). Either
  failing ⇒ reject/snap-back.
- **Trash (doc 03 / doc 10):** trashing bypasses contiguity entirely — deleting a
  hex is always allowed (with confirmation). Contiguity governs where hexes can
  *land*, not whether they can be removed. Deleting a bridging hex may leave a
  disconnected map; that is accepted in v1 (same rationale as the move
  scope-limit above).
- **Drag mechanics (doc 10):** the adjacency check runs on the committed-drop
  path (`onNodeDragStop` / palette drop). Canvas-lock and trash-precedence (doc
  10) are prerequisites; a trash drop is resolved as a delete before contiguity
  is ever considered.
- **Autosave (doc 09):** only **accepted** placements/moves mutate state and
  therefore autosave. A rejected (snapped-back) drop changes nothing and triggers
  no save.

## Edge cases
- **Empty map, first placement:** accepted anywhere (first-hex exception).
- **Exactly one hex, dragged/moved:** accepted anywhere (no *other* hex to
  disconnect from; treated as first-hex exception).
- **Move to a cell adjacent only to the moving hex's own origin:** rejected —
  the moved hex must be adjacent to a *different* hex; its own vacated origin does
  not count.
- **Move to the same cell (no-op move):** treat as a no-op accept (the hex is
  already contiguous where it is) — do not reject a hex for "not being adjacent to
  itself." If doc 03's snapping resolves the destination to the origin cell, leave
  the hex in place.
- **Move that disconnects the map but keeps the moved hex locally adjacent:**
  accepted in v1 (global connectivity not enforced — see scope limit).
- **Placement adjacent to a hex that is diagonally offset but not a true hex
  neighbor:** not adjacent. Only the six direction-table neighbors count; "near"
  is not "adjacent."

## Explicitly out of scope
- **Global connectivity enforcement** (preventing a move/delete from splitting the
  map into disconnected regions). v1 checks only the moved/placed hex's own
  adjacency.
- Preventing deletion of a bridging hex.
- Auto-suggesting or auto-snapping to the nearest valid adjacent cell on a
  rejected drop.

## Open questions
- Should v1 include the **pre-drop valid-cell affordance** (highlight adjacent-
  empty cells during drag), or is post-drop snap-back-with-feedback enough?
  Current spec requires only post-drop feedback; pre-drop is a strong UX upgrade
  if cheap given doc 10's drag-in-progress state.
- Is the v1 "moved-hex-adjacency-only" rule acceptable long-term, or is global
  connectivity enforcement (no map splits on move *or* delete) a fast follow?
  Deliberately deferred here per the simple-v1 mandate.
