# Feature: Hex Data Model

Foundational, non-UI feature. Everything else depends on this shape being right.

## Entity
```
Hex {
  id: string
  coordinate: { q: number, r: number }   // axial coordinates, snapped to true hex grid
  neighbors: string[]                     // explicit list of adjacent hex ids (see below)
  fieldValues: { [fieldId: string]: string }  // keyed by Field.id, NOT by current label/order
  createdAt: number                        // for stable default ordering/debugging
}
```

## Why field values are keyed by field id, not by "the template"
A hex's `fieldValues` is an open bag keyed by whatever field ids have ever been written to it. When a field is deleted from the template, its data simply stays in `fieldValues` under that id, inert and unreferenced by the current template — never deleted, never migrated. This is what lets the template be edited freely without data loss (per product vision).

## Neighbor links: explicit, not purely derived
Even though hexes sit on an axial coordinate grid (from which adjacency *could* be computed on the fly), each hex stores its neighbor ids explicitly and they're maintained as a graph.

**Trade-off, made deliberately:**
- Cost: every placement, move, or deletion must update the neighbor lists of the hex itself *and* whatever hexes are/were adjacent to it.
- Benefit: map rendering and any future feature that needs to "walk" the map (the unspecified future feature this is a hook for) can traverse the neighbor graph directly instead of recomputing coordinate math every time.

### Maintenance rules
- **On placement:** compute the up-to-6 axial-adjacent occupied cells, link both directions.
- **On move:** remove links to old neighbors, compute and add links to new neighbors at the destination coordinate.
- **On delete:** remove the hex from every neighbor's `neighbors` list, then discard the hex.

## Completeness (derived, not stored)
```
isIncomplete(hex, template) =
  template.fields.some(f => f.required && isEmpty(hex.fieldValues[f.id]))
```
This is computed live against the **current** template every time it's needed (map render, etc.) — it is not frozen at hex-creation time. This follows from the template being editable at any time; a hex can flip from complete to incomplete purely because you added a new required field.

*(Flagging this as an assumption — confirm this is the intended behavior, since the alternative — completeness locked to the template version at creation time — is also defensible.)*

## Future-proofing hooks (not built now)
- `templateId` — not needed today (only one template exists), but reserve room to add it to `Hex` so a future multi-template campaign doesn't require a data migration.
- `campaignId` — same reasoning for future multi-campaign support.
