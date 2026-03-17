import { ScheduleRow } from './types';

const DB_NAME = 'setpoint_db';
const DB_VERSION = 1;
const STORE_NAME = 'schedule';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Saves all rows to IndexedDB, replacing the entire store.
 */
export async function save(rows: ScheduleRow[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    for (const row of rows) {
      store.put(row);
    }
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/**
 * Loads all rows from IndexedDB, sorted by crush_date ascending.
 */
export async function load(): Promise<ScheduleRow[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      resolve(req.result as ScheduleRow[]);
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/**
 * Migrates any existing localStorage data into IndexedDB, then clears localStorage.
 * Safe to call on every startup — does nothing if localStorage key is absent.
 */
export async function migrateFromLocalStorage(): Promise<void> {
  const LEGACY_KEY = 'concrete_crush_schedule';
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return;

  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { parsed = null; }

  if (Array.isArray(parsed) && parsed.length > 0) {
    await save(parsed as ScheduleRow[]);
  }

  localStorage.removeItem(LEGACY_KEY);
}
