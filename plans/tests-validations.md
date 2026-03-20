# Plan: Validation Package Tests

## Structure

```
packages/validations/
└── __tests__/
    ├── base.test.ts
    ├── pagination.test.ts
    ├── errors.test.ts
    ├── user.test.ts
    ├── activity.test.ts
    ├── activityTypes.test.ts
    ├── invoice.test.ts
    ├── project.test.ts
    ├── projectMap.test.ts
    ├── location.test.ts
    ├── rate.test.ts
    ├── vatRate.test.ts
    ├── monthlyHours.test.ts
    ├── workload.test.ts
    ├── client.test.ts
    ├── company.test.ts
    ├── engineer.test.ts
    └── unbilled.test.ts
```

Setup: install vitest in packages/validations (or run from root).

---

## Tests

### base.test.ts
- `dateSchema` → coerces string to Date, rejects invalid
- `nullableDateSchema` → accepts null, undefined, valid date
- `booleanSchema` → true/"true"/false/"false"/""→false
- `idParamSchema` → accepts positive int, rejects 0, negative, string
- `classSchema` → accepts "A"-"G", "R", "Z", rejects "H", "X"
- `collaboratorTypeSchema` → accepts all 6 types, rejects unknown
- `classPresetsSchema` → validates mapping of collaboratorType → nullable class
- `successSchema` → { success: true } ok, missing field → error
- `timestampsSchema` → accepts valid dates

### pagination.test.ts
- Default values: page=1, limit=20
- Custom values pass through
- `createPageResponseSchema(z.string())` → validates { data: string[], ...pagination }
- Coercion: page="2" → 2

### errors.test.ts
- `errorCodeSchema` → accepts all 22 codes, rejects unknown
- `apiErrorResponseSchema` → validates full error structure
- `createApiError("NOT_FOUND", "msg")` → correct shape
- `createApiError` with details → includes validationErrorDetails

### user.test.ts
- `loginSchema` → email min 2, password min 2
- `userCreateSchema` → email format, password min 6, role defaults to "user"
- `userUpdateSchema` → all fields optional
- `userResponseSchema` → validates id, email, names, role
- `loginResponseSchema` → token + nested user
- `userFilterSchema` → active boolean coercion

### activity.test.ts
- `activityCreateSchema` → requires projectId, activityTypeId, date, duration
- `activityFilterSchema` → complex: sortBy options, billing status, date range, disbursement
- `activityBulkUpdateSchema` → ids array + partial updates
- `activityResponseSchema` → nested user, project, activityType objects
- `activityListResponse` → paginated + totals (duration, km, expenses)
- `userMonthlyStatsFilterSchema` → year 2000-2100
- `orphanedActivityGroupSchema` → validates nested structure

### activityTypes.test.ts
- `activityTypeCreateSchema` → name required, classPresets optional
- `activityTypeResponseSchema` → validates full response

### invoice.test.ts (most complex)
- `InvoiceTypeEnum` → 4 valid types
- `BillingModeEnum` → 4 valid modes
- `InvoiceStatusEnum` → draft/controle/vise/sent
- `RateItemSchema` → rateClass, base, adjusted, hourlyRate, amount
- `OfferSchema` / `AdjudicationSchema` / `SituationSchema` / `DocumentSchema` → file + optional fields
- `invoiceCreateSchema` → validates all 80+ fields with defaults
- `invoiceUpdateSchema` → all optional
- `invoiceResponseSchema` → nested user objects (visaByUser, inChargeUser, project.client)
- `invoiceFilterSchema` → sortBy options, status filter, date range
- `createEmptyInvoice({})` → returns valid defaults for all fields

### project.test.ts
- `projectFilterSchema` → text search, referentUserId, projectTypeIds parsing (string→array)
- `projectCreateSchema` → managers/members arrays
- `projectResponseSchema` → nested location, client, engineer, company, types, managers, members
- `projectStatusEnum` → offer/draft/active
- `projectTypeCreateSchema` → name min 1

### projectMap.test.ts
- `projectMapFilterSchema` → bounds (minLat, maxLat, minLng, maxLng)
- `projectMapItemResponseSchema` → lightweight marker data

### location.test.ts
- `COUNTRIES` → 4 entries
- `SWISS_CANTONS` → 26 entries
- `locationCreateSchema` → name required, country/canton optional
- `locationFilterSchema` → country/canton enum filters

### rate.test.ts
- `rateClassCreateSchema` → class enum, year 1990-2100, amount ≥ 0
- Duplicate class+year handled at DB level (not schema)

### vatRate.test.ts
- `vatRateCreateSchema` → year 2000-2100, rate 0-100
- Boundary: year=1999 → error, year=2101 → error
- Boundary: rate=-1 → error, rate=101 → error

### monthlyHours.test.ts
- `monthlyHoursCreateSchema` → year 2000-2100, month 1-12, amountOfHours > 0
- Custom error messages present
- Boundary: month=0 → error, month=13 → error

### workload.test.ts
- `workloadCreateSchema` → year 1900-2100, month 1-12, workload 0-100
- Boundary: workload=-1 → error, workload=101 → error

### client.test.ts / company.test.ts / engineer.test.ts
- Create: name min 1 char
- Update: all optional
- Filter: name search, sortBy options, pagination

### unbilled.test.ts
- `UnbilledActivitiesResponseSchema` → rates array, totals, activityIds
- `unbilledQuerySchema` → optional periodStart/periodEnd
- `unbilledParamsSchema` → requires projectId

---

## Priority Order

1. **base.test.ts + pagination.test.ts + errors.test.ts** — foundational schemas used everywhere
2. **user.test.ts** — auth flow
3. **activity.test.ts** — most used feature, complex filters
4. **invoice.test.ts** — most complex schema
5. **project.test.ts + projectMap.test.ts** — complex filters + nested response
6. **Remaining entity schemas** — pattern-based, fast to write

## Open Questions

- Run validation tests from root or add vitest to packages/validations?
- Test the Zod error messages themselves or just pass/fail?
