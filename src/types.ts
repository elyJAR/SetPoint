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
