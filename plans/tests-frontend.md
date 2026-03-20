# Plan: Frontend Tests

## Structure

```
apps/app/src/
├── utils/__tests__/
│   ├── api-error.test.ts
│   ├── coordinates.test.ts
│   ├── date.test.ts
│   ├── debounce.test.ts
│   ├── text.test.ts
│   └── export.test.ts
├── composables/__tests__/
│   ├── useAlert.test.ts
│   ├── useActivityLock.test.ts
│   ├── useDateRangePresets.test.ts
│   ├── useFormat.test.ts
│   └── useUnsavedChanges.test.ts
├── composables/api/__tests__/
│   ├── useAPI.test.ts
│   └── useLogin.test.ts
├── stores/__tests__/
│   ├── auth.test.ts
│   └── appSettings.test.ts
├── components/atoms/__tests__/
│   ├── Button.test.ts
│   ├── Input.test.ts
│   ├── InputNumber.test.ts
│   ├── Select.test.ts
│   ├── Checkbox.test.ts
│   └── Badge.test.ts
├── components/molecules/__tests__/
│   ├── DataTable.test.ts
│   ├── Dialog.test.ts
│   ├── ConfirmDialog.test.ts
│   ├── FormField.test.ts
│   └── DateRange.test.ts
└── router/__tests__/
    └── guards.test.ts
```

---

## Phase 1: Utils (pure functions, zero deps)

### utils/__tests__/api-error.test.ts
- `new ApiError(response)` → parses code, statusCode, message, details
- `getLocalizedMessage(t)` → returns i18n key for known codes
- `getLocalizedMessage(t)` → returns detail message for unknown codes
- `is("NOT_FOUND")` → true, `is("OTHER")` → false
- `isAuthError()` → true for 401, UNAUTHORIZED, FORBIDDEN, TOKEN_EXPIRED, INVALID_CREDENTIALS
- `isAuthError()` → false for NOT_FOUND, VALIDATION_ERROR
- `parseApiError(response)` → parses JSON error body into ApiError

### utils/__tests__/coordinates.test.ts
- `convertWgs84ToLv95(46.9481, 7.4474)` → known Bern coordinates (~2600000, ~1200000)
- `convertWgs84ToLv95(null, null)` → null
- `convertLv95ToWgs84(2600000, 1200000)` → back to ~46.95, ~7.44
- Round-trip: WGS84 → LV95 → WGS84 ≈ original (within tolerance)
- `buildGeoAdminUrl()` → valid URL with correct params
- `buildGoogleMapsUrl()` → valid Google Maps URL

### utils/__tests__/date.test.ts
- `formatDate(new Date(2024,0,15))` → "15/01/2024" (fr-CH)
- `formatDateTime(date)` → includes HH:MM
- `toISOString(date)` → ISO format
- `parseDate("2024-01-15")` → correct Date object
- `formatRelativeDate(today)` → "Aujourd'hui"
- `formatRelativeDate(yesterday)` → "Hier"
- `formatRelativeDate(5 days ago)` → "Il y a 5 jours"

### utils/__tests__/debounce.test.ts
- `debounce(fn, 100)` → calls fn once after delay
- Multiple rapid calls → only last one executes
- `debounceAsync` → same behavior with promises

### utils/__tests__/text.test.ts
- `truncateText("hello world", 5)` → "hello..."
- `truncateText("hi", 10)` → "hi" (no truncation)

### utils/__tests__/export.test.ts
- `escapeCSV("hello, world")` → `"\"hello, world\""`
- `escapeCSV('say "hi"')` → `"\"say \"\"hi\"\"\""`
- `generateCSV(columns, data)` → valid CSV string with headers
- `getNestedValue({a:{b:1}}, "a.b")` → 1
- `formatDateForExport(date)` → ISO date
- `formatDurationForExport(90)` → "1:30"
- `formatCurrencyForExport(1234.5)` → "1234.50"

---

## Phase 2: Composables (business logic)

### composables/__tests__/useAlert.test.ts
- `addAlert({type: "success", message: "ok"})` → adds to alerts array
- Max 5 alerts → oldest removed when 6th added
- Auto-dismiss after timeout (fake timers)
- `removeAlert(id)` → removes specific alert
- `successAlert("msg")` / `errorAlert("msg")` → correct type

### composables/__tests__/useActivityLock.test.ts
- `isActivityLocked(recentDate, "user")` → false
- `isActivityLocked(oldDate, "user")` → true (>60 days)
- `isActivityLocked(oldDate, "admin")` → false (admin bypass)
- `canToggleBilled("admin")` → true
- `canToggleBilled("user")` → false (unless manager)
- `canEditActivity(activity, user)` → combines lock + role checks
- `canDeleteActivity(billedActivity, user)` → false

