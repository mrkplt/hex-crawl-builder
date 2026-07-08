# Feature: Save / Load (Persistence)

## Purpose
Round-trip the entire campaign through a single file, the same pattern as the `hex-flower` repo (client-only, no backend).

## Save file shape
```
{
  version: number,       // schema version, for future migrations
  template: {
    fields: Field[]       // see Checklist Template Builder doc
  },
  hexes: Hex[]             // see Hex Data Model doc — includes coordinates,
                            // neighbor links, and fieldValues
}
```
Everything — template, hexes, and their positions/links — lives in this one file. No separate template-library file for v1 (per your call to keep it to one combined file).

## Save
- Triggered explicitly by the user (not autosave-to-disk, since there's no backend).
- Serializes current in-memory state to JSON and triggers a browser file download.

## Load
- **Loading a file replaces all current in-memory state, so it must be confirmed first.** Before opening the file picker (or before applying a picked file), show a confirmation modal warning that loading discards the current template, hexes, and neighbor graph, which live only in memory until explicitly saved. Cancel = nothing changes; Confirm = proceed to pick/apply the file.
- On confirm: file picker/upload; parses JSON and replaces all in-memory state (template + hexes + neighbor graph).
- Validate `version` on load so a future schema change can either migrate or reject an incompatible file cleanly.

## Why version the file now
Even though today's file only ever holds one template and one implicit campaign, bumping `version` and reserving `templateId`/`campaignId` on hexes (per Data Model doc) means a future multi-campaign or multi-template save format can detect and migrate old single-campaign files instead of breaking on them.

## Resolved / deprioritized
- **Global "unsaved changes" indicator: not important for v1.** The load-confirmation modal guards deliberate state-discarding, and the edit form has its own discard prompt (doc 04); a global dirty indicator / tab-close-refresh guard is explicitly not a priority now. Can be revisited later.
