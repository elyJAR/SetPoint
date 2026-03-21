import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import type { ScheduleRow } from '../src/types';

// ---------------------------------------------------------------------------
// In-memory IndexedDB mock
// ---------------------------------------------------------------------------

function createIDBMock() {
  let store: Record<string, ScheduleRow> = {};

  const makeRequest = <T>(result: T) => {
    const req: any = { result, error: null, onsuccess: null, onerror: null };
    setTimeout(() => req.onsuccess?.({ target: req }), 0);
    return req;
  };

  const makeStore = () => ({
    clear: () => { store = {}; return makeRequest(undefined); },
    put: (row: ScheduleRow) => { store[row.id] = row; return makeRequest(undefined); },
    getAll: () => makeRequest(Object.values(store)),
  });

  const makeTx = () => {
    const tx: any = { oncomplete: null, onerror: null, error: null };
    tx.objectStore = () => makeStore();
    setTimeout(() => tx.oncomplete?.(), 0);
    return tx;
  };

  const db: any = {
    close: vi.fn(),
    objectStoreNames: { contains: () => true },
    transaction: (_: string, _mode: string) => makeTx(),
  };

  const openReq: any = { result: db, error: null, onsuccess: null, onerror: null, onupgradeneeded: null };
  setTimeout(() => openReq.onsuccess?.({ target: openReq }), 0);

  vi.stubGlobal('indexedDB', { open: () => openReq });

  return { reset: () => { store = {}; } };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    id: 'test-id',
    sample_label: 'Beam-01',
    casting_date: '2025-01-01',
    curing_duration: 28,
    curing_offset: 0,
    crush_date: '2025-01-29',
    ...overrides,
  };
}

const arbRow: fc.Arbitrary<ScheduleRow> = fc.record({
  id: fc.hexaString({ minLength: 4, maxLength: 16 }),
  sample_label: fc.string({ minLength: 1, maxLength: 50 }),
  casting_date: fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }).map(
    (d) => d.toISOString().slice(0, 10)
  ),
  curing_duration: fc.integer({ min: 1, max: 365 }),
  curing_offset: fc.integer({ min: 0, max: 7 }),
  crush_date: fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }).map(
    (d) => d.toISOString().slice(0, 10)
  ),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('IndexedDB storage', () => {
  beforeEach(() => {
    createIDBMock();
    localStorage.clear();
  });

  it('load() returns empty array when store is empty', async () => {
    const { load } = await import('../src/storage');
    const result = await load();
    expect(result).toEqual([]);
  });

  it('save() then load() round-trips a single row', async () => {
    const { save, load } = await import('../src/storage');
    const rows = [makeRow()];
    await save(rows);
    const result = await load();
    expect(result).toEqual(rows);
  });

  it('save() then load() round-trips multiple rows', async () => {
    const { save, load } = await import('../src/storage');
    const rows = [
      makeRow({ id: '1', sample_label: 'A', curing_duration: 7 }),
      makeRow({ id: '2', sample_label: 'B', curing_duration: 14 }),
      makeRow({ id: '3', sample_label: 'C', curing_duration: 28 }),
    ];
    await save(rows);
    const result = await load();
    expect(result).toEqual(rows);
  });

  it('save([]) then load() returns empty array', async () => {
    const { save, load } = await import('../src/storage');
    await save([]);
    const result = await load();
    expect(result).toEqual([]);
  });

  it('migrateFromLocalStorage() moves localStorage data into IndexedDB', async () => {
    const legacyRows = [makeRow({ id: 'legacy-1' })];
    localStorage.setItem('concrete_crush_schedule', JSON.stringify(legacyRows));

    const { migrateFromLocalStorage, load } = await import('../src/storage');
    await migrateFromLocalStorage();

    expect(localStorage.getItem('concrete_crush_schedule')).toBeNull();
    const result = await load();
    expect(result).toEqual(legacyRows);
  });

  it('migrateFromLocalStorage() does nothing when localStorage key is absent', async () => {
    const { migrateFromLocalStorage, load } = await import('../src/storage');
    await migrateFromLocalStorage();
    const result = await load();
    expect(result).toEqual([]);
  });
});

describe('Property: save/load round-trip', () => {
  beforeEach(() => {
    createIDBMock();
  });

  it('produces deeply equal schedule for any valid ScheduleRow array', async () => {
    const { save, load } = await import('../src/storage');
    await fc.assert(
      fc.asyncProperty(fc.array(arbRow, { minLength: 0, maxLength: 10 }), async (rows) => {
        await save(rows);
        const loaded = await load();
        expect(loaded).toEqual(rows);
      }),
      { numRuns: 50 }
    );
  });
});
