import { formatDisplayDate, getRowStatus, daysUntilCrush } from './calc';
/**
 * Renders the schedule table into the given container element.
 * Sorts rows ascending by crush_date, applies row status CSS classes,
 * and shows an empty-state message when rows is empty.
 */
let isPendingOpen = true;
let isCrushedOpen = false;
// Global click listener to handle dropdown menu toggles natively
document.addEventListener('click', (e) => {
    const target = e.target;
    const trigger = target.closest('.menu-trigger');
    if (trigger) {
        const actId = trigger.getAttribute('data-id');
        const menu = document.getElementById(`menu-${actId}`);
        const isShowing = menu?.classList.contains('show');
        // Close all open menus first
        document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
        if (menu && !isShowing) {
            menu.classList.add('show');
        }
    }
    else if (!target.closest('.dropdown-menu')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
    }
});
export function renderTable(rows, container, groupByName = false) {
    container.innerHTML = '';
    const pending = rows.filter(r => !r.is_crushed);
    const crushed = rows.filter(r => r.is_crushed);
    if (rows.length === 0) {
        const msg = document.createElement('p');
        msg.className = 'empty-state';
        msg.textContent = 'No samples yet. Add a sample above to get started.';
        container.appendChild(msg);
        return;
    }
    function buildTable(data, isCrushedGroup) {
        const table = document.createElement('table');
        table.className = 'schedule-table';
        const thead = document.createElement('thead');
        thead.innerHTML = `
      <tr>
        <th style="width: 30px;"><input type="checkbox" ${isCrushedGroup ? 'disabled' : 'id="batch-delete-all"'} class="batch-delete-all-dynamic" title="Select All for Batch Delete" /></th>
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
        function createRow(row, rowIndex) {
            let status = getRowStatus(row.crush_date);
            if (row.is_crushed)
                status = 'crushed';
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
        <td class="menu-container">
          <button class="btn-icon menu-trigger" data-id="${escapeHtml(row.id)}" title="Actions">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
          <div class="dropdown-menu" id="menu-${escapeHtml(row.id)}">
            <label class="dropdown-item">
              <input type="checkbox" class="cb-crushed" data-id="${escapeHtml(row.id)}" ${row.is_crushed ? 'checked' : ''} style="accent-color: #2563eb;" />
              ${row.is_crushed ? 'Mark Pending' : 'Mark Crushed'}
            </label>
            <button class="dropdown-item btn-edit" data-id="${escapeHtml(row.id)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Edit
            </button>
            <button class="dropdown-item btn-delete text-red" data-id="${escapeHtml(row.id)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Delete
            </button>
          </div>
        </td>
      `;
            return tr;
        }
        if (groupByName) {
            const groupedSorted = [...data].sort((a, b) => {
                const nameCmp = a.sample_label.localeCompare(b.sample_label, undefined, { numeric: true, sensitivity: 'base' });
                if (nameCmp !== 0)
                    return nameCmp;
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
        }
        else {
            const sorted = [...data].sort((a, b) => {
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
        return table;
    }
    if (pending.length > 0 || rows.length === 0) {
        const details = document.createElement('details');
        details.className = 'group-collapse';
        details.open = isPendingOpen;
        details.addEventListener('toggle', () => isPendingOpen = details.open);
        details.innerHTML = `<summary class="group-summary">Pending Samples (${pending.length})</summary>`;
        if (pending.length === 0) {
            details.innerHTML += '<p class="empty-state">No pending samples.</p>';
        }
        else {
            details.appendChild(buildTable(pending, false));
        }
        container.appendChild(details);
    }
    if (crushed.length > 0) {
        const details = document.createElement('details');
        details.className = 'group-collapse';
        details.open = isCrushedOpen;
        details.addEventListener('toggle', () => isCrushedOpen = details.open);
        details.innerHTML = `<summary class="group-summary">Crushed Samples (${crushed.length})</summary>`;
        details.appendChild(buildTable(crushed, true));
        container.appendChild(details);
    }
}
/**
 * Returns a form row <div> for sample entry at the given index.
 * The remove button is hidden when index === 0.
 */
export function renderFormRow(index) {
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
export function showBanner(message, type, autoDismiss) {
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
export function setExportButtonsDisabled(disabled) {
    const csvBtn = document.getElementById('btn-export-csv');
    const pdfBtn = document.getElementById('btn-export-pdf');
    if (csvBtn)
        csvBtn.disabled = disabled;
    if (pdfBtn)
        pdfBtn.disabled = disabled;
}
/** Displays detailed info modal for a specific sample row. */
export function showInfoModal(row, onEdit) {
    const modal = document.getElementById('info-modal');
    const content = document.getElementById('info-modal-content');
    if (!modal || !content)
        return;
    const status = row.is_crushed ? 'Crushed' : (daysUntilCrush(row.crush_date) < 0 ? 'Overdue' : 'Pending');
    const dleft = row.is_crushed ? '—' : (daysUntilCrush(row.crush_date) < 0 ? `${Math.abs(daysUntilCrush(row.crush_date))} days overdue` : `${daysUntilCrush(row.crush_date)} days`);
    content.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 500;">Sample Label:</span>
      <strong style="font-size: 16px;">${escapeHtml(row.sample_label)}</strong>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 500;">Status:</span>
      <span style="padding: 4px 10px; background: ${row.is_crushed ? '#e5e7eb' : (daysUntilCrush(row.crush_date) < 0 ? '#fef2f2' : '#eff6ff')}; color: ${row.is_crushed ? '#4b5563' : (daysUntilCrush(row.crush_date) < 0 ? '#991b1b' : '#1e40af')}; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${status}</span>
    </div>
    <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 4px 0;" />
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 500;">Casting Date:</span>
      <span>${formatDisplayDate(row.casting_date)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 500;">Curing Offset:</span>
      <span>${row.curing_offset} days</span>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 500;">Curing Duration:</span>
      <span>${row.curing_duration} days</span>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 500;">Crush Date:</span>
      <strong style="color: #2563eb;">${formatDisplayDate(row.crush_date)}</strong>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 500;">Time Remaining:</span>
      <span style="font-weight: 600;">${dleft}</span>
    </div>
  `;
    modal.style.display = 'flex';
    const btnEdit = document.getElementById('btn-info-modal-edit');
    const btnDone = document.getElementById('btn-info-modal-done');
    const btnClose = document.getElementById('btn-close-info-modal');
    const closeFn = () => { modal.style.display = 'none'; };
    const editFn = () => {
        closeFn();
        onEdit();
    };
    if (btnDone)
        btnDone.onclick = closeFn;
    if (btnClose)
        btnClose.onclick = closeFn;
    if (btnEdit)
        btnEdit.onclick = editFn;
    modal.onclick = (e) => {
        if (e.target === modal)
            closeFn();
    };
}
/**
 * Renders the next-crush countdown card into #next-crush-container.
 * Shows the soonest upcoming (or today's) crush date and a big day number.
 * Hides the section when there are no future/today rows.
 */
let countdownTimer = null;
export function renderNextCrush(rows) {
    const section = document.getElementById('next-crush-section');
    const container = document.getElementById('next-crush-container');
    if (!section || !container)
        return;
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
    const futureUpcoming = upcoming.filter(r => daysUntilCrush(r.crush_date) > 0);
    const nextFuture = futureUpcoming.length > 0 ? futureUpcoming[0] : null;
    let countdownHtml = '';
    if (days > 0) {
        countdownHtml = `<div id="countdown-display" style="margin-top: 14px; font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; background: rgba(0,0,0,0.15); padding: 8px 16px; border-radius: 6px; letter-spacing: 1px; display: inline-block;"></div>`;
    }
    else if (days === 0 && nextFuture) {
        countdownHtml = `
      <div style="font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 16px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Next Upcoming: ${formatLongDate(nextFuture.crush_date)}</div>
      <div id="countdown-display" style="margin-top: 6px; font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; background: rgba(0,0,0,0.15); padding: 8px 16px; border-radius: 6px; letter-spacing: 1px; display: inline-block;"></div>
    `;
    }
    container.innerHTML = `
    <div class="next-crush-number" style="font-size: 48px; margin-bottom: 4px;">${headline}</div>
    <div class="next-crush-sub">${sub}</div>
    ${countdownHtml}
  `;
    let targetDateStr = null;
    if (days > 0) {
        targetDateStr = next.crush_date;
    }
    else if (days === 0 && nextFuture) {
        targetDateStr = nextFuture.crush_date;
    }
    if (targetDateStr) {
        // Parse "YYYY-MM-DD" safely in local time
        const [y, m, d] = targetDateStr.split('-').map(Number);
        const targetMs = new Date(y, m - 1, d, 0, 0, 0).getTime();
        const updateCountdown = () => {
            const now = new Date().getTime();
            const diff = targetMs - now;
            const display = document.getElementById('countdown-display');
            if (!display)
                return;
            if (diff <= 0) {
                display.innerText = "00h 00m 00s";
                if (countdownTimer)
                    clearInterval(countdownTimer);
                return;
            }
            const dd = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hh = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mm = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const ss = Math.floor((diff % (1000 * 60)) / 1000);
            if (dd > 0) {
                display.innerText = `${dd}d ${String(hh).padStart(2, '0')}h ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`;
            }
            else {
                display.innerText = `${String(hh).padStart(2, '0')}h ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`;
            }
        };
        updateCountdown();
        countdownTimer = setInterval(updateCountdown, 1000);
    }
}
/** Formats an ISO date as "Saturday, 21st March, 2026" */
function formatLongDate(iso) {
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
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
