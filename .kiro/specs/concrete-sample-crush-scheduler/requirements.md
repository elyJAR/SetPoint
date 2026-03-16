# Requirements Document

## Introduction

A web-based tool for structural engineering students and professionals to track concrete sample casting dates and automatically calculate crush (compression test) dates based on standard or custom curing durations. Users can input single or multiple samples in a batch (via form or CSV import), view upcoming crush schedules, and have their data persisted across sessions via localStorage. The schedule can be exported to PDF or CSV for reporting purposes.

## Glossary

- **Sample**: A concrete specimen cast on a specific date, identified by a label or ID
- **Casting_Date**: The date on which a concrete sample was poured and formed, displayed in DD/MM/YYYY format
- **Curing_Start_Date**: The date curing begins, which is Casting_Date + 1 calendar day (the day after casting)
- **Crush_Date**: The calculated date on which a sample should undergo a compression strength test, equal to Curing_Start_Date + Curing_Duration (i.e., Casting_Date + 1 + Curing_Duration), displayed in DD/MM/YYYY format
- **Curing_Duration**: The number of calendar days from Curing_Start_Date to Crush_Date (e.g., 7, 14, 28 days)
- **Schedule_Row**: A single row in the schedule table representing one Sample paired with one Curing_Duration and its corresponding Crush_Date
- **Batch**: A group of samples entered together in a single input session, either via form rows or CSV import
- **Scheduler**: The web application described in this document
- **Schedule**: The list of Schedule_Rows with their associated Casting_Dates and computed Crush_Dates
- **CSV**: Comma-separated values file format used for batch import and export

## Requirements

### Requirement 1: Sample Entry

**User Story:** As a structural engineering student, I want to input one or more concrete samples with their casting dates, so that I can track when each sample needs to be crushed.

#### Acceptance Criteria

1. THE Scheduler SHALL provide a form that accepts a sample label, a Casting_Date in DD/MM/YYYY format, and one or more Curing_Durations per sample entry.
2. WHEN a user submits a valid sample entry form, THE Scheduler SHALL add one Schedule_Row per selected Curing_Duration for that sample and display them in the Schedule table.
3. THE Scheduler SHALL provide an "Add Another Row" button that appends a new empty sample entry row to the form without reloading the page.
4. IF a user submits a sample entry with a missing label or missing Casting_Date, THEN THE Scheduler SHALL display a descriptive validation error and prevent the sample from being added.
5. IF a user submits a sample entry with a Casting_Date that is not a valid calendar date in DD/MM/YYYY format, THEN THE Scheduler SHALL display a descriptive validation error.

### Requirement 2: Curing Duration Configuration

**User Story:** As a structural engineering student, I want to select standard curing durations (7, 14, 28 days) or define a custom duration, so that I can match the crush schedule to my test plan.

#### Acceptance Criteria

1. THE Scheduler SHALL provide preset Curing_Duration options of 7, 14, and 28 days for selection during sample entry.
2. THE Scheduler SHALL allow a user to specify a custom Curing_Duration in whole days as an alternative to the preset options.
3. THE Scheduler SHALL allow a user to select multiple Curing_Durations for a single sample, generating one separate Schedule_Row per selected Curing_Duration.
4. IF a user enters a custom Curing_Duration that is not a positive integer, THEN THE Scheduler SHALL display a descriptive validation error and prevent the sample from being added.

### Requirement 3: Crush Date Calculation

**User Story:** As a structural engineering student, I want the application to automatically calculate crush dates from casting dates and curing durations, so that I don't have to compute them manually.

#### Acceptance Criteria

1. WHEN a sample is added to the Schedule, THE Scheduler SHALL calculate each Crush_Date as Casting_Date + 1 + Curing_Duration calendar days (where Curing_Start_Date is Casting_Date + 1, and Crush_Date is Curing_Start_Date + Curing_Duration).
2. THE Scheduler SHALL display each Casting_Date and Crush_Date in DD/MM/YYYY format.
3. WHEN a Casting_Date or Curing_Duration is updated for an existing sample, THE Scheduler SHALL recalculate and display the updated Crush_Date immediately.

### Requirement 4: Schedule Display

**User Story:** As a structural engineering student, I want to view all my samples and their crush dates in a clear table, so that I can plan my lab sessions.

#### Acceptance Criteria

