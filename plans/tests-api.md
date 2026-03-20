# Plan: API Tests

## Structure

```
apps/api/src/
├── routes/__tests__/
│   ├── status.test.ts
│   ├── user.test.ts
│   ├── activity.test.ts
│   ├── activityType.test.ts
│   ├── project.test.ts
│   ├── client.test.ts
│   ├── company.test.ts
│   ├── engineer.test.ts
│   ├── invoice.test.ts
│   ├── location.test.ts
│   ├── rate.test.ts
│   ├── vatRate.test.ts
│   ├── monthlyHours.test.ts
│   ├── workload.test.ts
│   └── unbilled.test.ts
├── tools/__tests__/
│   ├── auth.test.ts
│   ├── auth-middleware.test.ts
│   ├── role-middleware.test.ts
│   ├── error-handler.test.ts
│   ├── file-utils.test.ts
│   └── response-validator.test.ts
├── services/__tests__/
│   └── file-storage.service.test.ts
└── db/repositories/__tests__/
    └── activity.repository.test.ts
```

---

## Phase 1: Tools & Utilities (pure functions, no DB)

### tools/__tests__/auth.test.ts
- `hashPassword` → returns bcrypt hash
- `comparePassword` → true for correct, false for wrong
- `generateToken` → returns valid JWT string
- `verifyToken` → decodes valid token, returns null for invalid/expired

### tools/__tests__/role-middleware.test.ts
- `hasRole("super_admin", "admin")` → true
- `hasRole("user", "admin")` → false
- `hasRole("admin", "admin")` → true
- `roleMiddleware("admin")` → 403 for user role, pass for admin

### tools/__tests__/error-handler.test.ts
- ApiException → correct status + JSON body
- ZodError → 400 + validation details
- Unknown error → 500 + generic message
- `throwNotFound` / `throwForbidden` / `throwValidationError` → correct codes

### tools/__tests__/file-utils.test.ts
- `normalizeStoredPath("foo\\bar\\baz")` → `"foo/bar/baz"`
- `fileBaseName("/path/to/file.pdf")` → `"file.pdf"`
- `guessMimeType("doc.pdf")` → `"application/pdf"`
- `guessMimeType("img.png")` → `"image/png"`
- `guessMimeType("unknown.xyz")` → `"application/octet-stream"`
- `matchesStoredPath` → exact match, basename fallback
- `pathIsWithin` → true/false for path containment, prevents traversal

### tools/__tests__/response-validator.test.ts
- Valid data → passes through
- Invalid data → throws RESPONSE_VALIDATION_ERROR

---

## Phase 2: Auth Middleware (mock DB)

### tools/__tests__/auth-middleware.test.ts
- No Authorization header → 401
- Invalid token → 401
- Valid token, user not in DB → 401
- Valid token, user exists → sets `c.var.user` and calls next
- `adminOnlyMiddleware` → 403 for user role, pass for admin

---

## Phase 3: Route Handlers (Hono `app.request()` + test DB)

Test strategy: use in-memory SQLite, seed minimal data per test suite.

### Helper: `createTestApp()`
- Fresh in-memory SQLite DB
- Run migrations
- Seed: 1 admin user, 1 regular user, generate JWT tokens
- Return `{ app, adminToken, userToken, db }`

### routes/__tests__/status.test.ts
- `GET /status/` → 200 + db status

### routes/__tests__/user.test.ts
- `POST /user/login` → valid creds → 200 + token
- `POST /user/login` → wrong password → 401
- `POST /user/login` → nonexistent email → 401
- `GET /user/` → no auth → 401
- `GET /user/` → with auth → list users
- `GET /user/:id` → returns user by id
- `POST /user/` → admin → creates user
- `POST /user/` → non-admin → 403
- `PUT /user/:id` → admin → updates user
- `PUT /user/:id` → non-admin → 403

