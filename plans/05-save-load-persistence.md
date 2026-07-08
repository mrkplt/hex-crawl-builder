# Plan 05 — Save / Load (Persistence)

**Implements:** [`prd/features/05-save-load-persistence.md`](../prd/features/05-save-load-persistence.md)
**Depends on:** plans 00–04 (needs the full in-memory data shape to round-trip).
**Goal:** round-trip the entire campaign — template + hexes + neighbor graph —
through a **single JSON file**, client-only (no backend), the `hex-flower`
pattern.

---

## Deliverables (`src/features/persistence/`)

### 1. Save file shape & version (`src/features/persistence/format.ts`)

```ts
const SAVE_VERSION = 1;

interface SaveFile {
  version: number;            // schema version, for future migrations
  template: { fields: Field[] };
  hexes: Hex[];               // coordinates, neighbor links, fieldValues
}
```

Everything lives in one file — no separate template-library file for v1. Keep
`version` and the reserved `templateId`/`campaignId` hooks (plan 01) so a future
multi-template/multi-campaign format can **detect and migrate** old files
instead of breaking on them.

### 2. Serialize (`serialize(state): SaveFile` + download)
- Pure `serialize` builds the `SaveFile` from store state (template + hexes
  array). The coordinate index is **derived, not serialized** (plan 01) — it's
  rebuilt on load.
- **Save action:** triggered explicitly by the user (no autosave-to-disk).
  Serialize → JSON → trigger a browser file download (Blob + object URL +
  anchor click, the `hex-flower` client-only pattern).

### 3. Load (`parseSaveFile(json): Result<SaveFile>` + apply)
- **Confirm before loading** (PRD — loading replaces all in-memory state, which
  lives only in memory until explicitly saved): show a confirmation modal
  warning that loading discards the current template, hexes, and neighbor graph.
  Cancel → nothing changes. Confirm → proceed to file picker/apply.
- On confirm: file picker/upload → parse JSON → **validate `version`** (accept
  known version; on unknown version, either migrate or **reject cleanly** with a
  clear message — never silently load an incompatible file).
- Validate structural shape (template.fields, hexes) defensively before applying
  — a malformed file must be rejected, not partially loaded.
- Apply via plan-01 `replaceAll`: replace template + hexes, then **rebuild the
  coordinate index** from the loaded hexes.

### 4. Migration hook
- A `migrate(raw): SaveFile` seam keyed on `version`. For v1 it's identity for
  `version === SAVE_VERSION` and a clean rejection otherwise. Structured so a
  future v2 adds a case, not a rewrite.

## Resolved / deprioritized (per PRD)
- No global "unsaved changes" indicator / tab-close guard for v1 — the
  load-confirmation modal and the edit form's discard prompt (plan 04) cover the
  deliberate state-loss cases. Can be revisited later.

## Testing requirements

- **Round-trip (pure, high coverage):** `serialize` then `parseSaveFile` +
  `replaceAll` reproduces an equivalent store state — template fields (with
  order), hexes with coordinates, **neighbor links intact and reciprocal**, and
  `fieldValues` (including orphaned entries — they must survive the round-trip).
- **Coordinate index rebuild:** after load, the index matches the loaded hexes
  and adjacency queries work (place a new hex next to a loaded one → links form).
- **Version validation:** `version === 1` loads; an unknown version is rejected
  cleanly (no partial state applied); the migration seam is exercised.
- **Malformed input:** non-JSON, missing `template`/`hexes`, wrong-typed fields
  → rejected with a clear error, current state untouched.
- **Confirmation gate (component test):** Load shows the confirm modal first;
  Cancel leaves state unchanged and never opens the picker/applies; Confirm
  proceeds.
- **Serialize excludes derived data:** the emitted `SaveFile` contains no
  coordinate index (it's rebuilt on load).

## Acceptance criteria

- [ ] Save serializes template + hexes (+ links + fieldValues, incl. orphans) to
      one versioned JSON file and downloads it, client-only.
- [ ] Load is gated by a confirmation modal; Cancel is a no-op.
- [ ] Load validates `version` and structure, rejects incompatible/malformed
      files cleanly, and never partially applies.
- [ ] On confirm+valid, all in-memory state is replaced and the coordinate index
      is rebuilt; neighbor graph stays reciprocal.
- [ ] A migration seam exists keyed on `version`.
- [ ] Coverage ≥ 80 % for `src/features/persistence/**` (serialize/parse ≈
      100 %); `verify` passes.
