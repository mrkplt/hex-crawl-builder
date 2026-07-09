# Plan 07 — Session Start & Onboarding

**Implements:** [`prd/features/07-session-start-onboarding.md`](../prd/features/07-session-start-onboarding.md)
**Depends on:** plans 00–06, plan 08 (template modal), plan 09 (localStorage autosave).
**Goal:** route the user to an onboarding screen on first run and straight to the
map on resume; provide a "New Campaign" action that clears all state.

> Build order: plan 09 (autosave/load) must land before this plan, because the
> routing decision at app load depends on localStorage state detection. Plan 08
> (template modal) must also land first because the onboarding screen invokes it.

---

## Architecture

The App shell (`src/app/App.tsx`) grows a top-level **screen** concept: either
`'onboarding'` or `'map'`. This is local React state in `App` (not in the
Zustand store — it's pure UI navigation, not campaign data). The screen is set
at load time based on whether restorable localStorage state exists (plan 09
provides the detection), and transitions are driven by user actions.

---

## Tasks

### Task 1 — `screen` state + load-time routing in `App`

- Add `screen: 'onboarding' | 'map'` as `useState` in `App`.
- On mount (`useEffect` with empty deps), call plan 09's `loadFromLocalStorage`:
  - If it returns valid state → `replaceAll` + set screen to `'map'`.
  - If it returns nothing → set screen to `'onboarding'`.
- Render the correct surface based on `screen` (tasks 2 and 3).
- No other logic in this file; routing is a thin switch.

**Tests:**
- App with no localStorage → renders onboarding screen (query for its landmark
  heading / "Create Template" button).
- App with valid localStorage state → renders map screen (query for the map
  canvas landmark).
- Both branches: the other screen's landmark must be absent from the DOM.

---

### Task 2 — `OnboardingScreen` component (`src/app/OnboardingScreen.tsx`)

The onboarding surface. Props:
```ts
interface OnboardingScreenProps {
  onStartMapping: () => void;
}
```

Renders:
- A heading and one-paragraph explanation (the template is the first step before
  placing hexes).
- A **"Create Template"** button that opens the template editor modal (plan 08).
  The modal is rendered here as an overlay; closing it returns to the onboarding
  screen with the modal closed.
- A **"Start Mapping"** button that calls `onStartMapping`. Disabled when
  `template.fields.length === 0`; enabled as soon as ≥1 field exists (read live
  from the store so the button reacts while the modal is open).
- No map canvas, no palette, no hex list.

The template modal (plan 08's `TemplateEditorModal`) is opened/closed with local
boolean state inside `OnboardingScreen` — no lifting needed.

**Tests:**
- Renders heading and both buttons.
- "Start Mapping" is disabled with zero fields; becomes enabled after a field is
  added (simulate via store or a stub).
- "Create Template" opens the modal (assert modal is visible); closing the modal
  hides it.
- "Start Mapping" calls `onStartMapping` when enabled.
- "Start Mapping" does NOT call `onStartMapping` when disabled.

---

### Task 3 — `MapScreen` component (`src/app/MapScreen.tsx`)

Extract the existing map surface out of `App` into its own component. Props:
```ts
interface MapScreenProps {
  onNewCampaign: () => void;
}
```

Renders (exactly what `App` renders today, minus the template side panel and the
useless right panel — those are removed in plan 08):
- The app header with title, `PersistenceBar`, a **"Template"** button (plan 08),
  and a **"New Campaign"** button.
- The `HexMap` canvas.
- The `HexFocusView` modal when a hex is selected.

"New Campaign" button behavior (task 4).

**Tests:**
- Renders the map canvas landmark.
- Renders "New Campaign" and "Template" buttons.
- Clicking "New Campaign" opens the confirmation dialog (task 4).

---

### Task 4 — "New Campaign" action

In `MapScreen`, "New Campaign":
1. Opens a `ConfirmDialog` (already exists at `src/components/ConfirmDialog.tsx`).
   - Title: "Start a new campaign?"
   - Message: "This will permanently discard your current template and all placed
     hexes. This cannot be undone."
   - Confirm label: "New Campaign", Cancel label: "Cancel".
2. On Cancel: dialog closes, nothing changes.
3. On Confirm:
   - Call plan 09's `clearLocalStorage` (clears the stored campaign).
   - Call store's `replaceAll({ template: { fields: [] }, hexes: [] })` to reset
     in-memory state.
   - Call `onNewCampaign()` (the prop), which sets `screen` back to `'onboarding'`
     in `App`.

**Tests:**
- Cancel: store state unchanged, screen stays on map.
- Confirm: `clearLocalStorage` called, store reset to empty, `onNewCampaign`
  called.
- Dialog is not shown before the button is clicked.

---

### Task 5 — File load routes to map screen

When the user loads a file via plan 05's `PersistenceBar` (file load), the app
should navigate to the map screen after a successful load regardless of which
screen is currently active.

- `PersistenceBar` already calls `replaceAll` on successful load (plan 05).
- Add an `onLoad` callback prop to `PersistenceBar` (or lift via an existing
  mechanism) so `App` can switch to `'map'` after successful load.
- This ensures that loading a file while on the onboarding screen takes the user
  to the map.

**Tests:**
- Simulating a successful load while on the onboarding screen → screen switches
  to `'map'`.

---

### Task 6 — Update `App` and clean up

- `App` becomes a thin router: holds `screen` state + loads localStorage on
  mount. Renders `<OnboardingScreen>` or `<MapScreen>` based on `screen`.
- Remove the three-panel layout from `App` (the permanent template panel and the
  useless right panel are gone — plan 08 owns the modal).
- Update `src/app/App.test.tsx` to cover the new routing logic (tasks 1 and 5).

---

## Acceptance criteria

- [ ] Fresh load (no localStorage) renders the onboarding screen; map canvas is
      not in the DOM.
- [ ] "Start Mapping" is disabled with zero fields and enabled with ≥1 field,
      reacting live while the template modal is open.
- [ ] "Start Mapping" transitions to the map screen.
- [ ] Resuming (valid localStorage) renders the map screen directly; onboarding
      screen is not in the DOM.
- [ ] "New Campaign" (Confirm) resets store + clears localStorage + returns to
      onboarding.
- [ ] "New Campaign" (Cancel) is a no-op.
- [ ] Successful file load from the onboarding screen navigates to the map screen.
- [ ] Coverage ≥ 80 % for `src/app/**`; `verify` passes.
