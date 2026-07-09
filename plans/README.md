# Implementation Plans

This directory breaks the [product PRDs](../prd/) into discrete, executable
implementation plans. Read [`prd/00-product-vision.md`](../prd/00-product-vision.md)
first for the overarching vision, then work the plans **in the numbered order
below** — each depends on the ones before it.

## Why the plan numbering differs from the PRD numbering

The PRDs are numbered by feature area. The plans are numbered by **build
order**, which is not the same thing: foundational, non-UI work (the data
model, the tooling) has to land before the surfaces that consume it. Every plan
names the PRD it implements in its header.

## Execution order

| Plan | Implements PRD | Depends on |
|---|---|---|
| [`00-project-scaffolding.md`](./00-project-scaffolding.md) | — (infrastructure) | — |
| [`01-hex-data-model.md`](./01-hex-data-model.md) | [`prd/features/02`](../prd/features/02-hex-data-model.md) | 00 |
| [`02-checklist-template-builder.md`](./02-checklist-template-builder.md) | [`prd/features/01`](../prd/features/01-checklist-template-builder.md) | 00, 01 |
| [`03-hex-map-grid-placement.md`](./03-hex-map-grid-placement.md) | [`prd/features/03`](../prd/features/03-hex-map-grid-placement.md) | 00, 01, 02 |
| [`04-hex-edit-form.md`](./04-hex-edit-form.md) | [`prd/features/04`](../prd/features/04-hex-edit-form.md) | 00, 01, 02, 03 |
| [`05-save-load-persistence.md`](./05-save-load-persistence.md) | [`prd/features/05`](../prd/features/05-save-load-persistence.md) | 00–04 |
| [`06-neighbor-context.md`](./06-neighbor-context.md) | [`prd/features/06`](../prd/features/06-neighbor-context.md) | 00–05 |
| [`08-template-editor-modal.md`](./08-template-editor-modal.md) | [`prd/features/08`](../prd/features/08-template-editor-modal.md) | 00–06 |
| [`09-localstorage-autosave.md`](./09-localstorage-autosave.md) | [`prd/features/09`](../prd/features/09-localStorage-autosave.md) | 00–06 |
| [`10-drag-ux-overhaul.md`](./10-drag-ux-overhaul.md) | [`prd/features/10`](../prd/features/10-drag-ux-overhaul.md) | 00–06 |
| [`11-hex-contiguity.md`](./11-hex-contiguity.md) | [`prd/features/11`](../prd/features/11-hex-contiguity.md) | 00–06 |
| [`07-session-start-onboarding.md`](./07-session-start-onboarding.md) | [`prd/features/07`](../prd/features/07-session-start-onboarding.md) | 00–06, 08, 09 |

## Dependency graph

```
00 Scaffolding
      │
      ▼
01 Hex Data Model  ──────────────┐
      │                          │
      ▼                          ▼
02 Template Builder         (types consumed by all)
      │
      ▼
03 Map Grid & Placement ──► 04 Hex Edit Form
      │                          │
      └────────────┬─────────────┘
                   ▼
          05 Save / Load
                   │
                   ▼
          06 Neighbor Context (Hex Focus View)
                   │
          ┌────────┼────────┬──────────┐
          ▼        ▼        ▼          ▼
         08       09       10         11
     Template  autosave  Drag UX  Contiguity
      Modal               overhaul
          │        │
          └────┬───┘
               ▼
              07
          Onboarding
```

## Standing rules for every plan

These come from the project mandate and apply to **all** plans; individual
plans don't restate them. See [`../CLAUDE.md`](../CLAUDE.md) for the full
engineering conventions.

- **TypeScript, strict, explicit.** `strict: true` plus the extra flags in
  `CLAUDE.md`. `any` is a lint error. Public functions and module boundaries
  carry explicit types.
- **≥ 80 % test coverage**, enforced by Vitest coverage thresholds in
  `vitest.config.ts`. A plan is not "done" until its code is at or above the
  threshold and the suite is green. Pure domain logic (plan 01) should target
  ~100 %.
- **Typecheck + lint must pass before every commit, and the full test suite +
  coverage before every push.** Enforced locally by git hooks (plan 00) and in
  CI.
- **Definition of Done for each plan:** all tasks complete; `npm run typecheck`,
  `npm run lint`, and `npm run test:coverage` all pass; the feature's PRD
  "Open Questions" resolutions are honored; work is committed and pushed.

## How to work a plan

1. Read the plan and its linked PRD in full (including the PRD's **Open
   Questions** — those record decisions you must honor).
2. Implement the tasks in order; keep commits small and scoped to a task.
3. Write tests alongside the code, not after — each task lists what to cover.
4. Run `npm run verify` (typecheck + lint + coverage) before committing.
5. Check the plan's **Acceptance criteria** before considering it done.
