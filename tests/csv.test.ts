import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseCSV, generateCSV, generateTemplate } from '../src/csv';
import { calcCrushDate, formatDisplayDate } from '../src/calc';
import type { ScheduleRow } from '../src/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    id: 'test-id',
    sample_label: 'Beam-01',
    casting_date: '2025-07-01',
    curing_duration: 28,
    curing_offset: 0,
    crush_date: '2025-07-29',
    ...overrides,
  };
}

// Arbitrary for a valid ScheduleRow (casting_date and crush_date are consistent)
const arbValidRow: fc.Arbitrary<ScheduleRow> = fc
  .record({
    id: fc.uuid(),
    sample_label: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && !s.includes(',') && s === s.trim()),
    casting_date: fc
      .date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') })
      .map(d => d.toISOString().slice(0, 10)),
    curing_duration: fc.integer({ min: 1, max: 365 }),
    curing_offset: fc.integer({ min: 0, max: 7 }),
  })
  .map(({ id, sample_label, casting_date, curing_duration, curing_offset }) => ({
    id,
    sample_label,
    casting_date,
    curing_duration,
    curing_offset,
    crush_date: calcCrushDate(casting_date, curing_duration, curing_offset),
  }));

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('generateTemplate', () => {
  it('has the correct header row', () => {
    const template = generateTemplate();
    const firstLine = template.split('\n')[0];
    expect(firstLine).toBe('sample_label,casting_date,curing_duration,curing_offset,crush_date');
  });

  it('has an example data row', () => {
    const template = generateTemplate();
    const lines = template.split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines[1]).toBe('Beam-01,16/03/2026,28,0,13/04/2026');
  });
});

describe('generateCSV', () => {
  it('produces DD/MM/YYYY dates in output', () => {
    const rows = [makeRow()];
    const csv = generateCSV(rows);
    expect(csv).toContain('01/07/2025'); // casting_date
    expect(csv).toContain('29/07/2025'); // crush_date
  });

  it('includes header row', () => {
    const csv = generateCSV([makeRow()]);
    expect(csv.startsWith('sample_label,casting_date,curing_duration,curing_offset,crush_date')).toBe(true);
  });

  it('produces one data row per ScheduleRow', () => {
    const rows = [makeRow({ id: '1' }), makeRow({ id: '2', sample_label: 'Beam-02' })];
    const csv = generateCSV(rows);
    const lines = csv.split('\n').filter(l => l.trim().length > 0);
    expect(lines).toHaveLength(3); // header + 2 data rows
  });
});

describe('parseCSV', () => {
  it('parses a valid CSV and returns added rows', () => {
    const csv = 'sample_label,casting_date,curing_duration,curing_offset,crush_date\nBeam-01,01/07/2025,28,0,29/07/2025';
    const result = parseCSV(csv);
    expect(result.added).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
    expect(result.added[0].sample_label).toBe('Beam-01');
    expect(result.added[0].casting_date).toBe('2025-07-01');
    expect(result.added[0].curing_duration).toBe(28);
    expect(result.added[0].curing_offset).toBe(0);
    expect(result.added[0].crush_date).toBe('2025-07-29');
  });

  it('skips row with missing label', () => {
    const csv = 'sample_label,casting_date,curing_duration,crush_date\n,01/07/2025,28,30/07/2025';
    const result = parseCSV(csv);
    expect(result.added).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].row).toBe(2);
    expect(result.skipped[0].reason).toMatch(/label/i);
  });

  it('skips row with invalid casting date', () => {
    const csv = 'sample_label,casting_date,curing_duration,crush_date\nBeam-01,not-a-date,28,30/07/2025';
    const result = parseCSV(csv);
    expect(result.added).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toMatch(/casting date/i);
  });

  it('skips row with non-positive curing duration', () => {
    const csv = 'sample_label,casting_date,curing_duration,crush_date\nBeam-01,01/07/2025,0,30/07/2025';
    const result = parseCSV(csv);
    expect(result.added).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toMatch(/curing duration/i);
  });

  it('skips row with non-integer curing duration', () => {
    const csv = 'sample_label,casting_date,curing_duration,crush_date\nBeam-01,01/07/2025,3.5,30/07/2025';
    const result = parseCSV(csv);
    expect(result.added).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
  });

  it('import summary counts match for mixed-validity CSV', () => {
    const csv = [
      'sample_label,casting_date,curing_duration,crush_date',
      'Beam-01,01/07/2025,28,30/07/2025',   // valid
      ',01/07/2025,28,30/07/2025',            // invalid: missing label
      'Beam-03,bad-date,28,30/07/2025',       // invalid: bad date
      'Beam-04,01/07/2025,28,30/07/2025',    // valid
    ].join('\n');
    const result = parseCSV(csv);
    expect(result.added).toHaveLength(2);
    expect(result.skipped).toHaveLength(2);
  });

  it('recalculates crush_date ignoring the CSV crush_date column', () => {
    // CSV has wrong crush_date — should be recalculated
    const csv = 'sample_label,casting_date,curing_duration,curing_offset,crush_date\nBeam-01,01/07/2025,28,0,01/01/2000';
    const result = parseCSV(csv);
    expect(result.added[0].crush_date).toBe('2025-07-29');
  });
});

