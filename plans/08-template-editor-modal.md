# Plan 08 — Template Editor Modal

**Implements:** [`prd/features/08-template-editor-modal.md`](../prd/features/08-template-editor-modal.md)
**Depends on:** plans 00–06.
**Goal:** move the template editor out of the permanent left side panel and
behind a button; remove the useless right panel. The editor's internal behavior
is unchanged — only its presentation changes.

> Build order: this plan must land before plan 07 (onboarding invokes the modal)
> and before plan 09 (autosave fires on template edits, which flow through the
> same modal). It can be built in parallel with plan 09 if the team splits work,
> but plan 07 depends on both.

---

## Architecture

The existing `TemplateEditor` component (`src/features/template/TemplateEditor.tsx`)
is left untouched internally. A new wrapper component — `TemplateEditorModal` —
renders it inside a modal overlay. The modal is opened/closed by whichever
surface needs it (map screen header button, onboarding "Create Template" button)
via a simple boolean prop. There is one `TemplateEditorModal` component shared
by both callers.

---

## Tasks

### Task 1 — Remove permanent panels from `App`

- In `src/app/App.tsx`, remove the left template-panel `<div>` that wraps
  `<TemplateEditor />`.
- Remove the right "Hex edit form" placeholder panel (`<section>` with "Click a
  hex on the map to edit its fields."`).
- The three-column layout CSS in `src/app/App.css` should be updated to a
  simpler layout (header + full-width map body). The `HexMap` should now fill
  the available space.
- `HexFocusView` stays — it is a modal that opens on hex click and is not a
  permanent panel.

**Tests:**
- App renders neither the "Template" side panel element nor the "Click a hex"
  placeholder text.
- App renders the map canvas landmark.

---

### Task 2 — `TemplateEditorModal` component (`src/features/template/TemplateEditorModal.tsx`)

A modal wrapper around the existing `TemplateEditor`.

```ts
interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```

Behavior:
- When `isOpen` is `false`: renders nothing (or a hidden element — hidden is fine
  for accessibility, but not required for v1).
- When `isOpen` is `true`: renders an overlay (backdrop) covering the current
  screen, with the `TemplateEditor` in a centered panel. The panel has a **"Done"
  button** at the top or bottom that calls `onClose`.
- Clicking the backdrop or pressing Escape also calls `onClose` (both behave
  identically to "Done" — no confirmation needed, edits are already live).
- The underlying screen is visible but not interactive while the modal is open
  (backdrop captures pointer events).
- `TemplateEditor` is rendered as a child — all field add/edit/delete/reorder
  behavior is unchanged and wired through the store exactly as today.

CSS: new `TemplateEditorModal.css`. The overlay/backdrop/panel is styled here.
Keep it separate from `TemplateEditor.css` so each component owns its own styles.

**Tests:**
- When `isOpen` is `false`: `TemplateEditor` is not in the DOM (or
  `aria-hidden`).
- When `isOpen` is `true`: `TemplateEditor` is visible; "Done" button is present.
- Clicking "Done" calls `onClose`.
- Pressing Escape calls `onClose` (keyboard event on the modal root or document).
- Clicking the backdrop (outside the panel) calls `onClose`.
- The modal does not call `onClose` when clicking inside the panel content.
- Adding a field while the modal is open updates the store immediately (live
  edits — assert via store state, not by closing).

---

### Task 3 — "Template" button on the map screen

In the map screen header (`src/app/App.tsx` for now; will move to
`src/app/MapScreen.tsx` in plan 07), add:
- A **"Template"** button in the header row alongside the `PersistenceBar`.
- Local boolean state `templateModalOpen` controlling the `TemplateEditorModal`.
- Clicking "Template" sets `templateModalOpen = true`; `TemplateEditorModal`'s
  `onClose` sets it to `false`.

**Tests:**
- "Template" button is present in the header.
- Clicking it opens the modal (assert modal/editor visible).
- Closing the modal (via "Done") hides it again.

---

### Task 4 — CSS layout cleanup

- Update `src/app/App.css` to remove the three-column grid.
- The app shell becomes: a fixed-height header bar, and a body that fills the
  remaining viewport height with the map canvas.
- The `HexMap` component should expand to fill its container (it already sets
  `height: 100%` on the inner canvas; verify this works in the new layout).
- No functional change — just removing the column grid that held the now-removed
  panels.

---

## Acceptance criteria

- [ ] The permanent left template panel is gone from the app shell.
- [ ] The useless right "Click a hex to edit" placeholder panel is gone.
- [ ] A "Template" button in the header opens the `TemplateEditorModal`.
- [ ] The modal renders `TemplateEditor` with full add/edit/delete/reorder
      behavior working and wired through the store.
- [ ] Edits made in the modal take effect immediately (live) on the map behind
      the overlay.
- [ ] Modal closes on "Done", Escape, and backdrop click — no confirmation needed.
- [ ] `HexMap` fills the available space after layout cleanup.
- [ ] Coverage ≥ 80 % for `src/features/template/**` and updated `src/app/**`;
      `verify` passes.
