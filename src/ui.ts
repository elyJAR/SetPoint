import { ScheduleRow } from './types';
import { formatDisplayDate, getRowStatus, daysUntilCrush } from './calc';

/**
 * Renders the schedule table into the given container element.
 * Sorts rows ascending by crush_date, applies row status CSS classes,
 * and shows an empty-state message when rows is empty.
 */
export function renderTable(rows: ScheduleRow[], container: HTMLElement, groupByName = false): void {
  container.innerHTML = '';

  if (rows.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'empty-state';
    msg.textContent = 'No samples yet. Add a sample above to get started.';
    container.appendChild(msg);
    return;
  }

  const table = document.createElement('table');
  table.className = 'schedule-table';

  // Header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th style="width: 30px;"><input type="checkbox" id="batch-delete-all" title="Select All for Batch Delete" /></th>
      <th style="width: 40px;">S/N</th>
      <th>Sample Label</th>
      <th>Casting Date</th>
      <th>Offset (days)</th>
      <th>Curing Duration (days)</th>
      <th>Crush Date</th>
      <th>Days Left</th>
      <th>Actions</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  function createRow(row: ScheduleRow, rowIndex: number) {
    let status = getRowStatus(row.crush_date) as string;
    if (row.is_crushed) status = 'crushed';

    const days = daysUntilCrush(row.crush_date);
    const daysLabel = row.is_crushed ? 'Done' : (days < 0
      ? `${Math.abs(days)}d overdue`
      : days === 0
        ? 'Today'
        : `${days}d`);

    const tr = document.createElement('tr');
    tr.className = `row--${status}`;
    tr.dataset.id = row.id;

    tr.innerHTML = `
      <td><input type="checkbox" class="batch-delete-cb" value="${escapeHtml(row.id)}" /></td>
      <td>${rowIndex}</td>
      <td>${escapeHtml(row.sample_label)}</td>
      <td>${formatDisplayDate(row.casting_date)}</td>
      <td>${row.curing_offset}d</td>
      <td>${row.curing_duration}</td>
      <td>${formatDisplayDate(row.crush_date)}</td>
      <td class="days-left days-left--${status}">${daysLabel}</td>
      <td>
        <label style="display: inline-flex; align-items: center; gap: 4px; cursor: pointer; white-space: nowrap; margin-right: 8px;">
          <input type="checkbox" class="cb-crushed" data-id="${escapeHtml(row.id)}" ${row.is_crushed ? 'checked' : ''} /> Done
        </label>
        <button class="btn-edit" data-id="${escapeHtml(row.id)}">Edit</button>
        <button class="btn-delete" data-id="${escapeHtml(row.id)}">Delete</button>
      </td>
    `;
    return tr;
  }

  if (groupByName) {
    const groupedSorted = [...rows].sort((a, b) => {
      const nameCmp = a.sample_label.localeCompare(b.sample_label, undefined, { numeric: true, sensitivity: 'base' });
      if (nameCmp !== 0) return nameCmp;
      return a.crush_date < b.crush_date ? -1 : a.crush_date > b.crush_date ? 1 : 0;
    });

    let currentGroup = '';
    let rowIndex = 1;
    for (const row of groupedSorted) {
      if (row.sample_label !== currentGroup) {
        currentGroup = row.sample_label;
        const groupTr = document.createElement('tr');
        groupTr.innerHTML = `
          <td colspan="9" style="background: #e5e7eb; font-weight: bold; padding: 10px 14px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; color: #4b5563;">
            ${escapeHtml(currentGroup)}
          </td>
        `;
        tbody.appendChild(groupTr);
      }
      tbody.appendChild(createRow(row, rowIndex++));
    }
  } else {
    const sorted = [...rows].sort((a, b) => {
      if (a.crush_date !== b.crush_date) {
        return a.crush_date < b.crush_date ? -1 : 1;
      }
      return a.sample_label.localeCompare(b.sample_label, undefined, { numeric: true, sensitivity: 'base' });
    });
    
    let rowIndex = 1;
    for (const row of sorted) {
      tbody.appendChild(createRow(row, rowIndex++));
    }
  }

  table.appendChild(tbody);
  container.appendChild(table);
}

/**
 * Returns a form row <div> for sample entry at the given index.
 * The remove button is hidden when index === 0.
 */
export function renderFormRow(index: number): HTMLElement {
  const div = document.createElement('div');
  div.className = 'form-row';
  div.dataset.index = String(index);

  div.innerHTML = `
    <input
      type="text"
      class="input-label"
      name="sample_label_${index}"
      placeholder="Sample label e.g. Beam-01"
      aria-label="Sample label"
    />
    <input
      type="text"
      class="input-casting-date"
      name="casting_date_${index}"
      placeholder="DD/MM/YYYY"
      aria-label="Casting date"
    />
    <input
      type="number"
      class="input-offset"
      name="curing_offset_${index}"
      value="0"
      min="0"
      placeholder="Offset (days)"
      title="Curing start offset (0 = same day, 1 = day after)"
    />
    <div class="checkbox-group">
      <label class="checkbox-label checkbox-select-all" title="Select All"><input type="checkbox" class="duration-select-all" /> All</label>
      <span class="checkbox-divider"></span>
      <label class="checkbox-label"><input type="checkbox" class="duration-checkbox" value="7" /> 7d</label>
      <label class="checkbox-label"><input type="checkbox" class="duration-checkbox" value="14" /> 14d</label>
      <label class="checkbox-label"><input type="checkbox" class="duration-checkbox" value="21" /> 21d</label>
      <label class="checkbox-label"><input type="checkbox" class="duration-checkbox" value="28" /> 28d</label>
      <label class="checkbox-label"><input type="checkbox" class="duration-checkbox" value="56" /> 56d</label>
      <label class="checkbox-label"><input type="checkbox" class="duration-checkbox" value="90" /> 90d</label>
    </div>
    <button
      type="button"
      class="btn-remove-row btn btn-danger btn-sm"
      style="${index === 0 ? 'display:none' : ''}"
      aria-label="Remove this row"
    >Remove</button>
  `;

  return div;
}

