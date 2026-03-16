# Design Document: Concrete Sample Crush Scheduler

## Overview

A TypeScript single-page web application built with **Vite** as the dev server and bundler. Users enter concrete sample casting dates, select curing durations, and the app automatically calculates crush (compression test) dates. Data persists in `localStorage`. The schedule can be exported to PDF (via jsPDF) or CSV, and batches of samples can be imported from CSV.

The project uses a proper TypeScript source layout compiled by Vite to a static bundle. jsPDF is installed as an npm package (no CDN dependency).

---

## Architecture

### Project Structure

```
concrete-sample-crush-scheduler/
├── index.html
├── src/
│   ├── main.ts          (app entry point — wires events, bootstraps state)
│   ├── types.ts         (ScheduleRow interface and shared types)
│   ├── calc.ts          (crush date calculation)
│   ├── storage.ts       (localStorage helpers)
│   ├── csv.ts           (CSV import/export)
│   ├── pdf.ts           (jsPDF wrapper)
│   └── ui.ts            (DOM rendering)
├── tests/
│   ├── calc.test.ts
│   ├── csv.test.ts
│   └── storage.test.ts
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Component Structure

```
index.html
├── <head>
│   └── Inline CSS (layout, table, form, status badges)
└── <body>
    ├── Header (title, export buttons)
    ├── EntryForm  (sample label, casting date, duration checkboxes + custom input, add-row btn)
    ├── ImportPanel (file input, template download link, import summary banner)
    ├── ScheduleTable (sortable table, empty-state message)
    └── Toast / Banner (validation errors, warnings, import summary)

<script type="module" src="/src/main.ts">
    main.ts      – app entry, event wiring, state bootstrap
    calc.ts      – crush date calculation
    storage.ts   – load/save/validate localStorage
    csv.ts       – parse and generate CSV
    pdf.ts       – generate PDF via jsPDF
    ui.ts        – render table, form rows, banners
```

### Data Flow

```
User Input ──► Validation ──► State Mutation ──► localStorage.setItem
                                    │
                                    ▼
                             Re-render Table
```

Import path:
```
File Input ──► CSV Parser ──► Row Validation ──► State Mutation ──► localStorage ──► Re-render
```

Export path:
```
State ──► CSV/PDF Generator ──► Blob ──► <a download> click
```

---

## Components and Interfaces

### EntryForm

Renders one or more form rows. Each row contains:
- Text input: `sample_label`
- Date input (text, DD/MM/YYYY): `casting_date`
- Checkboxes: `duration_7`, `duration_14`, `duration_28`
- Number input: `custom_duration` (optional, positive integer)
- Remove-row button (hidden when only one row exists)

"Add Another Row" appends a new blank row. "Submit" validates all rows and calls `addRows(rows)`.

### ScheduleTable

Reads from the in-memory state array and renders a `<table>` with columns:

| Sample Label | Casting Date | Curing Duration (days) | Crush Date | Actions |
|---|---|---|---|---|

Rows are sorted ascending by `crush_date`. Rows whose `crush_date` equals today receive a CSS class `row--today`. Past rows receive `row--past`. Future rows receive `row--future`.

Edit action opens an inline edit form within the row. Delete action shows a `confirm()` dialog.

### ImportPanel

- File `<input accept=".csv">` triggers CSV parse on change.
- "Download Template" is a static `<a>` that generates and downloads a template CSV.
- After import, a dismissible banner shows success/skip counts and per-row error details.

### ExportControls

Two buttons in the header: "Export CSV" and "Export PDF". Both are `disabled` when the schedule is empty.

### Toast / Banner

A fixed-position `<div>` that displays validation errors, localStorage corruption warnings, and import summaries. Auto-dismisses after 5 seconds for non-critical messages; persists until dismissed for warnings.

---

## Data Models

### ScheduleRow (TypeScript interface)

Defined in `src/types.ts`:

```ts
export interface ScheduleRow {
  id: string;              // crypto.randomUUID() or Date.now().toString() fallback
  sample_label: string;    // non-empty, trimmed
  casting_date: string;    // "YYYY-MM-DD" (ISO, stored internally)
  curing_duration: number; // positive integer (days)
  crush_date: string;      // "YYYY-MM-DD" (ISO, derived, stored for fast sort)
}

export type RowStatus = 'past' | 'today' | 'future';

