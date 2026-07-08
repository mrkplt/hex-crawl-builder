# Plan 00 — Project Scaffolding & Tooling

**Implements:** infrastructure for all PRDs (no single PRD).
**Depends on:** nothing. This is the first plan.
**Goal:** a running React + Vite + TypeScript app with strict typing, testing,
coverage gating, linting, and pre-commit/pre-push + CI enforcement — so every
later plan lands on solid, self-checking ground.

---

## Deliverables

- A Vite React + TypeScript project that builds and serves.
- Strict TypeScript config with explicit-typing lint rules.
- Vitest + Testing Library set up with jsdom and a coverage threshold of 80 %.
- npm scripts: `dev`, `build`, `preview`, `test`, `test:coverage`, `typecheck`,
  `lint`, `format`, `verify`.
- Git hooks: pre-commit runs typecheck + lint; pre-push runs the full test
  suite with coverage.
- A GitHub Actions CI workflow running typecheck, lint, and coverage.
- `CLAUDE.md` at the repo root documenting stack, commands, and conventions.
- A trivial smoke test proving the toolchain works end to end.

## Decisions (make these once, here)

- **Bundler/dev server:** Vite (`react-ts` template).
- **Test runner:** Vitest (native Vite integration, Jest-compatible API) with
  `@testing-library/react`, `@testing-library/user-event`, `jsdom`, and
  `@vitest/coverage-v8`.
- **State management:** Zustand (introduced in plan 01). Chosen because app
  state (template + hexes + coordinate index) is shared across three surfaces
  and Zustand stores are testable outside React. **All domain mutations stay as
  pure functions** (plan 01) that the store merely wraps, so the hard logic is
  unit-testable without a store or a DOM.
- **Linting:** ESLint (flat config) with `typescript-eslint`,
  `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`. Prettier for
  formatting.
- **Git hooks:** Husky + lint-staged.

## Task breakdown

1. **Scaffold the app.** Create the Vite `react-ts` project in place (repo root
   already holds `prd/` and `plans/` — scaffold around them, do not overwrite
   them). Verify `npm run dev` serves and `npm run build` produces `dist/`.
2. **Harden `tsconfig`.** Beyond `strict: true`, enable:
   `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`,
   `noFallthroughCasesInSwitch`, `noImplicitReturns`,
   `noUnusedLocals`, `noUnusedParameters`, `forceConsistentCasingInFileNames`.
   Add a `typecheck` script: `tsc --noEmit`.
   > `noUncheckedIndexedAccess` matters for the neighbor array and coordinate
   > index in plan 01 — it forces null-handling on `neighbors[i]` lookups.
3. **ESLint + Prettier.** Flat config extending the recommended type-checked
   rulesets. Set `@typescript-eslint/no-explicit-any: "error"` and
   `@typescript-eslint/explicit-module-boundary-types: "warn"`. Add `lint`
   (`eslint .`) and `format` (`prettier --write .`) scripts.
4. **Vitest + Testing Library.** Configure `vitest.config.ts` with
   `environment: "jsdom"`, `globals: true`, a `setupTests.ts` importing
   `@testing-library/jest-dom`, and V8 coverage with **thresholds set to 80 %**
   for lines/functions/branches/statements. Exclude non-source files
   (config, `main.tsx`, type-only `.d.ts`, generated) from coverage.
   Add `test` (`vitest`) and `test:coverage` (`vitest run --coverage`) scripts.
5. **`verify` script.** `npm run typecheck && npm run lint && npm run test:coverage`.
   This is the one command a plan's Definition of Done runs.
6. **Git hooks (Husky + lint-staged).**
   - `pre-commit`: run `lint-staged` (eslint + prettier on staged files) **and**
     `npm run typecheck`.
   - `pre-push`: `npm run test:coverage`.
   > This directly satisfies the mandate: "type check passing before commit and
   > push" and coverage gating before push.
7. **CI workflow.** `.github/workflows/ci.yml`: on push/PR, Node LTS, `npm ci`,
   then `npm run typecheck`, `npm run lint`, `npm run test:coverage`. Upload the
   coverage report as an artifact.
8. **Directory layout.** Establish and document:
   ```
   src/
     domain/        # pure, framework-free logic + types (plan 01)
     state/         # Zustand store wiring (plan 01)
     features/
       template/    # plan 02
       map/         # plan 03
       hex-edit/    # plan 04
       persistence/ # plan 05
     components/    # shared presentational components
     app/           # App shell, screen routing/layout
     test/          # shared test utilities, factories, fixtures
   ```
9. **`CLAUDE.md`.** Write the repo-level engineering doc (stack, commands,
   conventions, testing policy, the pointy-top/NE-clockwise invariant callout).
   *(If already created ahead of scaffolding, reconcile it here.)*
10. **Smoke test.** A minimal `App` rendering an app-shell placeholder with the
    three surfaces named in the product vision (map / template / hex-edit
    regions as stubs), plus a Testing Library test asserting it renders. Proves
    jsdom + coverage + the render pipeline all work.

## Testing requirements

- One rendering smoke test for `App` (Testing Library).
- CI and hooks are themselves the "tests" for the tooling: a deliberately
  broken commit (an `any`, a type error) must be rejected by the pre-commit
  hook. Verify manually once during this plan.
- Coverage config is validated by the fact that `test:coverage` reports numbers
  and fails below threshold — confirm by temporarily lowering a threshold.

## Acceptance criteria

- [ ] `npm run dev`, `npm run build`, `npm run preview` all work.
- [ ] `npm run typecheck` passes with the hardened config.
- [ ] `npm run lint` passes; introducing `any` fails it.
- [ ] `npm run test:coverage` runs, reports coverage, and fails under 80 %.
- [ ] `npm run verify` chains all three.
- [ ] Committing code that fails typecheck/lint is blocked by the pre-commit
      hook; pushing with failing tests/coverage is blocked by pre-push.
- [ ] CI workflow runs the same gates on PRs.
- [ ] `prd/` and `plans/` are untouched by the scaffold.
- [ ] `CLAUDE.md` exists and documents the above.
