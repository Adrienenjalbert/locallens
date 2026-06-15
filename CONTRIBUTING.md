# Contributing to LocalLens

Thanks for contributing! This guide keeps the codebase clean, the build green, and reviews fast.

## Local setup

```bash
npm install
cp .env.example .env          # FE‑safe values only — never commit a real .env
npm run dev
```

## Verification checklist (run before every push)

A change is ready when all three pass locally:

```bash
npm run typecheck             # tsc --noEmit
npm test                      # vitest — router + scoring suites
npm run build                 # static export; also runs next lint + type checks
```

The CI workflow (`.github/workflows/deploy-pages.yml`) runs the tests and build on every push to `main`, so green locally ≈ green in CI.

## Branching

- Branch off `main`: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`, `docs/<short-name>`.
- Keep pull requests small and focused on a single purpose.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add comparator tool JSON‑LD
fix: escape apostrophe in invoices page (unblocks static build)
chore: bump tailwind to 3.4.10
docs: clarify trust‑floor constraints in README
refactor: extract rail weighting from RevenueRouter
test: cover answer‑first constraint
```

Reference issues with `#<number>` where relevant.

## Code conventions

- **TypeScript everywhere.** No `any` unless unavoidable and commented.
- **Imports at the top of the file** — no inline imports.
- **Exhaustive switches** over unions/enums use a `never` default so new variants fail at compile time.
- **The trust floor is sacred.** Any change to `src/lib/revenue-router/constraints.ts` must come with tests proving the constraint still holds.
- **Secrets stay server‑side.** The front end only ever uses the Supabase anon key + public URL. Privileged keys live in Supabase Edge Function secrets.
- Format with `npm run format` (Prettier) before committing.

## Adding a vertical

Copy `config/verticals/gardeners.ts`, re‑tune the design tokens, score weights, and router policy, and register it in `config/index.ts`. No component changes should be required.

## Pull requests

- Fill in the PR template (summary + verification).
- Confirm the verification checklist passes.
- Keep the diff reviewable; explain any non‑obvious trade‑offs.