export interface ImportResult {
  added: ScheduleRow[];
  skipped: Array<{ row: number; reason: string }>;
}
```

Dates are stored internally as ISO `YYYY-MM-DD` strings for reliable sorting and arithmetic. They are formatted to `DD/MM/YYYY` only at display and export time.

### localStorage Format

Key: `concrete_crush_schedule`

Value: JSON-serialized array of `ScheduleRow` objects.

```json
[
  {
    "id": "a1b2c3d4",
    "sample_label": "Beam-01",
    "casting_date": "2025-07-01",
    "curing_duration": 28,
    "crush_date": "2025-07-30"
  }
]
```

On load, the app calls `JSON.parse()` inside a `try/catch`. If parsing fails or the result is not an array, the app discards the data, initializes an empty array, and shows a warning banner.

### CSV Format

Import and export use the same column order:

```
sample_label,casting_date,curing_duration,crush_date
Beam-01,01/07/2025,28,30/07/2025
```

- `casting_date` and `crush_date` are in `DD/MM/YYYY` format in CSV (human-readable).
- `curing_duration` is a positive integer.
- The header row is always present.
- On import, `crush_date` is ignored (recalculated from `casting_date` + 1 + `curing_duration`).
- A single sample with multiple durations occupies multiple rows (one per duration).

### Crush Date Calculation

```
Crush_Date = Casting_Date + 1 + Curing_Duration  (calendar days)
```

Implementation in `src/calc.ts`:

```ts
export function calcCrushDate(castingDateISO: string, curingDays: number): string {
  const d = new Date(castingDateISO);
  d.setDate(d.getDate() + 1 + curingDays);
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}
```

`Date` arithmetic in JS/TS operates on UTC midnight when constructed from an ISO `YYYY-MM-DD` string, so there are no timezone-offset surprises for pure calendar-day addition.

### Date Parsing / Formatting Helpers

Defined in `src/calc.ts`:

```ts
// DD/MM/YYYY → YYYY-MM-DD (returns null if invalid)
export function parseDisplayDate(str: string): string | null { /* split, reorder, validate */ }

// YYYY-MM-DD → DD/MM/YYYY
export function formatDisplayDate(iso: string): string { /* split, reorder */ }
```

### Tooling Configuration

**`tsconfig.json`** (strict mode, targeting ES2020):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "lib": ["ES2020", "DOM"]
  },
  "include": ["src", "tests"]
}
```

