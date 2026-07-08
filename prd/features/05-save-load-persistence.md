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
- File picker/upload; parses JSON and replaces all in-memory state (template + hexes + neighbor graph).
- Validate `version` on load so a future schema change can either migrate or reject an incompatible file cleanly.

## Why version the file now
Even though today's file only ever holds one template and one implicit campaign, bumping `version` and reserving `templateId`/`campaignId` on hexes (per Data Model doc) means a future multi-campaign or multi-template save format can detect and migrate old single-campaign files instead of breaking on them.

## Open questions
- Is there a need for an "unsaved changes" indicator in the UI, given saving is a manual export step and all edits (template changes, hex edits, moves) only live in memory until then?
