export interface ScheduleRow {
  id: string;              // crypto.randomUUID() or Date.now().toString() fallback
  sample_label: string;    // non-empty, trimmed
  casting_date: string;    // "YYYY-MM-DD" (ISO, stored internally)
  curing_duration: number; // positive integer (days)
  curing_offset: number;   // number of days after casting when curing starts
  crush_date: string;      // "YYYY-MM-DD" (ISO, derived, stored for fast sort)
  is_crushed?: boolean;    // explicitly marks as completed/crushed
}

export type RowStatus = 'past' | 'today' | 'future' | 'crushed';

export interface ImportResult {
  added: ScheduleRow[];
  skipped: Array<{ row: number; reason: string }>;
}
