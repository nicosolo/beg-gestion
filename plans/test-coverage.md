# Plan: Test Coverage Setup

## Current State

- No test framework installed in either app or API
- No test files exist anywhere in the codebase
- `apps/app/tsconfig.node.json` already references `vitest.config.*` (scaffolded by Vue CLI but never set up)
- `apps/app/tsconfig.app.json` excludes `src/**/__tests__/*` (convention ready)

## Tasks

### 1. Setup Vitest for apps/app (Frontend)

#### Install deps
```bash
docker compose exec app bun add -d vitest @vue/test-utils happy-dom @vitest/coverage-v8
```

#### Create `apps/app/vitest.config.ts`
```ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    root: fileURLToPath(new URL('./', import.meta.url)),
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/**/__tests__/**', 'src/**/*.d.ts', 'src/main.ts', 'src/router/**']
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
```

#### Add scripts to `apps/app/package.json`
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

#### Starter test targets (priority order)
1. **Composables** (`src/composables/`) — pure logic, easy to test
2. **Utility functions** — if any in shared packages
3. **Atom components** (`src/components/atoms/`) — simple, isolated
4. **Store modules** (`src/stores/`) — Pinia stores with mocked API

### 2. Setup test framework for apps/api (API)

#### Install deps
```bash
docker compose exec api bun add -d vitest @vitest/coverage-v8
```

Bun has a built-in test runner, but Vitest gives unified tooling + coverage.

#### Create `apps/api/vitest.config.ts`
```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    root: fileURLToPath(new URL('./', import.meta.url)),
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/db/migrations/**', 'src/scripts/**']
    }
  },
  resolve: {
    alias: {
      '@src': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
```

#### Add scripts to `apps/api/package.json`
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

#### Starter test targets (priority order)
1. **Route handlers** — test with Hono's `app.request()` (no HTTP server needed)
2. **Validation schemas** — test Zod schemas in `@beg/validations`
3. **Auth middleware** — test JWT validation logic
4. **DB queries** — test with in-memory SQLite

### 3. Root orchestration

In root `package.json`:
```json
"test": "npm-run-all -p test:app test:api",
"test:app": "docker compose exec app bun run test",
"test:api": "docker compose exec api bun run test",
"test:coverage": "npm-run-all -p test:coverage:app test:coverage:api",
"test:coverage:app": "docker compose exec app bun run test:coverage",
"test:coverage:api": "docker compose exec api bun run test:coverage"
```

### 4. Add coverage to .gitignore

```
apps/app/coverage/
apps/api/coverage/
```

### 5. Write initial seed tests

Create at least 1 test per app to validate the setup:

- `apps/app/src/composables/__tests__/useApi.test.ts` — test a composable
- `apps/api/src/routes/__tests__/health.test.ts` — test a basic route

### 6. Update CLAUDE.md

Add testing instructions:
```
## Testing

- `docker compose exec app bun run test` — run frontend tests
- `docker compose exec api bun run test` — run API tests
- `docker compose exec [app|api] bun run test:coverage` — run with coverage report

Write tests for new features. Run tests before committing.
```

## Decisions / Open Questions

- Use Vitest for both or Bun's built-in test runner for API? (Vitest = unified DX + coverage)
- Coverage threshold targets? e.g. 60% for new code?
- Setup CI pipeline to run tests on PR? (separate plan)
- Test DB strategy for API: in-memory SQLite or test fixtures file?
- Install `@testing-library/vue` instead of / alongside `@vue/test-utils`?
