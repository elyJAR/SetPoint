import { ScheduleRow } from './types';
import { formatDisplayDate, getRowStatus, daysUntilCrush } from './calc';

/**
 * Renders the schedule table into the given container element.
 * Sorts rows ascending by crush_date, applies row status CSS classes,
 * and shows an empty-state message when rows is empty.
 */
export function renderTable(rows: ScheduleRow[], container: HTMLElement): void {
  container.innerHTML = '';

  if (rows.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'empty-state';
    msg.textContent = 'No samples yet. Add a sample above to get started.';
    container.appendChild(msg);
    return;
  }

  const sorted = [...rows].sort((a, b) =>
    a.crush_date < b.crush_date ? -1 : a.crush_date > b.crush_date ? 1 : 0
  );

  const table = document.createElement('table');
  table.className = 'schedule-table';

  // Header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Sample Label</th>
      <th>Casting Date</th>
      <th>Curing Duration (days)</th>
      <th>Crush Date</th>
      <th>Days Left</th>
      <th>Actions</th>
    </tr>
  `;
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');
  for (const row of sorted) {
    const status = getRowStatus(row.crush_date);
    const days = daysUntilCrush(row.crush_date);
    const daysLabel = days < 0
      ? `${Math.abs(days)}d overdue`
      : days === 0
        ? 'Today'
        : `${days}d`;

    const tr = document.createElement('tr');
    tr.className = `row--${status}`;
    tr.dataset.id = row.id;

    tr.innerHTML = `
      <td>${escapeHtml(row.sample_label)}</td>
      <td>${formatDisplayDate(row.casting_date)}</td>
      <td>${row.curing_duration}</td>
      <td>${formatDisplayDate(row.crush_date)}</td>
      <td class="days-left days-left--${status}">${daysLabel}</td>
      <td>
        <button class="btn-edit" data-id="${escapeHtml(row.id)}">Edit</button>
        <button class="btn-delete" data-id="${escapeHtml(row.id)}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
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
    <div class="checkbox-group">
      <label class="checkbox-label"><input type="checkbox" class="duration-checkbox" value="7" /> 7d</label>
      <label class="checkbox-label"><input type="checkbox" class="duration-checkbox" value="14" /> 14d</label>
      <label class="checkbox-label"><input type="checkbox" class="duration-checkbox" value="21" /> 21d</label>
      <label class="checkbox-label"><input type="checkbox" class="duration-checkbox" value="28" /> 28d</label>
      <label class="checkbox-label"><input type="checkbox" class="duration-checkbox" value="56" /> 56d</label>
      <label class="checkbox-label"><input type="checkbox" class="duration-checkbox" value="90" /> 90d</label>
    </div>
    <button
      type="button"
      class="btn-remove-row"
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
export function renderNextCrush(rows: ScheduleRow[]): void {
  const section = document.getElementById('next-crush-section');
  const container = document.getElementById('next-crush-container');
  if (!section || !container) return;

  const upcoming = rows
    .filter(r => daysUntilCrush(r.crush_date) >= 0)
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

  const dayWord = days === 1 ? 'day' : 'days';
  const headline = days === 0 ? 'Today' : `${days} ${dayWord}`;
  const sub = days === 0
    ? `Crush today — ${labels}`
    : `Next crush on ${formatLongDate(next.crush_date)} — ${labels}`;

  container.innerHTML = `
    <div class="next-crush-number">${headline}</div>
    <div class="next-crush-sub">${sub}</div>
  `;
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
