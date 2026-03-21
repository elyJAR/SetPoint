import { jsPDF } from 'jspdf';
import { ScheduleRow } from './types';
import { formatDisplayDate } from './calc';

const COLUMNS = ['S/N', 'Sample Label', 'Casting Date', 'Curing Duration (days)', 'Crush Date'];
const COL_WIDTHS = [15, 55, 35, 45, 40]; // mm
const ROW_HEIGHT = 8; // mm
const MARGIN_LEFT = 14;
const MARGIN_TOP = 20;
const HEADER_FONT_SIZE = 11;
const BODY_FONT_SIZE = 10;
const TITLE_FONT_SIZE = 14;

/**
 * Generates a PDF of the crush schedule and triggers a browser download.
 * Returns null on success, or an error message string on failure.
 */
export function generatePDF(rows: ScheduleRow[]): string | null {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Title
    doc.setFontSize(TITLE_FONT_SIZE);
    doc.setFont('helvetica', 'bold');
    doc.text('SetPoint — Concrete Sample Crush Schedule', MARGIN_LEFT, MARGIN_TOP - 6);

    // Draw table header
    let x = MARGIN_LEFT;
    const headerY = MARGIN_TOP;

    doc.setFontSize(HEADER_FONT_SIZE);
    doc.setFont('helvetica', 'bold');

    // Header background
    doc.setFillColor(52, 73, 94);
    doc.rect(x, headerY, totalWidth(), ROW_HEIGHT, 'F');

    doc.setTextColor(255, 255, 255);
    COLUMNS.forEach((col, i) => {
      doc.text(col, x + 2, headerY + ROW_HEIGHT - 2);
      x += COL_WIDTHS[i];
    });

    // Draw body rows
    doc.setFontSize(BODY_FONT_SIZE);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    // Sort rows
    const sortedRows = [...rows].sort((a, b) => {
      if (a.crush_date !== b.crush_date) {
        return a.crush_date < b.crush_date ? -1 : 1;
      }
      return a.sample_label.localeCompare(b.sample_label, undefined, { numeric: true, sensitivity: 'base' });
    });

    sortedRows.forEach((row, rowIndex) => {
      const y = headerY + ROW_HEIGHT * (rowIndex + 1);
      x = MARGIN_LEFT;

      // Alternating row background
      if (rowIndex % 2 === 0) {
        doc.setFillColor(240, 240, 240);
        doc.rect(x, y, totalWidth(), ROW_HEIGHT, 'F');
      }

      const cells = [
        String(rowIndex + 1),
        row.sample_label,
        formatDisplayDate(row.casting_date),
        String(row.curing_duration),
        formatDisplayDate(row.crush_date),
      ];

      cells.forEach((cell, i) => {
        doc.text(cell, x + 2, y + ROW_HEIGHT - 2);
        x += COL_WIDTHS[i];
      });
    });

    // Outer border around the whole table
    doc.setDrawColor(100, 100, 100);
    doc.rect(MARGIN_LEFT, headerY, totalWidth(), ROW_HEIGHT * (rows.length + 1));

    // Column dividers
    let divX = MARGIN_LEFT;
    for (let i = 0; i < COL_WIDTHS.length - 1; i++) {
      divX += COL_WIDTHS[i];
      doc.line(divX, headerY, divX, headerY + ROW_HEIGHT * (rows.length + 1));
    }

    // Row dividers
    for (let i = 1; i <= rows.length; i++) {
      const lineY = headerY + ROW_HEIGHT * i;
      doc.line(MARGIN_LEFT, lineY, MARGIN_LEFT + totalWidth(), lineY);
    }

    doc.save('setpoint-schedule.pdf');
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'Failed to generate PDF';
  }
}

function totalWidth(): number {
  return COL_WIDTHS.reduce((sum, w) => sum + w, 0);
}
