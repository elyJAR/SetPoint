# Implementation Plan: Concrete Sample Crush Scheduler

## Overview

Build a TypeScript SPA using Vite that lets users track concrete sample casting dates and auto-calculate crush dates. Modules are implemented bottom-up (types → calc → storage → csv → pdf → ui → main → html), with tests co-located near each module.

## Tasks

- [x] 1. Project scaffolding
  - Create `package.json` with scripts (`dev`, `build`, `test`), dependencies (`jspdf`), and devDependencies (`typescript`, `vite`, `vitest`, `@vitest/coverage-v8`, `jsdom`, `fast-check`)
  - Create `tsconfig.json` with strict mode, ES2020 target, `moduleResolution: "bundler"`, and `lib: ["ES2020", "DOM"]`
  - Create `vite.config.ts` with `build.outDir: "dist"` and `test.environment: "jsdom"` and `test.globals: true`
  - Create empty placeholder files: `src/types.ts`, `src/calc.ts`, `src/storage.ts`, `src/csv.ts`, `src/pdf.ts`, `src/ui.ts`, `src/main.ts`, `index.html`
  - _Requirements: (infrastructure — enables all requirements)_

- [x] 2. Core types (`src/types.ts`)
  - [x] 2.1 Define `ScheduleRow` interface with fields: `id`, `sample_label`, `casting_date` (ISO), `curing_duration`, `crush_date` (ISO)
  - [x] 2.2 Define `RowStatus` type (`'past' | 'today' | 'future'`)
  - [x] 2.3 Define `ImportResult` interface with `added: ScheduleRow[]` and `skipped: Array<{ row: number; reason: string }>`
  - _Requirements: 1.1, 3.1, 4.1, 7.1_

- [x] 3. Crush date calculation module (`src/calc.ts`)
  - [x] 3.1 Implement `calcCrushDate(castingDateISO: string, curingDays: number): string` — returns ISO date `castingDate + 1 + curingDays` calendar days
  - [x] 3.2 Implement `parseDisplayDate(str: string): string | null` — parses DD/MM/YYYY to YYYY-MM-DD, returns `null` for invalid or non-existent dates (e.g. 31/02/2025, 29/02/2023)
  - [x] 3.3 Implement `formatDisplayDate(iso: string): string` — converts YYYY-MM-DD to DD/MM/YYYY
  - [x] 3.4 Implement `getRowStatus(crushDateISO: string): RowStatus` — compares crush date to today's ISO date string
  - _Requirements: 3.1, 3.2, 4.3_

  - [ ]* 3.5 Write property test for `calcCrushDate` (Property 1)
    - **Property 1: Crush Date Calculation Correctness**
    - Generate random ISO dates + positive integers; assert result is exactly `curingDays + 1` days after `castingDate`
    - Tag: `// Feature: concrete-sample-crush-scheduler, Property 1: Crush Date Calculation Correctness`
    - **Validates: Requirements 3.1**

  - [ ]* 3.6 Write property test for date display round-trip (Property 3)
    - **Property 3: Date Display Round-Trip**
    - Generate random valid ISO dates; assert `parseDisplayDate(formatDisplayDate(d)) === d`
    - Tag: `// Feature: concrete-sample-crush-scheduler, Property 3: Date Display Round-Trip`
    - **Validates: Requirements 3.2**

  - [ ]* 3.7 Write unit tests for `calcCrushDate` and `parseDisplayDate`
    - `calcCrushDate('2025-01-01', 28)` → `'2025-01-30'` (1 + 28 = 29 days after)
    - `parseDisplayDate` rejects `'32/01/2025'`, `'00/00/0000'`, `'2025-01-01'`, `'31/02/2025'`, `'29/02/2023'`
    - `parseDisplayDate` accepts `'29/02/2024'` (leap year)
    - _Requirements: 3.1, 3.2_

