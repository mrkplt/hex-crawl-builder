# Feature: Template Editor Modal

## Purpose
Move the template editor out of a permanent side panel and behind an explicit
button, surfaced as a **modal / slide-over overlay**. Today the template editor
(doc 01) lives in an always-visible left panel and the app shell also carries a
useless right panel ("Click a hex to edit"). Both consume horizontal space the
map should own. This feature removes the permanent panels and makes the editor
an on-demand overlay, without changing the editor's behavior.

This feature amends doc 00 (App shell) and is the delivery surface for doc 01
(the template builder itself). Doc 07 (onboarding) invokes the same modal.

## What changes vs. today
- **Remove** the always-visible template editor left panel.
- **Remove** the "Click a hex to edit" right panel entirely from the app shell.
  (Hex editing is opened by clicking a placed hex, which opens the Hex Edit Form
  per doc 04 / doc 00 — it was never a permanent panel and should not be.)
- **Add** a **"Template" button** in the map screen header/toolbar that opens the
  editor as an overlay.

The template editor's *internal* behavior (add/edit/delete/reorder fields via
dnd-kit, live effect on hexes) is unchanged from doc 01. This doc only changes
*how it is presented and dismissed.*

## Entry points
The template editor modal is opened from exactly two places, and both open the
**same** modal instance/component:

1. **Map screen** — the "Template" button in the header/toolbar.
2. **Onboarding screen** — the "Create Template" button (doc 07).

There is one editor. Do not fork it per entry point.

## Modal behavior
- Opening the modal overlays the current screen (map or onboarding). The
  underlying screen remains visible behind the overlay (dimmed/backdrop is a
  presentation detail, not specified here) but is not interactive while the modal
  is open.
- The modal contains the full field editor from doc 01: the field list, add
  field, edit field (label / type / required), delete field, and drag-to-reorder.
- **Changes are live.** Editing the template updates every hex's incomplete
  marker on the map immediately, exactly as it does today. There is no "apply"
  or "save template" step inside the modal — edits take effect as they are made.
  (Persistence of those edits is handled automatically by doc 09 autosave; there
  is no manual save button here.)
- The modal has an explicit **close/done** control (e.g. a "Done" button and/or a
  close affordance). Closing the modal simply dismisses the overlay and returns
  to the screen beneath it. Because edits are already live and already persisted,
  closing discards nothing and requires no confirmation.

## Dismissal rules
- Clicking "Done" / close dismisses the modal.
- Whether backdrop-click and Escape also dismiss is a presentation detail; if
  supported, they behave identically to "Done" (no confirmation, nothing lost,
  since edits are live and autosaved).
- The modal is non-destructive to dismiss. There is no "unsaved template
  changes" state to guard — this is distinct from the Hex Edit Form's discard
  prompt (doc 04), which guards *field-value* edits that are only committed on
  save.

## Interaction with the map beneath
- While the modal is open, the map canvas is not interactive (the overlay
  captures input). Placing/moving/deleting hexes happens only with the modal
  closed.
- Live template edits still repaint the map's incomplete markers underneath the
  overlay, so when the user closes the modal the map already reflects their
  changes.

## Edge cases
- **Deleting the last field while hexes exist:** allowed (doc 01 permits editing
  the template at any time). Hexes remain placed; their stored values are
  untouched (doc 00 non-destructive principle). With zero fields, no hex can be
  incomplete, so incomplete markers clear. Note this does *not* route the user
  back to onboarding — onboarding gating (doc 07) only governs first entry into
  the map, not ongoing state.
- **Opening the modal from onboarding vs. map:** behavior is identical; only the
  screen behind the overlay differs. On onboarding, adding the first field
  enables "Start Mapping" (doc 07) while the modal is still open.
- **Rapid open/close:** opening and closing the modal has no side effects beyond
  showing/hiding it; template state persists across open/close because it lives
  in the store, not the modal.

## Explicitly out of scope
- Any change to the field model, field types, or reorder mechanics (doc 01
  owns those).
- Docking/resizing/persisting the modal's position or size.
- A separate hex-edit panel in the shell (removed; hex editing is doc 04's
  click-to-open form).

## Open questions
- Should the map screen's Template button show an indicator when the template is
  empty (zero fields) to nudge the user to define one? Not required for v1;
  onboarding (doc 07) already guarantees a template exists before the map screen
  is first reached, but "New Campaign" or deleting all fields can produce a
  zero-field map-screen state.
