import type { ScheduleRow, ImportResult } from './types';
import { parseDisplayDate, formatDisplayDate, calcCrushDate } from './calc';

const HEADER = 'sample_label,casting_date,curing_duration,crush_date';

/**
 * Parses CSV text with header: sample_label,casting_date,curing_duration,crush_date
 * Validates each row and skips invalid ones with a reason.
 * crush_date column in CSV is ignored — always recalculated.
 */
export function parseCSV(text: string): ImportResult {
  const added: ScheduleRow[] = [];
  const skipped: Array<{ row: number; reason: string }> = [];

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  // Skip header row (first non-empty line)
  const dataLines = lines.slice(1);

  dataLines.forEach((line, index) => {
    const rowNumber = index + 2; // 1-based, accounting for header being row 1
    const cols = line.split(',');

    const sample_label = (cols[0] ?? '').trim();
    const casting_date_raw = (cols[1] ?? '').trim();
    const curing_duration_raw = (cols[2] ?? '').trim();

    if (!sample_label) {
      skipped.push({ row: rowNumber, reason: 'Missing sample label' });
      return;
    }

    const casting_date = parseDisplayDate(casting_date_raw);
    if (!casting_date) {
      skipped.push({ row: rowNumber, reason: `Invalid casting date: "${casting_date_raw}" (expected DD/MM/YYYY)` });
      return;
    }

    const curingNum = Number(curing_duration_raw);
    if (!curing_duration_raw || !Number.isInteger(curingNum) || curingNum < 1) {
      skipped.push({ row: rowNumber, reason: `Invalid curing duration: "${curing_duration_raw}" (must be a positive integer)` });
      return;
    }

    const crush_date = calcCrushDate(casting_date, curingNum);
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString() + Math.random().toString(36).slice(2);

    added.push({
      id,
      sample_label,
      casting_date,
      curing_duration: curingNum,
      crush_date,
    });
  });

  return { added, skipped };
}

/**
 * Serializes ScheduleRow array to CSV with header row.
 * Dates are formatted as DD/MM/YYYY in output.
 */
export function generateCSV(rows: ScheduleRow[]): string {
  const lines = [HEADER];
  for (const row of rows) {
    const castingDisplay = formatDisplayDate(row.casting_date);
    const crushDisplay = formatDisplayDate(row.crush_date);
    lines.push(`${row.sample_label},${castingDisplay},${row.curing_duration},${crushDisplay}`);
  }
  return lines.join('\n');
}

/**
 * Returns a CSV string with the header row plus one example row.
 */
export function generateTemplate(): string {
  return `${HEADER}\nBeam-01,01/07/2025,28,30/07/2025`;
}