- [x] 4. localStorage module (`src/storage.ts`)
  - [x] 4.1 Implement `save(rows: ScheduleRow[]): void` — serializes to JSON and writes to `localStorage` key `concrete_crush_schedule`
  - [x] 4.2 Implement `load(): ScheduleRow[]` — reads and parses from localStorage; returns empty array and sets a `storageWarning` flag if data is missing, invalid JSON, or not an array of `ScheduleRow` objects
  - [x] 4.3 Export a `storageWarning: string | null` that `load()` sets when corruption is detected
  - _Requirements: 5.1, 5.2, 5.3_

  - [x]* 4.4 Write property test for localStorage round-trip (Property 8)
    - **Property 8: localStorage Round-Trip**
    - Generate random `ScheduleRow` arrays; call `save()` then `load()`; assert deep equality
    - Tag: `// Feature: concrete-sample-crush-scheduler, Property 8: localStorage Round-Trip`
    - **Validates: Requirements 5.1, 5.2**

  - [x]* 4.5 Write property test for corrupted localStorage handling (Property 9)
    - **Property 9: Corrupted localStorage Handled Gracefully**
    - Generate arbitrary strings and non-array JSON values; store in localStorage; call `load()`; assert returns `[]` without throwing and `storageWarning` is non-null
    - Tag: `// Feature: concrete-sample-crush-scheduler, Property 9: Corrupted localStorage Handled Gracefully`
    - **Validates: Requirements 5.3**

  - [x]* 4.6 Write property test for delete removes exactly one row (Property 10)
    - **Property 10: Delete Removes Exactly One Row**
    - Generate schedule with N rows; remove a random row; call `save()` then `load()`; assert N−1 rows remain and deleted row is absent
    - Tag: `// Feature: concrete-sample-crush-scheduler, Property 10: Delete Removes Exactly One Row`
    - **Validates: Requirements 6.5**

  - [x]* 4.7 Write unit tests for `storage.ts`
    - Corruption warning is set and empty array returned for bad JSON, non-array JSON, and missing key
    - _Requirements: 5.3_

- [x] 5. Checkpoint — ensure calc and storage tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. CSV module (`src/csv.ts`)
  - [x] 6.1 Implement `parseCSV(text: string): ImportResult` — parses CSV text with header `sample_label,casting_date,curing_duration,crush_date`; validates each row; skips invalid rows with reason; recalculates `crush_date` from `casting_date` + 1 + `curing_duration`
  - [x] 6.2 Implement `generateCSV(rows: ScheduleRow[]): string` — serializes rows to CSV with dates in DD/MM/YYYY format
  - [x] 6.3 Implement `generateTemplate(): string` — returns a CSV string with only the header row plus one example row
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.3_

  - [ ]* 6.4 Write property test for CSV round-trip (Property 11)
    - **Property 11: CSV Round-Trip**
    - Generate random valid `ScheduleRow` arrays; call `generateCSV()` then `parseCSV()`; assert `added` rows are equivalent (same label, casting date, curing duration, crush date)
    - Tag: `// Feature: concrete-sample-crush-scheduler, Property 11: CSV Round-Trip`
    - **Validates: Requirements 7.7, 8.3**

  - [ ]* 6.5 Write property test for CSV import skips invalid rows (Property 12)
    - **Property 12: CSV Import Skips Invalid Rows**
    - Generate CSV strings with random mix of valid and invalid rows; call `parseCSV()`; assert `added.length + skipped.length === total data rows` and only valid rows are in `added`
    - Tag: `// Feature: concrete-sample-crush-scheduler, Property 12: CSV Import Skips Invalid Rows`
    - **Validates: Requirements 7.4, 7.5, 7.6**

  - [ ]* 6.6 Write unit tests for `csv.ts`
    - Template download produces correct header row
    - Import summary counts match after mixed-validity CSV
    - `generateCSV` produces DD/MM/YYYY dates in output
    - _Requirements: 7.3, 7.6, 8.3_

- [x] 7. PDF module (`src/pdf.ts`)
  - [x] 7.1 Implement `generatePDF(rows: ScheduleRow[]): void` — uses jsPDF to build a table with columns (Sample Label, Casting Date, Curing Duration, Crush Date) and triggers browser download; wraps in try/catch and returns an error string on failure
  - _Requirements: 8.2, 8.4_

- [x] 8. UI rendering module (`src/ui.ts`)
  - [x] 8.1 Implement `renderTable(rows: ScheduleRow[], container: HTMLElement): void` — sorts rows ascending by `crush_date`, renders `<table>` with correct columns and action buttons; applies `row--past`, `row--today`, `row--future` CSS classes; shows empty-state message when `rows` is empty
  - [x] 8.2 Implement `renderFormRow(index: number): HTMLElement` — returns a form row element with label input, date input, duration checkboxes (7, 14, 28), custom duration input, and remove button
  - [x] 8.3 Implement `showBanner(message: string, type: 'error' | 'warning' | 'info', autoDismiss?: boolean): void` — renders a dismissible banner; auto-dismisses after 5 s when `autoDismiss` is true; persists for warnings
  - [x] 8.4 Implement `setExportButtonsDisabled(disabled: boolean): void` — enables/disables the Export CSV and Export PDF buttons
  - _Requirements: 1.3, 4.1, 4.3, 4.4, 4.5, 5.3, 8.5_

  - [ ]* 8.5 Write property test for schedule sorted ascending (Property 6)
    - **Property 6: Schedule Sorted Ascending by Crush Date**
    - Generate random `ScheduleRow` arrays; call `renderTable()`; query rendered rows; assert each adjacent pair satisfies `rows[i].crush_date ≤ rows[i+1].crush_date`
    - Tag: `// Feature: concrete-sample-crush-scheduler, Property 6: Schedule Sorted Ascending by Crush Date`
    - **Validates: Requirements 4.4**

  - [ ]* 8.6 Write property test for row status classification (Property 7)
    - **Property 7: Row Status Classification**
    - Generate rows with crush dates randomly before/on/after today; call `getRowStatus()`; assert correct class (`row--past`, `row--today`, `row--future`)
    - Tag: `// Feature: concrete-sample-crush-scheduler, Property 7: Row Status Classification`
    - **Validates: Requirements 4.3**

  - [ ]* 8.7 Write unit tests for `ui.ts`
    - Empty schedule renders empty-state message
    - Export buttons are disabled when schedule is empty
    - _Requirements: 4.5, 8.5_

