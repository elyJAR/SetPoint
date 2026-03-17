import { ScheduleRow } from './types';
import { calcCrushDate, parseDisplayDate } from './calc';
import { save, load, storageWarning } from './storage';
import { parseCSV, generateCSV, generateTemplate } from './csv';
import { generatePDF } from './pdf';
import { renderTable, renderFormRow, showBanner, setExportButtonsDisabled, renderNextCrush } from './ui';

let state: ScheduleRow[] = [];

function getContainer(): HTMLElement {
  const el = document.getElementById('schedule-container');
  if (!el) throw new Error('Missing #schedule-container');
  return el;
}

function afterMutation(): void {
  save(state);
  renderTable(state, getContainer());
  renderNextCrush(state);
  setExportButtonsDisabled(state.length === 0);
}

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString() + Math.random().toString(36).slice(2);
}

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getFormRowsContainer(): HTMLElement {
  const el = document.getElementById('form-rows');
  if (!el) throw new Error('Missing #form-rows');
  return el;
}

function appendFormRow(): void {
  const container = getFormRowsContainer();
  const index = container.querySelectorAll('.form-row').length;
  const row = renderFormRow(index);
  container.appendChild(row);
  wireRemoveButton(row);
}

function reindexFormRows(): void {
  const container = getFormRowsContainer();
  const rows = container.querySelectorAll<HTMLElement>('.form-row');
  rows.forEach((row, i) => {
    row.dataset.index = String(i);
    const removeBtn = row.querySelector<HTMLButtonElement>('.btn-remove-row');
    if (removeBtn) {
      removeBtn.style.display = i === 0 ? 'none' : '';
    }
  });
}

interface ParsedFormRow {
  label: string;
  castingDateISO: string;
  durations: number[];
}

function parseFormRows(): ParsedFormRow[] | null {
  const container = getFormRowsContainer();
  const rows = container.querySelectorAll<HTMLElement>('.form-row');
  const results: ParsedFormRow[] = [];

  for (const row of rows) {
    const labelInput = row.querySelector<HTMLInputElement>('.input-label');
    const dateInput = row.querySelector<HTMLInputElement>('.input-casting-date');
    const checkboxes = row.querySelectorAll<HTMLInputElement>('.duration-checkbox:checked');

    const label = labelInput?.value.trim() ?? '';
    const dateRaw = dateInput?.value.trim() ?? '';

    if (!label) {
      showBanner('Sample label is required for every row.', 'error');
      return null;
    }

    const castingDateISO = parseDisplayDate(dateRaw);
    if (!castingDateISO) {
      showBanner(`Invalid casting date "${dateRaw}" - please use DD/MM/YYYY format.`, 'error');
      return null;
    }

    const durations: number[] = [];
    checkboxes.forEach((cb: HTMLInputElement) => {
      const val = parseInt(cb.value, 10);
      if (!isNaN(val)) durations.push(val);
    });

    if (durations.length === 0) {
      showBanner('Please select at least one curing duration for each row.', 'error');
      return null;
    }

    results.push({ label, castingDateISO, durations });
  }

  return results;
}

function handleFormSubmit(e: Event): void {
  e.preventDefault();

  const parsed = parseFormRows();
  if (!parsed) return;

  const newRows: ScheduleRow[] = [];
  for (const { label, castingDateISO, durations } of parsed) {
    for (const duration of durations) {
      newRows.push({
        id: generateId(),
        sample_label: label,
        casting_date: castingDateISO,
        curing_duration: duration,
        crush_date: calcCrushDate(castingDateISO, duration),
      });
    }
  }

  state.push(...newRows);
  afterMutation();

  const container = getFormRowsContainer();
  container.innerHTML = '';
  const firstRow = renderFormRow(0);
  container.appendChild(firstRow);
  wireRemoveButton(firstRow);
}

