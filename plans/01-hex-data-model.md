# Plan 01 — Hex Data Model & Domain Core

**Implements:** [`prd/features/02-hex-data-model.md`](../prd/features/02-hex-data-model.md)
(and the `Field` shape from [`prd/features/01`](../prd/features/01-checklist-template-builder.md)).
**Depends on:** plan 00.
**Goal:** the framework-free heart of the app — domain types, the pointy-top
direction-vector table, the explicit direction-indexed neighbor graph, the
coordinate index, completeness logic, the field-type registry, and the Zustand
store that wraps it. Everything else is a view over this.

> This is the highest-leverage, highest-risk plan. It is pure logic with no
> DOM, so it should be tested to **~100 %** and gate the rest of the project.
> Get the neighbor-reciprocity and direction-vector invariants right here and
> the map (plan 03) becomes straightforward.

---

## Deliverables (`src/domain/`, `src/state/`)

All domain code is framework-free (no React import) so it is unit-testable in
isolation.

### 1. Core types (`src/domain/types.ts`)

```ts
type FieldType = 'short_text' | 'long_text';           // extensible via registry

interface Field {
  id: string;         // stable, generated once (crypto.randomUUID), never reused
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
}

interface Template { fields: Field[]; }

interface AxialCoord { q: number; r: number; }

type NeighborSlots = [
  string | null, string | null, string | null,   // NE, E, SE
  string | null, string | null, string | null,   // SW, W, NW
];

interface Hex {
  id: string;
  coordinate: AxialCoord;
  neighbors: NeighborSlots;                 // fixed length 6, index = edge direction
  fieldValues: Record<string, string>;      // keyed by Field.id, an open bag
  createdAt: number;
  // Reserved future-proofing hooks — declared optional now, never populated in v1:
  templateId?: string;
  campaignId?: string;
}
```

Model `NeighborSlots` as a fixed-length tuple so `noUncheckedIndexedAccess` and
the type system enforce "exactly 6 slots."

### 2. Direction-vector table (`src/domain/directions.ts`) — the load-bearing constant

