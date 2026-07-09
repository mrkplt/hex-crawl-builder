# Plan 09 — localStorage Autosave

**Implements:** [`prd/features/09-localStorage-autosave.md`](../prd/features/09-localStorage-autosave.md)
**Depends on:** plans 00–06 (needs the full store shape); amends plan 05
(save/load).
**Goal:** auto-persist all campaign state to `localStorage` on every committed
state change so the user never loses work to a refresh. Provide helpers that
plan 07 (routing) and plan 05 (file load) call to read/write/clear the stored
campaign.

> Build order: this plan must land before plan 07 (onboarding needs
> `loadFromLocalStorage` on mount) and plan 08 (template edits that fire through
> the modal need to autosave). It can be built independently of 07 and 08.

---

## Architecture

Autosave is implemented as a **Zustand middleware / subscribe side-effect**, not
as a hook in every component. After any store update, a subscriber serializes the
current state and writes it to `localStorage`. This means no component needs to
know autosave exists — it happens automatically on every committed transition.

The persisted shape reuses the existing `CampaignSnapshot` type from
`src/state/store.ts` (which matches the plan 05 `SaveFile` body minus the
`version` wrapper). The stored blob includes `version` so it is forward-compatible
with the plan 05 migration seam.

---

## Tasks

### Task 1 — `src/features/persistence/localStorage.ts`

A pure, framework-free module with three exports:

```ts
const STORAGE_KEY = 'hex-crawl-builder:campaign';
const CURRENT_VERSION = 1; // must match plan 05's SAVE_VERSION

/** Write current campaign state to localStorage. Fails soft on quota/unavailable. */
export function saveToLocalStorage(snapshot: CampaignSnapshot): void;

/**
 * Read and parse the stored campaign. Returns the snapshot on success, null if
 * nothing is stored, the payload is corrupt, or storage is unavailable.
 * Validates `version` and structure; does not partially apply a bad blob.
 */
export function loadFromLocalStorage(): CampaignSnapshot | null;

/** Remove the stored campaign key. Called by "New Campaign" (plan 07). */
export function clearLocalStorage(): void;
```

Implementation notes:
- `saveToLocalStorage`: wrap the `localStorage.setItem` call in `try/catch`.
  Failures are swallowed (the app continues in-memory). Write
  `JSON.stringify({ version: CURRENT_VERSION, ...snapshot })`.
- `loadFromLocalStorage`: wrap entirely in `try/catch`. On any error (parse
  failure, missing key, wrong version, missing required fields) return `null`.
  Validate `version === CURRENT_VERSION` (use the same migration seam as plan
  05's `parseSaveFile` if available — import it, don't duplicate). Validate that
  `template.fields` is an array and `hexes` is an array before returning.
- `clearLocalStorage`: `localStorage.removeItem(STORAGE_KEY)`, wrapped in
  `try/catch`.

**Tests (pure, no DOM):**
- `saveToLocalStorage` + `loadFromLocalStorage` round-trips a valid snapshot
  (template with fields, hexes with neighbor links and fieldValues).
- `loadFromLocalStorage` returns `null` when nothing is stored.
- `loadFromLocalStorage` returns `null` on corrupt JSON.
- `loadFromLocalStorage` returns `null` on wrong `version`.
- `loadFromLocalStorage` returns `null` on missing `template` or `hexes` key.
- `clearLocalStorage` causes a subsequent `loadFromLocalStorage` to return
  `null`.
- `saveToLocalStorage` with `localStorage` unavailable (mock `setItem` to throw)
  does not throw; returns normally.

Use `vitest`'s built-in `localStorage` mock or a manual stub — do not depend on
a real browser storage implementation in tests.

---

### Task 2 — Autosave subscriber in the store

In `src/state/store.ts`, after the store is created, attach a Zustand subscriber
that calls `saveToLocalStorage` on every committed state change:

```ts
useAppStore.subscribe((state) => {
  saveToLocalStorage(state.serialize());
});
```

`state.serialize()` already exists and returns a `CampaignSnapshot` (template +
hexes array). The subscriber fires after every `set()` call in the store, which
only happens on committed transitions (not mid-drag frames — drag frames update
React Flow's local node state, not the Zustand store).

No debounce is needed for v1: the snapshot is small (one campaign), and
`serialize()` + `JSON.stringify` + `setItem` is cheap. If this proves to be a
performance issue, add debounce in a follow-up.

**Tests:**
- Calling `placeHex`, `moveHex`, `deleteHex`, `addField`, `editField`,
  `deleteField`, `reorderFields`, and `setHexFieldValues` on the store each
  result in `saveToLocalStorage` being called with the new state (mock
  `saveToLocalStorage` and assert it was called after each action).
- The autosave snapshot reflects the post-action state, not the pre-action state.

---

### Task 3 — Amend file load (`PersistenceBar`) to also write localStorage

Plan 05's file load calls `store.replaceAll(snapshot)` after a successful parse.
The autosave subscriber (task 2) fires on `replaceAll` automatically, so
`localStorage` is overwritten as a side-effect with no extra code. Verify this in
a test:

**Tests:**
- After a successful file load (`replaceAll` called with parsed snapshot),
  `loadFromLocalStorage()` returns the loaded snapshot (or equivalent data).

This test can live in `src/features/persistence/localStorage.test.ts` or in an
amended `src/features/persistence/format.test.ts`.

---

### Task 4 — Expose `loadFromLocalStorage` and `clearLocalStorage` for plan 07

No code change needed in this plan — the module exported in task 1 is the
interface plan 07 consumes. Confirm the exports are typed and exported correctly.
Add a re-export from `src/features/persistence/index.ts` if that barrel file
exists, or leave the direct import path.

---

## Acceptance criteria

- [ ] Every committed store action (field add/edit/delete/reorder, hex
      place/move/delete, hex field values saved) triggers an autosave to
      `localStorage`.
- [ ] `loadFromLocalStorage` returns the correct snapshot after any of the above
      actions.
- [ ] `loadFromLocalStorage` returns `null` on missing, corrupt, or
      wrong-version data.
- [ ] `clearLocalStorage` removes the stored blob; subsequent load returns `null`.
- [ ] `saveToLocalStorage` fails soft when `localStorage` is unavailable (no
      throw, no crash).
- [ ] File load (plan 05's `replaceAll`) causes `localStorage` to be overwritten
      with the loaded campaign via the subscriber.
- [ ] Mid-drag React Flow state changes do NOT trigger autosave (the Zustand
      store is not mutated mid-drag).
- [ ] Coverage ≥ 80 % for `src/features/persistence/**`; `verify` passes.
