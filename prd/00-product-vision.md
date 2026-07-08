# Hex Crawl Content Builder — Product Vision & Guidelines

## Problem
GMs running hex crawls need a way to attach structured content to each hex on a map — not just draw terrain. Existing tools (including the author's own `hex-flower` project) solve visual tile placement but not "what needs to be true about this hex before it's ready to use at the table."

## What this is
A React app with two intertwined jobs:
1. **Define a schema** (checklist template) describing what content every hex should have.
2. **Place and fill in hexes** on a true hex-grid map, using that schema to drive a per-hex edit form and to flag which hexes are incomplete.

## What this explicitly is NOT
- Not a drawing/painting tool. No freehand terrain, no flood fill.
- Not a hex-flower random-table tool (though visually/mechanically inspired by the author's `hex-flower` repo's drag-and-drop tile handling).
- Not (yet) multi-campaign or multi-template. Single campaign, single template, single save file — but the data model is built so those can be added later without a rewrite.

## Core product principles
- **The template is a schema/validation layer, not an enforcement layer.** Every field is technically optional to persist. "Required" only ever means "flag this hex as incomplete if empty" — it never blocks saving or entry.
- **Hex data is never destructively cleaned up by template edits.** Editing or removing a field from the template only changes what's *shown/validated* going forward. A hex's previously entered values for a removed field stay attached to that hex.
- **Deleting a hex is the only destructive action**, and it's explicit (drag to trash).
- **Single save file.** The whole campaign — template, hexes, map state — round-trips through one JSON file, load/save like the `hex-flower` repo (no backend).
- **Hexes know their neighbors explicitly** (not just derived from coordinates). This is a deliberate complexity/simplicity trade: more bookkeeping when hexes are placed, moved, or deleted, in exchange for simpler traversal logic for map rendering and for an unspecified future feature that will build on hex adjacency.
- **Architected, not built, for the future:** multiple campaigns, multiple templates per campaign, and additional field types beyond text. Don't build the UI for these now; don't design the data model in a way that blocks them later.

## Feature list (see individual docs)
1. Checklist Template Builder
2. Hex Data Model (foundational, not user-facing)
3. Hex Map Grid & Placement
4. Hex Edit Form
5. Save / Load (Persistence)

## Glossary
- **Template** — the set of field definitions (schema) for the current campaign.
- **Field** — one entry in the template: id, label, type, required flag, order.
- **Hex** — a placed instance on the map: coordinate, neighbor links, and a bag of field values keyed by field id.
- **Incomplete** — a hex where at least one field currently marked *required* in the live template has no stored value.

## Open questions to confirm before/while building
Each feature doc below flags assumptions made where you hadn't specified behavior yet — check the "Open Questions" section in each.
