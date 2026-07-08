# Feature: Hex Data Model

Foundational, non-UI feature. Everything else depends on this shape being right.

## Entity
```
Hex {
  id: string
  coordinate: { q: number, r: number }   // axial coordinates, snapped to true hex grid
  neighbors: [                            // fixed-length 6, indexed by EDGE direction (see below).
    string | null,   //  slot 0 = NE (top-right edge)     null = no hex on that edge
    string | null,   //  slot 1 = E  (next clockwise)
    string | null,   //  slot 2 = SE
    string | null,   //  slot 3 = SW
    string | null,   //  slot 4 = W
    string | null,   //  slot 5 = NW
  ]
  fieldValues: { [fieldId: string]: string }  // keyed by Field.id, NOT by current label/order
  createdAt: number                        // for stable default ordering/debugging
}
```

## Why field values are keyed by field id, not by "the template"
A hex's `fieldValues` is an open bag keyed by whatever field ids have ever been written to it. When a field is deleted from the template, its data simply stays in `fieldValues` under that id, inert and unreferenced by the current template — never deleted, never migrated. This is what lets the template be edited freely without data loss (per product vision).

## Neighbor links: explicit, direction-indexed, the source of truth
Each hex stores its adjacency as a **fixed-length array of 6 edge slots**, not an unordered bag of ids. The slot index *is* the direction — slot 0 is the top-right edge, and slots increase clockwise (NE, E, SE, SW, W, NW). A slot holds the neighbor's hex id, or `null` if that edge is open. This makes the graph the source of truth and the map field a downstream projection of it.

**Why positional, not a set:** the future feature reads adjacency *by direction* ("show the author what lies to the north-east / east of the hex they're editing"). A direction-indexed array answers that in O(1) with no coordinate math — `hex.neighbors[0]` is the top-right neighbor. An unordered `string[]` would force re-deriving each id's direction on every read.

**Orientation is fixed by this choice.** Slot 0 being a top-right *edge* means hexes are **pointy-top** (a pointy-top hex has top/bottom *vertices* and six edges facing NE, E, SE, SW, W, NW; a flat-top hex has a top edge instead, no top-right edge). This aligns with `react-hexgrid`'s default pointy-top orientation. The six axial direction vectors used to resolve edges must be defined to match this clockwise-from-NE ordering, and that mapping must be identical everywhere (placement, move, render, the future feature).

**Reciprocity rule:** an edge and its opposite are always `(slot + 3) mod 6` — NE↔SW, E↔W, SE↔NW. If hex A's slot `i` points to B, then B's slot `(i+3) mod 6` must point back to A. Every link operation updates both ends.

### Maintenance rules
- **On placement:** a brand-new hex has no edges yet, so its six neighbors are resolved *by position* — for each of the 6 edge directions, look up whether a hex occupies the adjacent axial coordinate (via the coordinate index below). For each occupant found, set this hex's slot and the occupant's reciprocal slot. This position lookup is the one operation that seeds a node into the graph; every operation after can traverse edges.
- **On move:** clear this hex's six slots and clear the reciprocal slot on each former neighbor; then re-resolve the six edges at the destination coordinate exactly as in placement, setting both ends.
- **On delete:** for each non-null slot, clear the reciprocal slot on that neighbor, then discard the hex.

### Coordinate index (derived acceleration structure)
Seeding a new node's edges requires answering "which hex, if any, sits at axial `(q,r)`?" — a question edge-traversal can't answer for a not-yet-connected node. Maintain a `{"q,r" → hexId}` index alongside the graph, rebuilt on load, updated on every place/move/delete. It is a cache derived from the hexes, never an independent source of truth; the direction-indexed graph remains authoritative for adjacency.

## Completeness (derived, not stored)
```
isIncomplete(hex, template) =
  template.fields.some(f => f.required && isEmpty(hex.fieldValues[f.id]))
```
This is computed live against the **current** template every time it's needed (map render, etc.) — it is not frozen at hex-creation time. This follows from the template being editable at any time; a hex can flip from complete to incomplete purely because you added a new required field.

**Decided:** completeness is a live UI state derived from the current form-builder schema — never persisted, never versioned to a template snapshot. It is always recomputed from the live template, so editing the schema updates every hex's incomplete marker immediately. The alternative (freezing completeness to the template version at creation time) is explicitly rejected.

## Future-proofing hooks (not built now)
- `templateId` — not needed today (only one template exists), but reserve room to add it to `Hex` so a future multi-template campaign doesn't require a data migration.
- `campaignId` — same reasoning for future multi-campaign support.