**`vite.config.ts`**:
```ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: { outDir: 'dist' },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

**`package.json`** scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "jspdf": "^2.5.1"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.0.0",
    "vitest": "^1.6.0",
    "@vitest/coverage-v8": "^1.6.0",
    "jsdom": "^24.0.0",
    "fast-check": "^3.19.0"
  }
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Crush Date Calculation Correctness

*For any* valid ISO casting date string and any positive integer curing duration, `calcCrushDate(castingDate, curingDays)` must return a date that is exactly `curingDays + 1` calendar days after `castingDate`.

**Validates: Requirements 3.1**

---

### Property 2: One ScheduleRow Per Curing Duration

*For any* valid sample entry with N selected curing durations (N ≥ 1), submitting the entry must add exactly N new ScheduleRows to the schedule, each with a distinct `curing_duration` matching one of the selected values.

**Validates: Requirements 1.2, 2.3, 4.2**

---

### Property 3: Date Display Round-Trip

*For any* valid ISO date string `d`, `parseDisplayDate(formatDisplayDate(d))` must equal `d`. Equivalently, converting to DD/MM/YYYY and back must be an identity operation.

**Validates: Requirements 3.2**

---

### Property 4: Crush Date Recalculates After Edit

*For any* existing ScheduleRow, after editing its `casting_date` or `curing_duration` to any valid values, the stored and displayed `crush_date` must equal `calcCrushDate(new_casting_date, new_curing_duration)`.

**Validates: Requirements 3.3, 6.2**

---

### Property 5: Invalid Entries Are Rejected

*For any* form submission where the sample label is empty/whitespace, the casting date is missing or not a valid DD/MM/YYYY calendar date, or the curing duration is not a positive integer, the schedule must remain unchanged (no rows added) and a validation error must be surfaced.

**Validates: Requirements 1.4, 1.5, 2.4**

---

### Property 6: Schedule Sorted Ascending by Crush Date

*For any* schedule state with two or more rows, the rendered row order must satisfy: for every adjacent pair of rows i and i+1, `rows[i].crush_date ≤ rows[i+1].crush_date`.

**Validates: Requirements 4.4**

---

### Property 7: Row Status Classification

*For any* ScheduleRow, the CSS status class applied must match the relationship between `crush_date` and today's date: `row--past` if `crush_date < today`, `row--today` if `crush_date === today`, `row--future` if `crush_date > today`.

**Validates: Requirements 4.3**

---

### Property 8: localStorage Round-Trip

*For any* sequence of add/update/delete mutations, saving the schedule to localStorage and then loading it back must produce a schedule that is deeply equal to the in-memory state before the save.

**Validates: Requirements 5.1, 5.2**

---

### Property 9: Corrupted localStorage Handled Gracefully

*For any* string stored in the `concrete_crush_schedule` localStorage key that is not valid JSON or does not deserialize to an array of ScheduleRow objects, loading the app must result in an empty schedule and a visible warning message — never a crash or partial state.

**Validates: Requirements 5.3**

---

### Property 10: Delete Removes Exactly One Row

*For any* schedule with N rows, confirming deletion of a specific row must result in a schedule of N−1 rows that does not contain the deleted row, and localStorage must reflect the updated schedule.

**Validates: Requirements 6.5**

---

### Property 11: CSV Round-Trip

*For any* non-empty array of valid ScheduleRows, exporting to CSV and then re-importing that CSV must produce a set of ScheduleRows that is equivalent to the original (same labels, casting dates, curing durations, and derived crush dates).

**Validates: Requirements 7.7, 8.3**

---

### Property 12: CSV Import Skips Invalid Rows

*For any* CSV file containing a mix of valid and invalid rows (missing label, invalid date, non-positive-integer duration), the import must add exactly the valid rows to the schedule, skip all invalid rows, and report a skip count equal to the number of invalid rows.

**Validates: Requirements 7.4, 7.5, 7.6**

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Missing label or casting date on form submit | Show inline validation message; block submission |
| Invalid DD/MM/YYYY date (e.g., 31/02/2025) | Show inline validation message; block submission |
| Custom duration not a positive integer | Show inline validation message; block submission |
| localStorage parse failure | Discard data, init empty schedule, show persistent warning banner |
| CSV row with missing/invalid fields | Skip row, accumulate error detail, show summary after import |
| Export triggered on empty schedule | Export buttons are `disabled`; no file generated |
| jsPDF failure | PDF button shows error toast; CSV export still works |

All user-facing error messages are descriptive (include field name and reason), never expose raw JS/TS errors, and are dismissible.

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:

- **Unit tests** cover specific examples, integration points, and edge cases.
- **Property tests** verify universal correctness across randomized inputs.

### Tooling

| Tool | Purpose |
|---|---|
| **Vitest** | Test runner — native Vite/TypeScript integration, no config overhead |
| **fast-check** | Property-based testing library (npm package, full TypeScript support) |
| **jsdom** | DOM environment for Vitest (configured via `vite.config.ts`) |

Run tests with:
```
npm test          # vitest run (single pass, CI-friendly)
```

Each property test runs a minimum of **100 iterations** (`numRuns: 100` in fast-check options).

Each property test must be tagged with a comment in this format:
```ts
// Feature: concrete-sample-crush-scheduler, Property N: <property_text>
```

### Property Tests (one test per property, in `tests/`)

| Property | File | Test Description |
|---|---|---|
| P1 | `calc.test.ts` | Generate random ISO dates + positive integers; assert crush date offset is exactly `n+1` days |
| P2 | `calc.test.ts` | Generate random valid entries with 1–3 durations; assert schedule grows by exactly N |
| P3 | `calc.test.ts` | Generate random ISO dates; assert `parseDisplayDate(formatDisplayDate(d)) === d` |
| P4 | `calc.test.ts` | Generate random rows; edit with random valid values; assert crush_date equals recalculated value |
| P5 | `calc.test.ts` | Generate invalid inputs (empty label, bad date strings, non-positive durations); assert schedule unchanged |
| P6 | `calc.test.ts` | Generate random schedule arrays; assert rendered order is non-decreasing by crush_date |
| P7 | `calc.test.ts` | Generate rows with crush_dates randomly before/on/after today; assert correct CSS class |
| P8 | `storage.test.ts` | Generate random schedule arrays; serialize to localStorage string; parse back; assert deep equality |
| P9 | `storage.test.ts` | Generate arbitrary strings and non-array JSON; assert app initializes empty without throwing |
| P10 | `storage.test.ts` | Generate schedule with N rows; delete random row; assert N−1 rows remain and deleted row is absent |
| P11 | `csv.test.ts` | Generate random valid ScheduleRow arrays; export CSV; re-import; assert equivalent rows |
| P12 | `csv.test.ts` | Generate CSV strings with random mix of valid/invalid rows; assert added + skipped = total rows |

### Unit Tests

- `calcCrushDate` with known dates (e.g., 01/01/2025 + 28 days = 30/01/2025, accounting for +1 curing start)
- `parseDisplayDate` rejects invalid dates: `32/01/2025`, `00/00/0000`, `2025-01-01` (wrong format)
- `parseDisplayDate` rejects non-existent dates: `31/02/2025`, `29/02/2023` (non-leap year)
- Empty schedule renders empty-state message
- Export buttons are disabled when schedule is empty
- CSV template download produces a file with the correct header row
- Import summary banner shows correct counts after a mixed-validity CSV import
- localStorage corruption warning is shown and schedule is empty after bad data