1. THE Scheduler SHALL display all Schedule_Rows in a tabular view with columns for sample label, Casting_Date, Curing_Duration, and Crush_Date.
2. WHEN a sample has multiple Curing_Durations, THE Scheduler SHALL display each Curing_Duration as a separate row in the Schedule table, each with its own Crush_Date.
3. THE Scheduler SHALL visually distinguish Schedule_Rows whose Crush_Date is today from those whose Crush_Date is in the future or past.
4. THE Scheduler SHALL sort the Schedule by Crush_Date in ascending order by default.
5. WHEN the Schedule contains no Schedule_Rows, THE Scheduler SHALL display an empty-state message prompting the user to add a sample.

### Requirement 5: Data Persistence

**User Story:** As a structural engineering student, I want my sample schedule to be saved between browser sessions, so that I don't lose my data when I close the tab.

#### Acceptance Criteria

1. WHEN a sample is added, updated, or removed, THE Scheduler SHALL persist the current Schedule to localStorage.
2. WHEN the Scheduler is loaded in a browser, THE Scheduler SHALL restore the Schedule from localStorage if saved data exists.
3. IF localStorage data is corrupted or unreadable, THEN THE Scheduler SHALL discard the corrupted data, initialize an empty Schedule, and display a warning message to the user.

### Requirement 6: Sample Management

**User Story:** As a structural engineering student, I want to edit or delete samples from my schedule, so that I can correct mistakes or remove completed tests.

#### Acceptance Criteria

1. THE Scheduler SHALL provide an edit action for each Schedule_Row that allows the user to modify the sample label, Casting_Date, and Curing_Durations.
2. WHEN a user confirms an edit, THE Scheduler SHALL update the affected Schedule_Rows and recalculate all Crush_Dates for that sample.
3. THE Scheduler SHALL provide a delete action for each Schedule_Row in the Schedule.
4. WHEN a user triggers a delete action, THE Scheduler SHALL prompt the user for confirmation before removing the Schedule_Row from the Schedule.
5. WHEN a user confirms deletion, THE Scheduler SHALL remove the Schedule_Row from the Schedule and update the persisted localStorage data.

### Requirement 7: CSV Import

**User Story:** As a structural engineering student, I want to import multiple samples from a CSV file, so that I can quickly populate the schedule without entering each sample manually.

#### Acceptance Criteria

1. THE Scheduler SHALL provide a CSV import option that accepts a file with columns for sample label, Casting_Date (DD/MM/YYYY), and one or more Curing_Durations.
2. WHEN a valid CSV file is imported, THE Scheduler SHALL parse each row and add the corresponding Schedule_Rows to the Schedule.
3. THE Scheduler SHALL display a downloadable CSV template showing the required column structure so users can prepare their import file.
4. IF a CSV row contains a missing label, missing Casting_Date, or invalid Casting_Date format, THEN THE Scheduler SHALL skip that row, report the row number and reason in a validation summary, and continue processing remaining rows.
5. IF a CSV row contains a Curing_Duration that is not a positive integer, THEN THE Scheduler SHALL skip that row, report the row number and reason in a validation summary, and continue processing remaining rows.
6. WHEN CSV import completes, THE Scheduler SHALL display a summary showing the number of Schedule_Rows successfully added and the number of rows skipped.
7. FOR ALL valid CSV rows, parsing then re-exporting to CSV then re-importing SHALL produce an equivalent set of Schedule_Rows (round-trip property).

### Requirement 8: Export

**User Story:** As a structural engineering student, I want to export my crush schedule to PDF or CSV, so that I can share it with supervisors or print it for lab use.

#### Acceptance Criteria

1. THE Scheduler SHALL provide an export action that allows the user to download the current Schedule as a CSV file.
2. THE Scheduler SHALL provide an export action that allows the user to download the current Schedule as a PDF file.
3. WHEN a CSV export is triggered, THE Scheduler SHALL generate a CSV file containing all Schedule_Rows with columns for sample label, Casting_Date (DD/MM/YYYY), Curing_Duration, and Crush_Date (DD/MM/YYYY).
4. WHEN a PDF export is triggered, THE Scheduler SHALL generate a PDF file containing the Schedule table with all Schedule_Rows, formatted for print.
5. IF the Schedule contains no Schedule_Rows, THEN THE Scheduler SHALL disable the export actions and display a message indicating there is no data to export.