### composables/__tests__/useDateRangePresets.test.ts
- `getTodayRange()` → start/end of today
- `getWeekRange()` → Monday to Sunday
- `getMonthRange()` → 1st to last day of month
- `getYearRange()` → Jan 1 to Dec 31
- `shiftDayRange(range, 1)` → next day
- `shiftMonthRange(range, -1)` → previous month
- `detectPreset(todayRange)` → "today"
- `detectPreset(customRange)` → null
- `normaliseFromDate` / `normaliseToDate` → start/end of day

### composables/__tests__/useFormat.test.ts
- `formatCurrency(1234.56)` → "CHF 1'234.56" (de-CH)
- `formatCurrency(1234.56, false)` → "1'234.56"
- `formatPercentage(0.15)` → "15%"
- `formatDuration(2.5)` → "2.50"
- `formatDate(timestamp)` → fr-CH formatted
- `nl2br("a\nb")` → "a<br>b"
- `nl2br("<script>")` → escaped HTML

### composables/__tests__/useUnsavedChanges.test.ts
- `markDirty()` → `isDirty` = true, `hasUnsavedChanges` = true
- `markClean()` → `isDirty` = false
- Browser beforeunload → preventDefault when dirty

---

## Phase 3: API Composables

### composables/api/__tests__/useAPI.test.ts
- `useGet` → calls fetch with GET + auth headers
- `useGet` → sets loading=true during request, false after
- `useGet` → sets data on success
- `useGet` → sets error on failure, parses ApiError
- `usePost` → calls fetch with POST + JSON body
- Auth error (401) → triggers logout
- Network error → error state set

### composables/api/__tests__/useLogin.test.ts
- Successful login → returns token + user
- Failed login → returns error

---

## Phase 4: Pinia Stores

### stores/__tests__/auth.test.ts
- `login(email, pass)` → calls API, stores token in state + localStorage
- `login` failure → returns false, no token stored
- `logout()` → clears state + localStorage
- `getAuthHeaders()` → `{ Authorization: "Bearer <token>" }`
- `isRole("admin")` with admin user → true
- `isRole("admin")` with user role → false
- `isRole("super_admin")` with admin → false
- Hydration from localStorage on store init

### stores/__tests__/appSettings.test.ts
- Default basePath → "N:\\Mandats"
- `setBasePath("/custom")` → updates basePath + localStorage
- `resetToDefault()` → back to default
- `getAbsolutePath("subdir/file")` → joined path

---

## Phase 5: Atom Components

### components/atoms/__tests__/Button.test.ts
- Renders with label
- Click emits event
- Disabled state → no emit
- Loading state → shows spinner

### components/atoms/__tests__/Input.test.ts
- Renders with placeholder
- v-model updates on input
- Disabled state
- Error state styling

### components/atoms/__tests__/InputNumber.test.ts
- Renders with numeric value
- Input updates v-model
- Min/max constraints
- Step increments

### components/atoms/__tests__/Select.test.ts
- Renders options
- Selection emits update
- Placeholder shown when no value

### components/atoms/__tests__/Checkbox.test.ts
- Renders checked/unchecked
- Toggle emits update
- Disabled state

### components/atoms/__tests__/Badge.test.ts
- Renders with text
- Variant styling (colors)

---

## Phase 6: Molecule Components

### components/molecules/__tests__/DataTable.test.ts
- Renders columns and rows
- Click header → emits sort event
- Empty state message
- Loading state

### components/molecules/__tests__/Dialog.test.ts
- Opens when `modelValue` = true
- Closes on backdrop click
- Emits close event
- Renders slot content

### components/molecules/__tests__/ConfirmDialog.test.ts
- Shows message
- Confirm button → emits confirm
- Cancel button → emits cancel

### components/molecules/__tests__/FormField.test.ts
- Renders label
- Shows error message
- Required indicator

### components/molecules/__tests__/DateRange.test.ts
- Renders from/to date inputs
- Preset buttons change range
- Shift navigation (arrows)

---

## Phase 7: Router Guards

### router/__tests__/guards.test.ts
- Unauthenticated → redirect to /login
- Authenticated → allow navigation
- `requiresAdmin: true` + non-admin → redirect to /home
- `requiresAuth: false` → allow without auth
- `/login` when authenticated → allow (no redirect loop)

---

## Priority Order

1. **Phase 1** — Utils: pure functions, instant wins, no setup
2. **Phase 2** — Composables: core business logic (activityLock, dateRangePresets, format)
3. **Phase 4** — Stores: auth flow critical path
4. **Phase 3** — API composables: mock fetch, test error handling
5. **Phase 5** — Atom components: simple, reusable
6. **Phase 6** — Molecule components: more complex mounting
7. **Phase 7** — Router guards

## Open Questions

- Use `@testing-library/vue` or `@vue/test-utils`? (testing-library = more user-centric)
- Mock strategy for composables that depend on Pinia stores?
- i18n setup for tests — use real translations or mock `t()` function?
- Tauri-dependent composables (useTauri, useFileResolver) — skip or mock `window.__TAURI__`?
