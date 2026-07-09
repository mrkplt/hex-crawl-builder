# Feature: Session Start & Onboarding

## Purpose
Decide what the user sees the moment the app loads. Today the app opens straight
into the full three-panel shell regardless of state — even on a brand-new
session with no template and no hexes, which is a confusing place to start (you
can't meaningfully place a hex before any fields exist). This feature introduces
a **first-run onboarding screen** that funnels the user to define a template
before mapping, and a **resume path** that skips onboarding when prior state
already exists.

This feature amends doc 00 (App shell) and doc 01 (initial state on first run).
It depends on doc 09 (localStorage autosave) for state detection and on doc 08
(template editor modal) for the editor overlay it invokes.

## Screens
Two top-level screens (mutually exclusive; the app is always showing exactly
one):

- **Onboarding screen** — a minimal welcome/setup surface. Not the full app. No
  map canvas, no palette, no permanent template panel.
- **Map screen** — the primary working surface (doc 03): palette, canvas,
  header/toolbar with the Template button (doc 08).

## Load-time routing
On every app load, exactly one of these paths is taken:

1. **Restorable state exists** (localStorage has a saved campaign — see doc 09):
   restore it and go **directly to the map screen**. Skip onboarding entirely.
   The template is already defined, so there's nothing to onboard.
2. **No restorable state** (no localStorage, nothing loaded): go to the
   **onboarding screen**.

State detection is delegated to doc 09. This doc only specifies the routing
decision, not the storage mechanism.

## Onboarding screen behavior
The onboarding screen guides the user through the one required setup step —
defining a template — before it lets them into the map.

Content and controls:

- A brief explanation that a hex needs a template (a checklist schema) before it
  can hold content, so the first step is to define that schema.
- A **"Create Template"** button. Clicking it opens the template editor modal
  (doc 08) as an overlay on top of the onboarding screen. This is the same modal
  the map screen uses — do not build a second editor.
- A **"Start Mapping"** button that transitions to the map screen.

### Gating "Start Mapping"
- "Start Mapping" is **disabled/unavailable until the template has at least one
  field.** With zero fields there is nothing to fill in on a hex, so mapping is
  premature.
- The moment the template goes from zero fields to one-or-more fields (the user
  adds a field in the modal), "Start Mapping" becomes available. It does not
  require the modal to be closed first — but see edge cases.
- If the user removes all fields again (back to zero), "Start Mapping" returns to
  its disabled state.

### State transitions on the onboarding screen
| From | Event | To |
|---|---|---|
| Onboarding, modal closed | Click "Create Template" | Onboarding, template modal open |
| Onboarding, modal open | Add first field | Onboarding, modal open, "Start Mapping" now enabled |
| Onboarding, modal open | Close/Done on modal | Onboarding, modal closed |
| Onboarding (≥1 field) | Click "Start Mapping" | Map screen |

## Reaching onboarding again: "New Campaign"
The onboarding screen is also the destination of a **"New Campaign"** action
available from the **map screen** (in the header/toolbar).

- "New Campaign" **clears all state** — template, all hexes, neighbor graph, and
  the persisted localStorage copy (see doc 09) — and returns to the onboarding
  screen in its fresh, zero-field state.
- Because this is destructive (it discards the entire current campaign, which
  may include placed hexes and entered content), it **requires explicit
  confirmation** before it runs. Show a confirmation modal warning that starting
  a new campaign permanently discards the current template and all placed hexes.
  - Cancel = nothing changes; stay on the map screen.
  - Confirm = clear all state (including localStorage), route to onboarding.
- This is consistent with the app's rule that destructive actions are always
  explicitly confirmed (doc 00, doc 03's trash confirmation, doc 05's load
  confirmation).

## Edge cases
- **Add a field then delete it before Start Mapping:** "Start Mapping" tracks the
  live field count. Zero fields ⇒ disabled, regardless of history.
- **User loads a file (doc 05) while on the onboarding screen:** loading a valid
  file populates state (template + hexes). After a successful load the app should
  route to the map screen (the file already carries a template). If the file's
  template somehow has zero fields, the user lands on the map screen anyway (the
  file is authoritative); they can open the Template modal to add fields. Do not
  bounce a successful load back to onboarding.
- **User refreshes mid-onboarding after adding a field but before Start Mapping:**
  because template edits autosave (doc 09), the refresh finds restorable state
  and routes to the **map screen**, not back to onboarding. This is acceptable —
  the user has a valid template and can start placing hexes. (If this proves
  jarring, see open questions.)
- **Empty template with placed hexes cannot occur from onboarding** because
  hexes can only be placed on the map screen, which requires ≥1 field to reach.

## Explicitly out of scope
- A multi-step wizard/tour. Onboarding is a single gate: create a template, then
  start mapping.
- Sample/starter templates or "load an example campaign." (Candidate for later.)
- Any onboarding for returning users beyond skipping straight to the map.

## Open questions
- Should mid-onboarding refresh (field added, never pressed "Start Mapping")
  route to the map screen (current spec, driven by autosave) or preserve the
  onboarding screen until the user explicitly starts mapping? Current spec favors
  the autosave-consistent behavior; flag for review if it feels abrupt.
- Should "Start Mapping" require the template modal to be **closed** first, or is
  transitioning with the modal still open acceptable? Current spec allows either;
  simplest is to only surface "Start Mapping" on the onboarding screen behind the
  modal, so closing the modal is the natural path.