- [x] 9. App entry point (`src/main.ts`)
  - [x] 9.1 Bootstrap state: call `storage.load()`, show warning banner if `storageWarning` is set, render initial table
  - [x] 9.2 Wire "Add Another Row" button to append a new `renderFormRow()` to the form
  - [x] 9.3 Wire form submit: validate all rows (label, date, durations), call `calcCrushDate` for each duration, build `ScheduleRow` objects, push to state, call `storage.save()`, re-render table
  - [x] 9.4 Wire edit action: populate inline edit form within the row; on confirm, update row, recalculate `crush_date`, call `storage.save()`, re-render
  - [x] 9.5 Wire delete action: show `confirm()` dialog; on confirm, remove row from state, call `storage.save()`, re-render
  - [x] 9.6 Wire "Export CSV" button: call `csv.generateCSV()`, create Blob, trigger `<a download>` click
  - [x] 9.7 Wire "Export PDF" button: call `pdf.generatePDF()`; show error toast on failure
  - [x] 9.8 Wire CSV file input: read file, call `csv.parseCSV()`, merge `added` rows into state, call `storage.save()`, re-render, show import summary banner
  - [x] 9.9 Wire "Download Template" link: call `csv.generateTemplate()`, trigger download
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.3, 5.1, 6.1, 6.2, 6.3, 6.4, 6.5, 7.2, 7.6, 8.1, 8.2_

  - [ ]* 9.10 Write property test for one ScheduleRow per curing duration (Property 2)
    - **Property 2: One ScheduleRow Per Curing Duration**
    - Generate random valid entries with 1–3 durations; simulate form submission logic; assert schedule grows by exactly N rows each with a distinct matching `curing_duration`
    - Tag: `// Feature: concrete-sample-crush-scheduler, Property 2: One ScheduleRow Per Curing Duration`
    - **Validates: Requirements 1.2, 2.3, 4.2**

  - [ ]* 9.11 Write property test for crush date recalculates after edit (Property 4)
    - **Property 4: Crush Date Recalculates After Edit**
    - Generate existing rows; apply random valid edits to `casting_date` and `curing_duration`; assert stored `crush_date` equals `calcCrushDate(new_casting_date, new_curing_duration)`
    - Tag: `// Feature: concrete-sample-crush-scheduler, Property 4: Crush Date Recalculates After Edit`
    - **Validates: Requirements 3.3, 6.2**

  - [ ]* 9.12 Write property test for invalid entries are rejected (Property 5)
    - **Property 5: Invalid Entries Are Rejected**
    - Generate invalid inputs (empty label, bad date strings, non-positive durations); run through validation logic; assert schedule remains unchanged and error is surfaced
    - Tag: `// Feature: concrete-sample-crush-scheduler, Property 5: Invalid Entries Are Rejected`
    - **Validates: Requirements 1.4, 1.5, 2.4**

- [x] 10. HTML shell (`index.html`)
  - [x] 10.1 Create `<head>` with title, charset, viewport meta, and inline CSS covering layout, table styles, form styles, status badge classes (`row--past`, `row--today`, `row--future`), banner styles, and disabled-button styles
  - [x] 10.2 Create header section with app title and Export CSV / Export PDF buttons (initially disabled)
  - [x] 10.3 Create entry form section with initial form row (rendered by `renderFormRow(0)`), "Add Another Row" button, and "Submit" button
  - [x] 10.4 Create import panel section with CSV file input, "Download Template" link, and import summary banner placeholder
  - [x] 10.5 Create schedule table section with `<div id="schedule-container">` (populated by `renderTable()`) and empty-state message placeholder
  - [x] 10.6 Add `<script type="module" src="/src/main.ts">` at end of `<body>`
  - _Requirements: 1.1, 1.3, 4.1, 4.5, 7.3, 8.1, 8.2, 8.5_

- [x] 11. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Dates are stored internally as ISO `YYYY-MM-DD` and formatted to `DD/MM/YYYY` only at display/export time
- Each property test must run a minimum of 100 iterations (`numRuns: 100`)
- Property tests must be tagged with `// Feature: concrete-sample-crush-scheduler, Property N: <text>`
- `crush_date` in imported CSV rows is ignored and always recalculated
