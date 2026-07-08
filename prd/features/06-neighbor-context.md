# Feature: Neighbor Context (Hex Focus View)

## Purpose
When you open a hex to edit it, surface the content of its six surrounding hexes
— positioned by direction — so you can develop the current hex **thematically in
continuity with its neighbors** (terrain that flows, roads that connect, a rumor
in one hex that pays off in the next). This is the "future adjacency feature"
that the direction-indexed neighbor graph (see
[`02-hex-data-model.md`](./02-hex-data-model.md)) was explicitly designed to
enable.

## Where it lives
This evolves the [Hex Edit Form](./04-hex-edit-form.md) from a centered modal
into a **focus view**: the editable hex sits in the center, flanked by its six
neighbors. It opens the same way it does today — by clicking a placed hex on the
map.

## Layout (positional, direction-true)
Pointy-top hexes have six edges — **NE, E, SE, SW, W, NW — and no north or south
neighbor**. The focus view is a three-column layout that keeps direction honest:

```
   NW │             │ NE
    W │  CURRENT    │ E
   SW │  HEX (edit) │ SE
      left            right
```

- **Right column, top → bottom: NE, E, SE.**
- **Left column, top → bottom: NW, W, SW.**
- **Center: the current hex, editable** (the existing edit form).

Position encodes direction — the top-right panel *is* the NE neighbor — so on
large screens the direction is implied by placement (a subtle direction label
may accompany it). There is deliberately no panel directly above or below the
center, because pointy-top hexes have no such neighbor.

## Neighbor panels (read-only context)
Each of the six panels shows a neighbor hex's content, **read-only**:

- **Collapsed by default** to a fixed height — roughly a **4-line truncated
  preview** of the neighbor's fields.
- **Clicking the panel expands it** to full content; a collapse control returns
  it to the preview.
- **Collapsed** shows the truncated **live-template** fields only. **Expanded**
  shows all live-template fields **and** the hex's orphaned / legacy values
  (read-only, via the data model's `orphanedEntries`), so preserved-but-inactive
  data is reachable in context without cluttering the glanceable preview.
- An expanded panel carries an **Edit** button (see Navigation).
- A neighbor that is **incomplete** (per the data model's `isIncomplete`) shows
  the same incomplete marker used on the map.

Neighbor content is always visible (never hidden behind a click-to-reveal); the
click is reserved for expand/collapse, and navigation is a separate explicit
action.

## Empty edges
A direction with **no placed hex** shows a **`+` (create)** affordance.
Activating it creates a new hex at that adjacent coordinate — auto-linked into
the neighbor graph per the [data model](./02-hex-data-model.md) placement rules —
using the live template. The new (empty) hex fills that slot as a collapsed
panel. **Focus stays on the current hex** (no auto-navigate); the author moves
into the new hex explicitly if they want to write it.

## Navigation (walk the map while writing)
Because content is always visible, the panel click is free to expand/collapse
and **navigation is an explicit `Edit` action** on an expanded panel. Activating
it re-centers the focus view on that neighbor; its own six neighbors recompute.

- **Unsaved-edits guard:** center-hex edits are buffered (per doc 04). Navigating
  away from a hex with unsaved buffered edits **prompts to confirm discarding**
  them (Cancel keeps you where you are; Confirm discards and navigates). This is
  the same discard prompt doc 04 already uses on close.
- Navigation never saves. Saving stays the explicit **Save** in the center
  editor.

## Scope
- **Immediate (ring-1) neighbors only** — no second ring for v1.
- Only the center hex is editable; the six panels are read-only context.

## Responsive
Below a width breakpoint the flanks can't hold their columns, so they collapse
into a single **direction-labeled list** ("NE — …", "E — …") beneath the center
editor, preserving direction as an explicit label rather than a position.

## No data-model or save-format change
This is purely a new **view over the existing in-memory graph**. Neighbors come
straight from the direction-indexed neighbor array (O(1)); completeness and
orphans are derived live. There is **no new persisted field, no save-version
bump, and no migration** — existing save files keep working unchanged.

## Open questions
- ~~Show orphaned values in neighbor panels?~~ **Decided: yes, but only when the
  panel is expanded.** The collapsed preview shows live content only.
- ~~Auto-navigate into a hex created from a `+` slot?~~ **Decided: no.** Creating
  just fills the slot; the author navigates in explicitly.
- ~~Explicit direction labels or implied by position?~~ **Decided:** implied by
  position on large screens; explicit direction labels in the small-screen list.
- ~~A designated "title/summary" field to represent a neighbor at a glance?~~
  **Decided: not needed.** Direction/position is the neighbor's identity;
  panels show the full field content (truncated when collapsed).