### routes/__tests__/activity.test.ts
- `POST /activity/` → creates activity with valid data
- `POST /activity/` → invalid data → 400
- `POST /activity/` → date >60 days ago, non-admin → 403 (locked)
- `GET /activity/` → filters by date range
- `GET /activity/` → filters by billing status
- `GET /activity/` → non-admin sees only own/project activities
- `GET /activity/:id` → returns activity with relations
- `PUT /activity/:id` → updates activity
- `PUT /activity/:id` → locked activity → 403
- `PATCH /activity/bulk` → bulk update billed status
- `DELETE /activity/:id` → deletes activity
- `DELETE /activity/:id` → billed activity → error
- `GET /activity/my-stats` → returns monthly duration totals
- `GET /activity/orphaned` → returns activities where creator not in project

### routes/__tests__/activityType.test.ts
- CRUD operations (create, read, update, delete)
- Non-admin can't see adminOnly types
- Delete with existing activities → error
- `applyClassPresetsToUsers` → updates user rates

### routes/__tests__/project.test.ts
- `POST /project/` → creates project, creator auto-added as manager
- `GET /project/` → list with pagination + sorting
- `GET /project/` → text search filter
- `GET /project/:id` → returns project with nested relations
- `PUT /project/:id` → admin can update any
- `PUT /project/:id` → manager can update own
- `PUT /project/:id` → non-manager non-admin → 403
- `POST /project/:id/members/:userId` → adds member
- `GET /project/map` → returns projects with coordinates

### routes/__tests__/client.test.ts
- CRUD (admin only for create/update/delete)
- Delete with invoices/projects → error
- Filter by name, pagination

### routes/__tests__/company.test.ts
- CRUD (admin only for CUD)
- Delete with projects → error

### routes/__tests__/engineer.test.ts
- CRUD (admin only for CUD)
- Delete with projects → error

### routes/__tests__/invoice.test.ts
- `POST /invoice/` → creates invoice
- `GET /invoice/` → admin sees all, user sees own projects only
- `GET /invoice/:id` → returns full invoice with nested data
- `PUT /invoice/:id` → updates invoice
- `PUT /invoice/:id` → sent/visé invoice, non-admin → blocked
- `POST /invoice/:id/visa` → super_admin only
- `DELETE /invoice/:id` → deletes draft
- `DELETE /invoice/:id` → locked invoice → error

### routes/__tests__/location.test.ts
- CRUD (no auth required for GET)
- Delete with projects → error

### routes/__tests__/rate.test.ts
- CRUD (admin only)
- Duplicate class+year → error

### routes/__tests__/vatRate.test.ts
- CRUD (admin only)
- Duplicate year → error

### routes/__tests__/monthlyHours.test.ts
- CRUD (admin only)
- Duplicate year+month → error
- Filter by year/month

### routes/__tests__/workload.test.ts
- CRUD + bulk create (admin only)
- Filter by userId/year/month

### routes/__tests__/unbilled.test.ts
- `GET /unbilled/project/:id` → returns rate totals, km, expenses
- With period filters → filters activities

---

## Phase 4: Repositories

### db/repositories/__tests__/activity.repository.test.ts
- `updateProjectActivityDates` → recalculates correctly
- `accessControlCondition` → admin sees all, user sees own

---

## Phase 5: Services

### services/__tests__/file-storage.service.test.ts
- `storeFile` → writes to correct path
- `deleteFile` → removes file
- `resolveFilePath` → returns absolute path
- `serveFile` → returns response with correct MIME

---

## Priority Order

1. **Phase 1** — Pure function tests, no setup needed, fast
2. **Phase 2** — Auth middleware, mock DB
3. **Phase 3** — Route tests for `user` and `activity` (core features)
4. **Phase 3** — Route tests for `invoice` and `project` (complex logic)
5. **Phase 3** — Remaining CRUD routes (simpler, pattern-based)
6. **Phase 4-5** — Repositories and services

## Open Questions

- In-memory SQLite for tests or separate test DB file?
- Shared test helper for `createTestApp` — where to put? `src/__tests__/helpers/`?
- Mock file system for file-storage tests or use temp dirs?
- Snapshot testing for XLSX export output?
