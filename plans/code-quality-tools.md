# Plan: Code Quality Tools Setup

## Current State

- **Frontend (apps/app)**: ESLint already configured (`eslint.config.ts`) with Vue + TS + Prettier. `vue-tsc` already runs as part of `bun run build`. No lint/check scripts defined in package.json.
- **API (apps/api)**: No ESLint config. No lint scripts. Has tsconfig but no type-check script.
- **Root**: No unified lint/check commands. No pre-commit hooks.
- **Packages**: `@beg/validations` — no lint/check setup.

## Tasks

### 1. Add lint & type-check scripts to apps/app/package.json

```json
"lint": "eslint . --fix",
"lint:check": "eslint .",
"type-check": "vue-tsc --build --force"
```

### 2. Setup ESLint for apps/api

- Install ESLint + `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser`
- Create `apps/api/eslint.config.ts`
- Add scripts:
  ```json
  "lint": "eslint . --fix",
  "lint:check": "eslint .",
  "type-check": "tsc --noEmit"
  ```

### 3. Add root-level orchestration scripts

In root `package.json`:
```json
"lint": "npm-run-all -p lint:app lint:api",
"lint:app": "docker compose exec app bun run lint:check",
"lint:api": "docker compose exec api bun run lint:check",
"type-check": "npm-run-all -p type-check:app type-check:api",
"type-check:app": "docker compose exec app bun run type-check",
"type-check:api": "docker compose exec api bun run type-check",
"check": "npm-run-all -p lint type-check"
```

### 4. Update CLAUDE.md

Add a section instructing to run lint + type-check after every task:
```
## Code Quality

After completing any code change:
- `docker compose exec app bun run lint` — lint frontend
- `docker compose exec api bun run lint` — lint API
- `docker compose exec app bun run type-check` — type-check frontend
- `docker compose exec api bun run type-check` — type-check API

Fix all errors before committing.
```

### 5. (Optional) Pre-commit hook with lint-staged

- Install `husky` + `lint-staged` at root
- Configure to run ESLint on staged `.ts`/`.vue` files
- Keeps bad code from entering git history

## Decisions / Open Questions

- Install `npm-run-all2` at root for parallel script orchestration? (already a dep in apps/app)
- Add Prettier check to API too, or just ESLint?
- Husky pre-commit hook: add now or later?
- Should we add `noUnusedLocals`/`noUnusedParameters` to tsconfigs? Currently disabled — enabling will surface many errors.
