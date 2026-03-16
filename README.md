# SetPoint — Concrete Sample Crush Scheduler

> A browser-based scheduling tool for tracking concrete sample curing periods and crush dates, built for structural engineering laboratory work.

---

## Table of Contents

- [Overview](#overview)
- [Background](#background)
- [Features](#features)
- [Crush Date Formula](#crush-date-formula)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
- [CSV Import & Export](#csv-import--export)
- [PDF Export](#pdf-export)
- [Data Persistence](#data-persistence)
- [Running Tests](#running-tests)
- [Contributing](#contributing)

---

## Overview

**SetPoint** is a lightweight, zero-dependency web application designed to help structural engineering researchers and laboratory technicians manage the curing and crushing schedule of concrete samples. Given a casting date and one or more curing durations, SetPoint automatically calculates the correct crush date for each sample and presents a live countdown to the next scheduled crushing event.

All data is stored locally in the browser — no server, no account, no internet connection required after the initial page load.

---

## Background

In concrete testing, cylindrical or cuboid samples are cast on a specific date and must be crushed (compression-tested) after a defined curing period. The curing period begins the day after casting, meaning:

- A sample cast on **16 March 2026** with a **28-day** curing period must be crushed on **14 April 2026**.

Managing multiple samples across multiple curing durations manually is error-prone. SetPoint automates this calculation and keeps the entire schedule visible at a glance.

---

## Features

- **Multi-duration scheduling** — select any combination of 7, 14, 21, 28, 56, and 90-day curing periods per sample; each generates a separate row in the schedule
- **Live countdown** — a prominent card at the top of the page shows a real-time countdown (in years, months, and days) to the next upcoming crush date, including the full date and sample names
- **Colour-coded schedule table** — rows are highlighted green (today), red (overdue), or white (upcoming), with a "Days Left" column showing the exact remaining time
- **Inline editing** — edit any sample's label, casting date, or curing duration directly in the table without leaving the page
- **CSV import** — bulk-import samples from a CSV file; invalid rows are skipped with detailed error reporting
- **CSV export** — export the full schedule to a CSV file for use in Excel or other tools
- **PDF export** — generate a formatted PDF report of the crush schedule via jsPDF
- **CSV template download** — download a pre-formatted template to fill in and re-import
- **localStorage persistence** — the schedule survives page refreshes and browser restarts automatically

---

## Crush Date Formula

```
Crush Date = Casting Date + 1 day + Curing Duration (days)
```

The `+1` accounts for the fact that curing begins the day after casting. For example:

| Casting Date | Curing Duration | Crush Date       |
|--------------|-----------------|------------------|
| 16/03/2026   | 7 days          | 24/03/2026       |
| 16/03/2026   | 28 days         | 14/04/2026       |
| 16/03/2026   | 90 days         | 15/06/2026       |

Dates are stored internally as ISO `YYYY-MM-DD` strings and displayed in `DD/MM/YYYY` format throughout the UI.

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| [TypeScript 5](https://www.typescriptlang.org/) | Type-safe application logic |
| [Vite 5](https://vitejs.dev/) | Development server and production bundler |
| [jsPDF](https://github.com/parallax/jsPDF) | Client-side PDF generation |
| [Vitest](https://vitest.dev/) | Unit test runner |
| [fast-check](https://fast-check.io/) | Property-based testing |
| [jsdom](https://github.com/jsdom/jsdom) | DOM simulation for tests |

No UI framework is used. The entire interface is built with vanilla TypeScript and DOM APIs.

---

## Project Structure

```
SetPoint/
├── index.html              # App shell, inline CSS, HTML structure
├── src/
│   ├── main.ts             # Entry point, event wiring, app state
│   ├── types.ts            # TypeScript interfaces (ScheduleRow, etc.)
│   ├── calc.ts             # Date calculation and formatting logic
│   ├── ui.ts               # DOM rendering functions
│   ├── storage.ts          # localStorage read/write
│   ├── csv.ts              # CSV import/export/template generation
│   └── pdf.ts              # PDF export via jsPDF
├── tests/
│   ├── calc.test.ts        # Unit + property-based tests for calc logic
│   ├── csv.test.ts         # CSV parsing and generation tests
│   └── storage.test.ts     # localStorage persistence tests
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/elyJAR/SetPoint.git
cd SetPoint

# Install dependencies
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
```

Output is placed in the `dist/` folder. The build is fully static and can be served from any web server or file host (e.g. GitHub Pages, Netlify, Vercel).

---

## Usage Guide

### Adding Samples

1. Enter a **sample label** (e.g. `Beam-01`, `Cylinder-A3`) in the label field.
2. Enter the **casting date** in `DD/MM/YYYY` format.
3. Check one or more **curing duration** checkboxes (7d, 14d, 21d, 28d, 56d, 90d).
4. Click **Submit**. One row is added to the schedule for each selected duration.
5. To add multiple samples at once, click **+ Add Another Row** before submitting.

### Reading the Schedule

The schedule table is sorted by crush date (soonest first) and colour-coded:

| Colour | Meaning |
|--------|---------|
| Green background | Crush date is today |
| Red background | Crush date has passed (overdue) |
| White background | Crush date is in the future |

The **Days Left** column shows:
- `5d` — days remaining
- `Today` — crush is today
- `3d overdue` — past the crush date

### Editing a Row

Click the **Edit** button on any row to open an inline edit form. Update the label, casting date, or curing duration, then click **Confirm**. The crush date recalculates automatically.

### Deleting a Row

Click **Delete** on any row. A confirmation prompt will appear before the row is removed.

### Next Crush Countdown

The blue card at the top of the page shows a live countdown to the nearest upcoming crush date, broken down into years, months, and days. It also shows the full date (e.g. *Saturday, 21st March, 2026*) and the names of all samples due on that date.

---

## CSV Import & Export

### Import

Click **Import CSV** and select a `.csv` file. The expected format is:

```
sample_label,casting_date,curing_duration
Beam-01,16/03/2026,28
Beam-01,16/03/2026,7
Cylinder-A,01/03/2026,14
```

- `casting_date` must be in `DD/MM/YYYY` format
- `curing_duration` must be a positive integer
- Rows with invalid data are skipped; a summary banner reports how many rows were added and how many were skipped, with reasons

### Export

Click **Export CSV** to download the current schedule as a `.csv` file.

### Template

Click **Download Template** to get a blank CSV with the correct headers pre-filled, ready to populate and import.

---

## PDF Export

Click **Export PDF** to generate and download a formatted PDF of the current crush schedule. The PDF is generated entirely in the browser using jsPDF — no server call is made.

---

## Data Persistence

All schedule data is saved to `localStorage` under the key `setpoint_schedule` automatically after every change (add, edit, delete, import). The data persists across page refreshes and browser restarts on the same device and browser.

No data is ever sent to a server.

---

## Running Tests

```bash
npm test
```

The test suite covers:

- **Crush date calculation** — including edge cases (month boundaries, leap years, year rollovers)
- **Date parsing and formatting** — valid and invalid DD/MM/YYYY inputs
- **Row status logic** — past, today, future classification
- **CSV parsing** — valid rows, malformed rows, missing fields, duplicate handling
- **CSV generation** — round-trip fidelity
- **localStorage persistence** — save, load, and corruption handling
- **Property-based tests** — using fast-check to verify invariants across thousands of randomly generated inputs

---

## Contributing

This project was built as part of a Masters in Structural Engineering research programme. Contributions, suggestions, and bug reports are welcome via [GitHub Issues](https://github.com/elyJAR/SetPoint/issues).

---

*Built with TypeScript + Vite. No frameworks. No cloud. Just concrete.*