The single source of truth the PRD demands ("Define this direction-vector table
once and share it"). **Pointy-top, clockwise from NE.**

```ts
enum Direction { NE = 0, E = 1, SE = 2, SW = 3, W = 4, NW = 5 }

// Axial (q, r) deltas for pointy-top, ordered to match the slot indices above.
const DIRECTION_VECTORS: readonly AxialCoord[] = [ /* NE, E, SE, SW, W, NW */ ];

const opposite = (dir: number): number => (dir + 3) % 6;   // reciprocity
```

> **Pin the vectors carefully and test them against a hand-worked example.**
> A wrong sign here is the exact "silent, confusing bug" the PRD warns about:
> the model's "NE neighbor" would render in the wrong place. The chosen vectors
> must agree with the geometry layer's pointy-top axial→pixel math in plan 03 —
> they will be shared, not re-derived.

### 3. Axial helpers & coordinate index (`src/domain/coordinates.ts`)

- `coordKey(c: AxialCoord): string` → `"q,r"`.
- `neighborCoord(c, dir): AxialCoord` → `c + DIRECTION_VECTORS[dir]`.
- `CoordinateIndex` — a `Map<string, string>` (`"q,r" → hexId`) with
  `set/get/delete/rebuild(hexes)`. **A derived cache, never a source of truth**
  (PRD): the neighbor graph stays authoritative; the index only answers "who
  sits at (q,r)?" when seeding a not-yet-connected node.

### 4. Neighbor-graph operations (`src/domain/graph.ts`) — pure functions

Operate on plain `{ hexes: Record<string, Hex>; index: CoordinateIndex }` state
and return the next state (or mutate a draft — pick one and be consistent). Each
enforces the **reciprocity rule** `(slot ± 3) mod 6` — every link touches both
ends.

- `placeHex(state, coordinate, template) → { state, hex }`
  New hex with empty `fieldValues`, `createdAt` set. Resolve all 6 edges **by
  position** via the coordinate index (the one seeding operation), setting this
  hex's slot and each occupant's reciprocal slot. Update the index.
- `moveHex(state, hexId, destination) → state`
  Clear this hex's 6 slots and each former neighbor's reciprocal slot; update
  `coordinate`; re-resolve the 6 edges at the destination exactly as placement.
  Update the index (remove old key, add new).
- `deleteHex(state, hexId) → state`
  For each non-null slot, clear the neighbor's reciprocal slot; drop the hex and
  all its field values; remove its index entry.
- `isOccupied(state, coordinate) → boolean` (used by plan 03 to reject drops
  onto occupied cells).

> **Do not** implement occupied-cell *rejection policy* here (that's a plan-03
> interaction decision) — expose `isOccupied` and let the map layer decide. Keep
> `placeHex`/`moveHex` assuming a validated, empty destination.

### 5. Field-type registry (`src/domain/fieldTypes.ts`)

A lookup, **not a switch** (PRD): `Record<FieldType, FieldTypeDef>` where

```ts
interface FieldTypeDef {
  id: FieldType;
  label: string;                       // human name for the type picker
  defaultValue: string;
  isEmpty: (value: string) => boolean; // drives completeness
}
```

Register `short_text` and `long_text` now. The **render component** for each
type is registered later (plans 02/04) — keep the registry shape open for a
`render` slot so adding a type is additive. Adding a future type
(`checkbox`, `number`, …) must be a new registry entry, never a code edit to
consumers.

### 6. Completeness (`src/domain/completeness.ts`)

```ts
isFieldEmpty(value: string | undefined, type: FieldType): boolean
isIncomplete(hex: Hex, template: Template): boolean   // live, never stored
```

`isIncomplete` = "some field currently `required` in the **live** template has
an empty stored value." Never persisted, never frozen to a template snapshot
(PRD explicitly rejects that). Recomputed on demand so a schema edit flips
markers immediately.

### 7. Orphaned-value helper (`src/domain/orphans.ts`)

`orphanedEntries(hex, template): Array<{ id: string; value: string }>` — the
`fieldValues` whose id is not in the current template. Consumed read-only by the
edit form (plan 04) and by save/load. Lives here because it's pure logic.

### 8. Zustand store (`src/state/store.ts`)

Wraps the pure operations and holds `{ template, hexes, index }`. Actions:
`addField / editField / deleteField / reorderFields`, `placeHex / moveHex /
deleteHex / setHexFieldValues`, `replaceAll(state)` (for load, plan 05),
`serialize()`/selectors. The store contains **no domain logic of its own** — it
calls plan-01 pure functions. This keeps coverage high and the logic portable.

## Testing requirements (target ~100 %)

- **Direction table:** assert each vector against a hand-computed neighbor of a
  known hex; assert `opposite(d) === (d + 3) % 6` for all 6; assert the six
  vectors are distinct and their opposites negate.
- **Coordinate index:** set/get/delete/rebuild; `coordKey` round-trips.
- **placeHex:** into empty space (all slots null); adjacent to 1, 2, … up to 6
  existing hexes — **assert reciprocity on every created link** (A.slot i ↔
  B.slot opposite(i)); index updated.
- **moveHex:** away from all neighbors (old neighbors' reciprocal slots
  cleared); into a new cluster (new links + reciprocity); moving a hex that had
  neighbors on both ends.
- **deleteHex:** every former neighbor's reciprocal slot cleared; field values
  gone; index entry removed; deleting an isolated hex; deleting a hub with 6
  neighbors.
- **Invariant/property test:** after any random sequence of place/move/delete,
  the graph is fully reciprocal (for every non-null `A.neighbors[i] = B`,
  `B.neighbors[opposite(i)] = A`) and the coordinate index matches the hex set.
- **Completeness:** empty vs filled required field; optional empty field →
  complete; adding a required field to the template flips an existing hex to
  incomplete without re-touching the hex.
- **Registry:** both types present; `isEmpty`/`defaultValue` behave; adding a
  hypothetical third entry doesn't require touching consumers (structural test).
- **Orphans:** returns only ids absent from the template; empty when in sync.
- **Store:** each action delegates correctly (e.g. `placeHex` action leaves the
  store's graph reciprocal; `deleteField` does **not** touch any hex's stored
  value for that id — the non-destructive guarantee).

## Acceptance criteria

- [ ] All types compile under the strict config; `NeighborSlots` is a real
      6-tuple.
- [ ] One shared `DIRECTION_VECTORS` table, pointy-top / NE-clockwise, used by
      all graph ops (and later by plan 03's geometry).
- [ ] place/move/delete keep the graph fully reciprocal and the coordinate index
      consistent, proven by the invariant test.
- [ ] `deleteField` / removing a field never deletes a hex's stored value
      (non-destructive rule), proven by test.
- [ ] `isIncomplete` is derived live and reacts to template edits.
- [ ] Field types are a registry, not a switch; a new type is additive.
- [ ] Domain code imports no React.
- [ ] Coverage for `src/domain/**` ≈ 100 %, overall ≥ 80 %.
