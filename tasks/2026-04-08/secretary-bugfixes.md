# Secretary & Thibaud bugfixes (2026-04-08)

Branch: `fix/secretary-bugfixes`

## URGENT

### 1. Unpaid expenses filter misses km-only entries
- **Status:** DONE
- **Files:** `activity.repository.ts` (buildFilterComponents)
- `includeNotDisbursed` / `includeDisbursed` now checks `(expenses > 0 OR kilometers > 0)`

### 2. Excel export by collaborator → unknown error
- **Status:** DONE
- **Files:** `routes/activity.ts`, `activity-exporter.ts`
- Added try-catch, removed stray console.log, sanitized sheet names, fallback for empty workbook

## NORMAL

### 3. Date resets when editing old activity (e.g. 2020)
- **Status:** DONE
- **Files:** `TimeEntryModal.vue` (minDate computed)
- When editing, uses activity's original date as min floor if older than 60 days

### 4. Quick action to set invoice status "envoyée"
- **Status:** DONE
- **Files:** `InvoiceListManager.vue`, `fr.ts`
- Added "Envoyée ✓" button for invoices with `vise` status in list view

### 5. Inline create client/company/engineer from mandate form
- **Status:** DONE
- **Files:** `ClientSelect.vue`, `CompanySelect.vue`, `EngineerSelect.vue`, `ProjectEditView.vue`
- Added "+" button next to dropdowns, opens existing edit modal, auto-selects created item

## PHASE 2

### 6. Delete confirmation doesn't prevent deletion
- **Status:** DONE
- **Files:** `TimeEntryModal.vue`
- Replaced native `confirm()` with ConfirmDialog component
