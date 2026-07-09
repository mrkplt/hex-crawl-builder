# Feature: localStorage Autosave

## Purpose
Guarantee the user never loses work to a refresh, tab close, or accidental
navigation. Today the only persistence is explicit file save/load (doc 05);
everything else lives in volatile in-memory state, so a refresh wipes the entire
campaign. This feature adds **automatic, invisible persistence of all state to
`localStorage`**, and makes localStorage the app's source of truth for
resume-on-load.

This feature amends doc 05 (Save / Load) and supports doc 07 (session routing)
and doc 08 (live template edits are what gets persisted).

## What autosaves
**Every** state change is persisted to localStorage automatically, with no user
action:

- Template changes — add/edit/delete/reorder field (doc 01 / doc 08).
- Hex placements — creating a hex from the palette (doc 03).
- Hex moves — repositioning a placed hex (doc 03 / doc 10).
- Hex edits — saving field values in the Hex Edit Form (doc 04).
- Hex deletions — confirmed trash of a hex (doc 03).
- Neighbor-graph changes — the reciprocal link updates that accompany any
  place/move/delete (doc 00 / Data Model). The graph is part of the persisted
  state, not re-derived on load beyond the coordinate index (see below).

There is **no explicit "save to localStorage" button** and no visible save
indicator. Autosave is always on and invisible.

## Persisted shape
The persisted localStorage payload uses the **same JSON shape as the save file**
(doc 05):

```
{
  version: number,       // schema version, shared with the file format (doc 05)
  template: { fields: Field[] },
  hexes: Hex[]            // coordinates, neighbor links, fieldValues
}
```

Reusing the file shape means file save is "serialize current localStorage state
to a file" and file load is "write an imported file into localStorage" — no
second serializer. The coordinate index (`"q,r" → hexId`) is a **derived cache**
(doc 00) and is **rebuilt on load**, not persisted, consistent with "the graph
is the source of truth."

## Load behavior (source of truth for doc 07 routing)
On app load:

1. Read localStorage.
2. **If valid state exists:** restore it into the in-memory store, rebuild the
   coordinate index from the hex set, and route to the **map screen** (doc 07,
   resume path).
3. **If no state exists:** route to the **onboarding screen** (doc 07, first-run
   path).

`version` is validated on load exactly as with the file format (doc 05). If the
persisted `version` is incompatible and cannot be migrated, treat it as absent /
unusable rather than crashing — see edge cases and open questions.

## Interaction with file save/load (doc 05)
File save/load still exists and is still explicit. It now operates through
localStorage:

- **File save:** exports the current state (i.e. the current in-memory state,
  which is identical to what's in localStorage) to a downloaded JSON file.
  Unchanged from the user's perspective.
- **File load:** imports a JSON file and **overwrites both in-memory state and
  localStorage** with the file's contents. This is a destructive replace of the
  current campaign, so it **retains the doc 05 load-confirmation modal** — the
  warning is still valid (loading discards the current campaign), and now
  "discards" includes the autosaved localStorage copy. On confirm: parse,
  validate `version`, replace in-memory state, overwrite localStorage, rebuild
  the coordinate index, and (per doc 07) show the map screen.
- Because state is autosaved, doc 05's note that state "lives only in memory
  until explicitly saved" is superseded: state now survives refreshes. File save
  remains the mechanism for exporting/backing up/sharing a campaign as a portable
  file, not for preventing refresh loss.

## Interaction with "New Campaign" (doc 07)
- "New Campaign" clears in-memory state **and clears the localStorage key**, so a
  subsequent load routes to onboarding rather than restoring the discarded
  campaign.
- "New Campaign" is destructive and confirmed (doc 07). The localStorage clear
  happens only after the user confirms.

## Edge cases
- **localStorage unavailable / full / throws** (private-browsing quotas, disabled
  storage): autosave writes should fail soft — the app must keep working
  in-memory and must not crash or block the user's edit. See open questions on
  whether to surface a warning. Reads that throw are treated as "no state" ⇒
  onboarding.
- **Corrupt or unparseable localStorage payload:** treat as "no valid state." Do
  not crash. Route to onboarding. (Whether to preserve the corrupt blob for
  diagnostics vs. clear it — open question.)
- **Incompatible `version`:** same handling as doc 05 file load — migrate if a
  migration exists, otherwise treat as unusable (⇒ onboarding) rather than
  loading a shape the app can't safely read.
- **Concurrent tabs:** two tabs of the same app both writing the same
  localStorage key can clobber each other (last write wins). Not solved in v1 —
  see open questions.
- **Write frequency:** autosave fires on every state change. High-frequency
  changes (e.g. dragging) should persist on the **committed** state transition
  (e.g. `onNodeDragStop` / drop accepted per doc 10), not on every intermediate
  drag frame. Persisting mid-drag positions is unnecessary and wasteful.

## Explicitly out of scope
- Multiple named campaigns in localStorage / a campaign picker. Single key,
  single campaign (matches doc 00's single-campaign scope).
- Undo/redo history persistence.
- Cross-tab synchronization / conflict resolution.
- Server-side or cloud sync (there is no backend).

## Open questions
- Should autosave be **debounced/throttled** (e.g. coalesce bursts) or write
  synchronously on each committed change? Committed-state writes are cheap for a
  single-campaign JSON blob, but a debounce guards against pathological churn.
- Should the user be **warned** when localStorage is unavailable (so they know a
  refresh will lose work and should file-save instead), or should it stay
  silent? Failing soft is required; surfacing a one-time warning is a UX call.
- On corrupt/incompatible localStorage: clear it silently, or keep the blob and
  warn? Current spec routes to onboarding either way.
- Cross-tab last-write-wins is acceptable for v1; revisit if multi-tab use turns
  out to be common.
