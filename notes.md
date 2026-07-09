# Review Notes — Hex Crawl Builder

Observations and issues captured after first live review session. Each item is a candidate PRD or PRD amendment.

---

## UX / Interaction

### New hex block feels like a button, not a draggable
The "new hex" affordance looks like a button. It should read as a draggable source — needs visual treatment (drag handle, cursor, etc.) that signals "pick me up and place me."

### Dragging to trash doesn't work — canvas moves instead
When attempting to drag a hex to the trash, the canvas pan behavior intercepts the drag. Canvas panning needs to be suppressed while a drag is in progress so the user can reach the trash target.

### Hex should appear under the pointer during drag
Both new-hex dragging and existing-hex repositioning: the hex graphic should follow the pointer as a drag preview, not stay in place or disappear.

### Hexes cannot currently be dragged to move on the canvas
Moving an already-placed hex by dragging is broken. This is a core map-editing interaction and needs to work.

### Hexes must always be contiguous after the first
You should not be able to place a hex that is not adjacent to at least one existing hex (except when placing the very first hex). Prevents unreachable / untraversable islands.

---

## State & Persistence

### Auto-save to localStorage
App state should be continuously persisted to localStorage so nothing is lost on refresh or accidental close.

### Session start: prompt to create a new template, not the full app
On a fresh session (no saved state) the user should be greeted with a "create your template" flow, not dropped directly into the full editor UI. Matches the PRD intent.

### Session resume: go straight to the canvas
When restoring from localStorage or a loaded save file, skip the template-creation prompt and show the canvas directly (template is already defined).

---

## UI Structure

### Right panel is not useful — remove or repurpose
The entire right panel is dead weight in its current form. Needs to be evaluated and either removed or replaced with something meaningful.

### Template editor should be behind a button, not in a side panel
The template/field editor should be hidden by default and opened via a button (modal, drawer, or overlay), not permanently occupying a side panel.

---

## Open Question

### Field picker / template builder — library or hand-rolled?
Clarify whether the template builder (field types, ordering, etc.) uses a third-party library or is custom. Informs how much work changing it is.

---

## Design Reference

Refer to the **hex-flower app** (`/Users/mark/src/hex-flower-app`) for design cues on:
- State management patterns
- Drag-to-trash interaction
- New hex affordance styling
- Overall palette and component feel