/**
 * Renders a dismissible banner in #banner-container.
 * Auto-dismisses after 5000ms when autoDismiss is true.
 */
export function showBanner(
  message: string,
  type: 'error' | 'warning' | 'info',
  autoDismiss?: boolean
): void {
  let container = document.getElementById('banner-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'banner-container';
    document.body.prepend(container);
  }

  const banner = document.createElement('div');
  banner.className = `banner banner--${type}`;
  banner.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const text = document.createElement('span');
  text.textContent = message;

  const dismiss = document.createElement('button');
  dismiss.className = 'banner-dismiss';
  dismiss.textContent = '×';
  dismiss.setAttribute('aria-label', 'Dismiss');
  dismiss.addEventListener('click', () => banner.remove());

  banner.appendChild(text);
  banner.appendChild(dismiss);
  container.appendChild(banner);

  if (autoDismiss) {
    setTimeout(() => banner.remove(), 5000);
  }
}

/**
 * Enables or disables the Export CSV and Export PDF buttons.
 */
export function setExportButtonsDisabled(disabled: boolean): void {
  const csvBtn = document.getElementById('btn-export-csv') as HTMLButtonElement | null;
  const pdfBtn = document.getElementById('btn-export-pdf') as HTMLButtonElement | null;

  if (csvBtn) csvBtn.disabled = disabled;
  if (pdfBtn) pdfBtn.disabled = disabled;
}

/**
 * Renders the next-crush countdown card into #next-crush-container.
 * Shows the soonest upcoming (or today's) crush date and a big day number.
 * Hides the section when there are no future/today rows.
 */
let countdownTimer: ReturnType<typeof setInterval> | null = null;

export function renderNextCrush(rows: ScheduleRow[]): void {
  const section = document.getElementById('next-crush-section');
  const container = document.getElementById('next-crush-container');
  if (!section || !container) return;

  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  const upcoming = rows
    .filter(r => !r.is_crushed && daysUntilCrush(r.crush_date) >= 0)
    .sort((a, b) => a.crush_date < b.crush_date ? -1 : 1);

  if (upcoming.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';
  const next = upcoming[0];
  const days = daysUntilCrush(next.crush_date);

  // Collect all samples crushing on the same date
  const sameDay = upcoming.filter(r => r.crush_date === next.crush_date);
  const labels = sameDay.map(r => escapeHtml(r.sample_label)).join(', ');

  const headline = days === 0 ? 'Today' : 'Upcoming';
  const sub = days === 0
    ? `Crush today — ${labels}`
    : `On ${formatLongDate(next.crush_date)} — ${labels}`;

  container.innerHTML = `
    <div class="next-crush-number" style="font-size: 48px; margin-bottom: 4px;">${headline}</div>
    <div class="next-crush-sub">${sub}</div>
    ${days > 0 ? `<div id="countdown-display" style="margin-top: 14px; font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; background: rgba(0,0,0,0.15); padding: 8px 16px; border-radius: 6px; letter-spacing: 1px; display: inline-block;"></div>` : ''}
  `;

  if (days > 0) {
    // Parse "YYYY-MM-DD" safely as local time midnight
    const [y, m, d] = next.crush_date.split('-').map(Number);
    const targetMs = new Date(y, m - 1, d).getTime();
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = targetMs - now;
      
      const display = document.getElementById('countdown-display');
      if (!display) return;
      
      if (diff <= 0) {
        display.innerText = "0d 00h 00m 00s";
        if (countdownTimer) clearInterval(countdownTimer);
        return;
      }
      
      const dd = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hh = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mm = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const ss = Math.floor((diff % (1000 * 60)) / 1000);
      
      display.innerText = `${dd}d ${String(hh).padStart(2, '0')}h ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`;
    };
    
    updateCountdown();
    countdownTimer = setInterval(updateCountdown, 1000);
  }
}

/** Formats an ISO date as "Saturday, 21st March, 2026" */
function formatLongDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const day = d.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? 'st'
    : day === 2 || day === 22 ? 'nd'
    : day === 3 || day === 23 ? 'rd'
    : 'th';
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
  const month = d.toLocaleDateString('en-GB', { month: 'long' });
  const year = d.getFullYear();
  return `${weekday}, ${day}${suffix} ${month}, ${year}`;
}

/** Escapes HTML special characters to prevent XSS in innerHTML. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
