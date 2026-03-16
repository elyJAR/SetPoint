import { ScheduleRow } from './types';

const STORAGE_KEY = 'concrete_crush_schedule';

/**
 * Set by load() when corruption is detected. Null when data loaded cleanly.
 */
export let storageWarning: string | null = null;

/**
 * Serializes rows to JSON and writes to localStorage.
 */
export function save(rows: ScheduleRow[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

/**
 * Reads and parses the schedule from localStorage.
 * Returns an empty array if the key is missing, the value is invalid JSON,
 * or the parsed value is not an array. Sets storageWarning on corruption.
 */
export function load(): ScheduleRow[] {
  storageWarning = null;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    storageWarning = 'Saved schedule data is corrupted (invalid JSON). Starting with an empty schedule.';
    return [];
  }

  if (!Array.isArray(parsed)) {
    storageWarning = 'Saved schedule data is corrupted (unexpected format). Starting with an empty schedule.';
    return [];
  }

  return parsed as ScheduleRow[];
}
