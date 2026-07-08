# Hex Crawl Builder

A React app for building hex crawl content: define a per-hex checklist schema, then place, edit, and track completeness of hexes on a true hex-grid map. See `hex-flower` (this org) for the drag-and-drop tile handling this project draws interaction inspiration from.

## Product docs

Start here: [`prd/00-product-vision.md`](./prd/00-product-vision.md) — overarching vision, principles, and glossary.

Then the discrete, implementable features:

| Doc | Covers |
|---|---|
| [`prd/features/01-checklist-template-builder.md`](./prd/features/01-checklist-template-builder.md) | Form-builder for defining the per-hex field schema |
| [`prd/features/02-hex-data-model.md`](./prd/features/02-hex-data-model.md) | Core `Hex` entity, neighbor graph, completeness logic |
| [`prd/features/03-hex-map-grid-placement.md`](./prd/features/03-hex-map-grid-placement.md) | Hex-grid map: drag-to-place, move, delete, incomplete markers, rendering approach |
| [`prd/features/04-hex-edit-form.md`](./prd/features/04-hex-edit-form.md) | Per-hex fill-out form driven by the live template |
| [`prd/features/05-save-load-persistence.md`](./prd/features/05-save-load-persistence.md) | Single-file save/load format |

Each feature doc ends with an **Open Questions** section flagging assumptions made where behavior wasn't yet specified — check these before implementing that feature.
