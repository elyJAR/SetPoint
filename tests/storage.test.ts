import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import * as storage from '../src/storage';
import type { ScheduleRow } from '../src/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    id: 'test-id',
    sample_label: 'Beam-01',
    casting_date: '2025-01-01',
    curing_duration: 28,
    crush_date: '2025-01-30',
    ...overrides,
  };
}

// fast-check arbitrary for a valid ScheduleRow
const arbRow: fc.Arbitrary<ScheduleRow> = fc.record({
  id: fc.hexaString({ minLength: 4, maxLength: 16 }),
  sample_label: fc.string({ minLength: 1, maxLength: 50 }),
  casting_date: fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }).map(
    (d) => d.toISOString().slice(0, 10)
  ),
  curing_duration: fc.integer({ min: 1, max: 365 }),
  crush_date: fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }).map(
    (d) => d.toISOString().slice(0, 10)
  ),
});

// ---------------------------------------------------------------------------
// Reset localStorage before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('load() — missing key', () => {
  it('returns empty array when key is absent', () => {
    const result = storage.load();
    expect(result).toEqual([]);
  });

  it('does not set storageWarning when key is absent', () => {
    storage.load();
    expect(storage.storageWarning).toBeNull();
  });
});

describe('load() — bad JSON', () => {
  it('returns empty array for invalid JSON', () => {
    localStorage.setItem('concrete_crush_schedule', '{not valid json}');
    const result = storage.load();
    expect(result).toEqual([]);
  });

  it('sets storageWarning for invalid JSON', () => {
    localStorage.setItem('concrete_crush_schedule', '{not valid json}');
    storage.load();
    expect(storage.storageWarning).not.toBeNull();
    expect(typeof storage.storageWarning).toBe('string');
  });
});

describe('load() — non-array JSON', () => {
  it('returns empty array when stored value is a JSON object (not array)', () => {
    localStorage.setItem('concrete_crush_schedule', JSON.stringify({ foo: 'bar' }));
    const result = storage.load();
    expect(result).toEqual([]);
  });

  it('sets storageWarning when stored value is a JSON object', () => {
    localStorage.setItem('concrete_crush_schedule', JSON.stringify({ foo: 'bar' }));
    storage.load();
    expect(storage.storageWarning).not.toBeNull();
  });

  it('returns empty array when stored value is a JSON number', () => {
    localStorage.setItem('concrete_crush_schedule', '42');
    const result = storage.load();
    expect(result).toEqual([]);
  });

  it('sets storageWarning when stored value is a JSON number', () => {
    localStorage.setItem('concrete_crush_schedule', '42');
    storage.load();
    expect(storage.storageWarning).not.toBeNull();
  });

  it('returns empty array when stored value is a JSON string', () => {
    localStorage.setItem('concrete_crush_schedule', '"just a string"');
    const result = storage.load();
    expect(result).toEqual([]);
  });
});

describe('save() then load() round-trip', () => {
  it('returns deeply equal data for a single row', () => {
    const rows = [makeRow()];
    storage.save(rows);
    expect(storage.load()).toEqual(rows);
  });

  it('returns deeply equal data for multiple rows', () => {
    const rows = [
      makeRow({ id: '1', sample_label: 'A', curing_duration: 7 }),
      makeRow({ id: '2', sample_label: 'B', curing_duration: 14 }),
      makeRow({ id: '3', sample_label: 'C', curing_duration: 28 }),
    ];
    storage.save(rows);
    expect(storage.load()).toEqual(rows);
  });

  it('returns empty array after saving an empty array', () => {
    storage.save([]);
    expect(storage.load()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Property 8: localStorage Round-Trip
// ---------------------------------------------------------------------------

describe('Property 8: localStorage Round-Trip', () => {
  // Feature: concrete-sample-crush-scheduler, Property 8: localStorage Round-Trip
  it('save() then load() produces deeply equal schedule for any valid ScheduleRow array', () => {
    // Validates: Requirements 5.1, 5.2
    fc.assert(
      fc.property(fc.array(arbRow, { minLength: 0, maxLength: 20 }), (rows) => {
        localStorage.clear();
        storage.save(rows);
        const loaded = storage.load();
        expect(loaded).toEqual(rows);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Corrupted localStorage Handled Gracefully
// ---------------------------------------------------------------------------

describe('Property 9: Corrupted localStorage Handled Gracefully', () => {
  // Feature: concrete-sample-crush-scheduler, Property 9: Corrupted localStorage Handled Gracefully
  it('returns [] and sets storageWarning for any non-array JSON or invalid JSON string', () => {
    // Validates: Requirements 5.3

    // Arbitrary that produces strings that are either invalid JSON or valid JSON but not an array
    const arbCorruptedValue = fc.oneof(
      // Invalid JSON strings (filter to those that actually fail JSON.parse)
      fc.string({ minLength: 1 }).filter((s) => {
        try { JSON.parse(s); return false; } catch { return true; }
      }),
      // Valid JSON but not an array: objects, numbers, strings, booleans, null
      fc.record({ key: fc.string() }).map((v) => JSON.stringify(v)),
      fc.integer().map((v) => JSON.stringify(v)),
      fc.string().map((v) => JSON.stringify(v)),
      fc.boolean().map((v) => JSON.stringify(v)),
      fc.constant('null'),
    );

    fc.assert(
      fc.property(arbCorruptedValue, (corruptedValue) => {
        localStorage.clear();
        localStorage.setItem('concrete_crush_schedule', corruptedValue);

        let result: ScheduleRow[] = [];
        expect(() => { result = storage.load(); }).not.toThrow();
        expect(result).toEqual([]);
        expect(storage.storageWarning).not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Delete Removes Exactly One Row
// ---------------------------------------------------------------------------

describe('Property 10: Delete Removes Exactly One Row', () => {
  // Feature: concrete-sample-crush-scheduler, Property 10: Delete Removes Exactly One Row
  it('removing a row yields N-1 rows and the deleted row is absent after save/load', () => {
    // Validates: Requirements 6.5
    fc.assert(
      fc.property(
        fc.array(arbRow, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 19 }),
        (rows, rawIndex) => {
          // Ensure unique IDs so we can identify the deleted row
          const uniqueRows = rows.map((r, i) => ({ ...r, id: `id-${i}` }));
          const deleteIndex = rawIndex % uniqueRows.length;
          const deletedRow = uniqueRows[deleteIndex];

          const remaining = uniqueRows.filter((_, i) => i !== deleteIndex);

          localStorage.clear();
          storage.save(remaining);
          const loaded = storage.load();

          expect(loaded).toHaveLength(uniqueRows.length - 1);
          expect(loaded.find((r) => r.id === deletedRow.id)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
