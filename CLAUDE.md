# CLAUDE.md — Hex Crawl Builder

Engineering conventions and working notes for this repo. Read this before
implementing any plan.

## What this is

A client-only React app for building hex-crawl content: define a per-hex
checklist schema (template), then place, edit, and track completeness of hexes
on a true pointy-top hex-grid map. No backend — the whole campaign round-trips
through a single JSON file.

- **Product vision:** [`prd/00-product-vision.md`](./prd/00-product-vision.md)
- **Feature PRDs:** [`prd/features/`](./prd/features/)
- **Implementation plans (build in order):** [`plans/`](./plans/) — start with
  [`plans/README.md`](./plans/README.md).

## Tech stack

- **React + Vite + TypeScript** (Vite `react-ts`).
- **State:** Zustand, wrapping **pure, framework-free domain functions** in
  `src/domain/`. Keep all real logic in the pure layer; the store just calls it.
- **Map rendering:** React Flow (`@xyflow/react`) for the interaction/canvas
  layer (drag/pan/zoom/click) + **hand-rolled pointy-top axial math** for hex
  geometry/positioning. See plan 03 for why we hand-roll the math instead of
  using `react-hexgrid`.
- **Drag-and-drop (template reorder):** `dnd-kit`.
- **Testing:** Vitest + `@testing-library/react` + `user-event` + jsdom, V8
  coverage.
- **Lint/format:** ESLint (flat, type-checked rules) + Prettier.

## Commands

This project uses **Yarn Classic (1.x)**. Install deps with `yarn install`.

| Command | Does |
|---|---|
| `yarn dev` | Start the Vite dev server |
| `yarn build` | Type-check + production build |
| `yarn typecheck` | `tsc --noEmit` |
| `yarn lint` | ESLint over the repo |
| `yarn format` | Prettier write |
| `yarn test` | Vitest (watch) |
| `yarn test:coverage` | Vitest run with coverage (fails under threshold) |
| `yarn verify` | `typecheck && lint && test:coverage` — run before committing |

## Non-negotiable engineering rules

These come from the project mandate. CI and git hooks enforce them; don't rely
on memory.

1. **TypeScript, strict, explicitly typed.** `strict: true` plus
   `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
   `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUnusedLocals`,
   `noUnusedParameters`. **`any` is a lint error** (`@typescript-eslint/no-explicit-any`).
   Type module boundaries and exported functions explicitly.
2. **≥ 80 % test coverage**, enforced by Vitest coverage thresholds (lines,
   functions, branches, statements). Pure domain logic (`src/domain/`) should be
   ~100 %. Write tests alongside the code.
3. **Typecheck + lint pass before every commit** (pre-commit hook).
   **Full test suite + coverage pass before every push** (pre-push hook). CI
   re-runs all three on PRs. Do not bypass hooks (`--no-verify`) to land code.
4. **Small, scoped commits** mapped to plan tasks, with descriptive messages.

## Testing policy

- **Pure logic first.** Domain code (types, direction table, neighbor graph,
  coordinate index, completeness, registry, serialize/parse) is framework-free
  and tested exhaustively without a DOM. This is where coverage is cheapest and
  bugs are costliest.
- **Separate logic from rendering** in UI features: put drop/snap/reorder/save
  decisions in pure functions unit-tested directly; use Testing Library for the
  component wiring (render, user-event, assert store effects).
- **Test the invariants, not just the happy path.** The neighbor graph must stay
  fully reciprocal (`A.neighbors[i] = B ⟺ B.neighbors[(i+3)%6] = A`) and the
  coordinate index must match the hex set after *any* place/move/delete sequence
  — cover this with a property/sequence test (plan 01).
- Prefer `user-event` over `fireEvent`; query by role/label (accessible queries).
- Shared factories/fixtures live in `src/test/`.

## Architecture invariants (get these right)

- **Pointy-top, direction-indexed neighbors.** Hexes are pointy-top. Each hex
  stores a fixed **6-slot** neighbor array, slot index = edge direction,
  **clockwise from NE**: `0=NE, 1=E, 2=SE, 3=SW, 4=W, 5=NW`. Reciprocity is
  `(slot + 3) mod 6`. Every link operation updates both ends.
- **One direction-vector table.** The axial `{q,r}` deltas for those six
  directions are defined **once** (`src/domain/directions.ts`) and shared by the
  graph ops (plan 01) *and* the render geometry (plan 03). Never re-derive them
  per call site — a mismatch is a silent bug where the model's "NE neighbor"
  renders in the wrong place.
- **The graph is the source of truth; the coordinate index is a derived cache.**
  The index (`"q,r" → hexId`) accelerates "who sits at this cell?" for seeding a
  new node's edges. Rebuild it on load; update it on every place/move/delete;
  never treat it as authoritative for adjacency.
- **Template edits are non-destructive to hex data.** Deleting/renaming a field
  never deletes a hex's stored value. `fieldValues` is an open bag keyed by
  `Field.id`; orphaned values persist (surfaced read-only in the edit form).
- **Completeness is derived live**, never stored or frozen to a template
  snapshot. `isIncomplete(hex, liveTemplate)` is recomputed on demand.
- **Field types are a registry, not a switch.** Adding a type (`checkbox`,
  `number`, …) must be a new registry entry, not edits across consumers.
- **The only destructive action is deleting a hex**, and it requires explicit
  confirmation.

## Directory layout

```
src/
  domain/        # pure, framework-free logic + types (plan 01)
  state/         # Zustand store wiring (plan 01)
  features/
    template/    # Template editor (plan 02)
    map/         # Hex map, placement, geometry (plan 03)
    hex-edit/    # Hex edit form (plan 04)
    persistence/ # Save/load (plan 05)
  components/    # shared presentational components
  app/           # app shell / screen layout
  test/          # shared test utilities, factories, fixtures
prd/             # product requirements (source of truth for behavior)
plans/           # implementation plans (build order)
```