// ---------------------------------------------------------------------------
// Property 11: CSV Round-Trip
// ---------------------------------------------------------------------------

// Feature: concrete-sample-crush-scheduler, Property 11: CSV Round-Trip
describe('Property 11: CSV Round-Trip', () => {
  it('generateCSV then parseCSV produces equivalent rows', () => {
    // Validates: Requirements 7.7, 8.3
    fc.assert(
      fc.property(fc.array(arbValidRow, { minLength: 1, maxLength: 20 }), (rows) => {
        const csv = generateCSV(rows);
        const result = parseCSV(csv);

        expect(result.skipped).toHaveLength(0);
        expect(result.added).toHaveLength(rows.length);

        for (let i = 0; i < rows.length; i++) {
          expect(result.added[i].sample_label).toBe(rows[i].sample_label);
          expect(result.added[i].casting_date).toBe(rows[i].casting_date);
          expect(result.added[i].curing_duration).toBe(rows[i].curing_duration);
          expect(result.added[i].crush_date).toBe(rows[i].crush_date);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: CSV Import Skips Invalid Rows
// ---------------------------------------------------------------------------

// Feature: concrete-sample-crush-scheduler, Property 12: CSV Import Skips Invalid Rows
describe('Property 12: CSV Import Skips Invalid Rows', () => {
  it('added.length + skipped.length === total data rows', () => {
    // Validates: Requirements 7.4, 7.5, 7.6

    // Arbitrary for a valid CSV data row string
    const arbValidDataRow = arbValidRow.map(row =>
      `${row.sample_label},${formatDisplayDate(row.casting_date)},${row.curing_duration},${row.curing_offset},${formatDisplayDate(row.crush_date)}`
    );

    // Arbitrary for an invalid CSV data row string
    const arbInvalidDataRow = fc.oneof(
      // Missing label
      fc.record({ date: fc.constant('01/01/2025'), dur: fc.integer({ min: 1, max: 28 }) })
        .map(({ date, dur }) => `,${date},${dur},01/02/2025`),
      // Invalid date
      fc.string({ minLength: 1, maxLength: 10 }).filter(s => !s.includes(',') && !s.match(/^\d{2}\/\d{2}\/\d{4}$/))
        .map(badDate => `Beam-X,${badDate},28,01/01/2025`),
      // Non-positive duration
      fc.integer({ min: -100, max: 0 })
        .map(dur => `Beam-X,01/01/2025,${dur},01/02/2025`),
      // Non-integer duration
      fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true, noDefaultInfinity: true })
        .filter(f => !Number.isInteger(f))
        .map(f => `Beam-X,01/01/2025,${f},01/02/2025`),
    );

    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            arbValidDataRow.map(r => ({ row: r, valid: true })),
            arbInvalidDataRow.map(r => ({ row: r, valid: false }))
          ),
          { minLength: 1, maxLength: 20 }
        ),
        (rowEntries) => {
          const header = 'sample_label,casting_date,curing_duration,curing_offset,crush_date';
          const dataRows = rowEntries.map(e => e.row);
          const csv = [header, ...dataRows].join('\n');

          const result = parseCSV(csv);
          expect(result.added.length + result.skipped.length).toBe(dataRows.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