function handleEdit(id: string): void {
  const rowIndex = state.findIndex(r => r.id === id);
  if (rowIndex === -1) return;

  const row = state[rowIndex];
  const tr = document.querySelector<HTMLTableRowElement>(`tr[data-id="${id}"]`);
  if (!tr) return;

  const editTd = document.createElement('td');
  editTd.colSpan = 6;
  editTd.className = 'inline-edit';

  const castingDisplay = formatForEdit(row.casting_date);
  editTd.innerHTML = [
    '<label>Label: <input type="text" class="edit-label" value="' + escapeAttr(row.sample_label) + '" /></label>',
    '<label>Casting Date: <input type="text" class="edit-casting-date" value="' + castingDisplay + '" placeholder="DD/MM/YYYY" /></label>',
    '<label>Curing Duration (days): <input type="number" class="edit-curing-duration" value="' + row.curing_duration + '" min="1" /></label>',
    '<button type="button" class="btn-confirm-edit">Confirm</button>',
    '<button type="button" class="btn-cancel-edit">Cancel</button>',
  ].join('');

  const originalCells = Array.from(tr.children);
  while (tr.firstChild) tr.removeChild(tr.firstChild);
  tr.appendChild(editTd);

  const confirmBtn = editTd.querySelector<HTMLButtonElement>('.btn-confirm-edit')!;
  const cancelBtn = editTd.querySelector<HTMLButtonElement>('.btn-cancel-edit')!;

  cancelBtn.addEventListener('click', () => {
    while (tr.firstChild) tr.removeChild(tr.firstChild);
    originalCells.forEach(cell => tr.appendChild(cell));
  });

  confirmBtn.addEventListener('click', () => {
    const newLabel = editTd.querySelector<HTMLInputElement>('.edit-label')!.value.trim();
    const newDateRaw = editTd.querySelector<HTMLInputElement>('.edit-casting-date')!.value.trim();
    const newDurationRaw = editTd.querySelector<HTMLInputElement>('.edit-curing-duration')!.value.trim();

    if (!newLabel) {
      showBanner('Sample label cannot be empty.', 'error');
      return;
    }

    const newCastingISO = parseDisplayDate(newDateRaw);
    if (!newCastingISO) {
      showBanner(`Invalid casting date "${newDateRaw}" - please use DD/MM/YYYY format.`, 'error');
      return;
    }

    const newDuration = Number(newDurationRaw);
    if (!Number.isInteger(newDuration) || newDuration < 1) {
      showBanner('Curing duration must be a positive integer.', 'error');
      return;
    }

    state[rowIndex] = {
      ...row,
      sample_label: newLabel,
      casting_date: newCastingISO,
      curing_duration: newDuration,
      crush_date: calcCrushDate(newCastingISO, newDuration),
    };

    afterMutation();
  });
}

function handleDelete(id: string): void {
  if (!confirm('Are you sure you want to delete this row?')) return;
  state = state.filter(r => r.id !== id);
  afterMutation();
}

function wireTableActions(container: HTMLElement): void {
  container.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    const id = target.dataset.id;
    if (!id) return;

    if (target.classList.contains('btn-edit')) {
      handleEdit(id);
    } else if (target.classList.contains('btn-delete')) {
      handleDelete(id);
    }
  });
}

function handleCSVImport(file: File): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target?.result as string;
    const result = parseCSV(text);

    state.push(...result.added);
    afterMutation();

    const addedCount = result.added.length;
    const skippedCount = result.skipped.length;
    let message = `Import complete: ${addedCount} row(s) added`;
    if (skippedCount > 0) {
      message += `, ${skippedCount} row(s) skipped`;
      const details = result.skipped.map(s => `Row ${s.row}: ${s.reason}`).join('; ');
      message += `. Details: ${details}`;
    }
    showBanner(message, skippedCount > 0 ? 'warning' : 'info', skippedCount === 0);
  };
  reader.readAsText(file);
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatForEdit(isoDate: string): string {
  const [yyyy, mm, dd] = isoDate.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

function wireRemoveButton(row: HTMLElement): void {
  const removeBtn = row.querySelector<HTMLButtonElement>('.btn-remove-row');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      row.remove();
      reindexFormRows();
    });
  }
}

function init(): void {
  state = load();
  if (storageWarning) {
    showBanner(storageWarning, 'warning');
  }

  const container = getContainer();
  renderTable(state, container);
  renderNextCrush(state);
  setExportButtonsDisabled(state.length === 0);

  wireTableActions(container);

  const addRowBtn = document.getElementById('btn-add-row');
  addRowBtn?.addEventListener('click', appendFormRow);

  const formRowsContainer = getFormRowsContainer();
  const initialRow = formRowsContainer.querySelector<HTMLElement>('.form-row');
  if (initialRow) wireRemoveButton(initialRow);

  const form = document.getElementById('sample-form');
  form?.addEventListener('submit', handleFormSubmit);

  const exportCsvBtn = document.getElementById('btn-export-csv');
  exportCsvBtn?.addEventListener('click', () => {
    const csv = generateCSV(state);
    triggerDownload(csv, 'setpoint-schedule.csv', 'text/csv');
  });

  const exportPdfBtn = document.getElementById('btn-export-pdf');
  exportPdfBtn?.addEventListener('click', () => {
    const error = generatePDF(state);
    if (error) {
      showBanner(`PDF export failed: ${error}`, 'error');
    }
  });

  const csvFileInput = document.getElementById('csv-file-input') as HTMLInputElement | null;
  csvFileInput?.addEventListener('change', () => {
    const f = csvFileInput.files?.[0];
    if (f) {
      handleCSVImport(f);
      csvFileInput.value = '';
    }
  });

  const templateLink = document.getElementById('btn-download-template');
  templateLink?.addEventListener('click', (e) => {
    e.preventDefault();
    const template = generateTemplate();
    triggerDownload(template, 'setpoint-template.csv', 'text/csv');
  });
}

document.addEventListener('DOMContentLoaded', init);