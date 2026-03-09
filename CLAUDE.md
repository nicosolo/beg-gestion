# BEG Facture

Fullstack invoicing monorepo: Hono API + Vue 3 SPA, Drizzle/SQLite, Bun, Docker Compose.

## Structure

- `apps/api/` — Backend (Hono, Drizzle ORM, JWT, Zod)
- `apps/app/` — Frontend (Vue 3, Vite, Pinia, Tailwind, i18n)
- `packages/` — Shared types, utils, validations
- `legacy/` / `export-mdb/` — Legacy Delphi app & Access DB exports

## Rules

- English only
- Do what's asked, nothing more
- Never create files unless necessary; prefer editing existing ones
- Never create docs/README unless explicitly asked
- **ALWAYS** use `docker compose exec [service] [command]` — never run `bun` directly on host
- Check services running with `docker compose ps` before exec
- **Always lint after modifying code** (runs on host, not Docker)
- **Always update/create unit tests when editing API code** (routes, repositories, tools, middleware)

## Commands

### Docker

```bash
docker compose up --watch          # start with hot reload
docker compose exec api bun run db:generate  # generate migrations
docker compose exec api bun run db:migrate   # run migrations
docker compose exec api bun run db:seed      # seed DB
```

### Testing

```bash
docker compose exec api bun test --timeout 30000                      # all API tests
docker compose exec api bun test src/routes/__tests__/user.test.ts    # specific file
docker compose exec api bun test activity                              # pattern match
```

Tests use in-memory SQLite with `mock.module` — see `src/__tests__/helpers/setup.ts`

### Linting & Type-checking (host)

```bash
bun run lint:api          # lint & fix API
bun run lint:app          # lint & fix frontend
bun run type-check:api    # type-check API
bun run type-check:app    # type-check frontend
```

## Services

- http://localhost:8084 — main entry (nginx proxy, app and API are proxied)
- http://localhost:8084/api/ — API (proxied to api:3000)

## DB

SQLite at `apps/api/data/db.sqlite`. Run migrations when changing schema. Update validation schemas in `packages/validations/`.

## Tasks

Create at `tasks/{YYYY-MM-DD}/{feature_name}.md`
