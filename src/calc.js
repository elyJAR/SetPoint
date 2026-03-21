/**
 * Calculates the crush date given a casting date, curing duration, and offset.
 * Crush_Date = Casting_Date + offset + curingDays
 */
export function calcCrushDate(castingDateISO, curingDays, offset = 0) {
    const d = new Date(castingDateISO);
    d.setDate(d.getDate() + offset + curingDays);
    return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}
/**
 * Parses a DD/MM/YYYY display date string to YYYY-MM-DD ISO format.
 * Returns null for invalid format, non-existent dates, or wrong format.
 */
export function parseDisplayDate(str) {
    if (typeof str !== 'string')
        return null;
    // Must match exactly DD/MM/YYYY
    const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match)
        return null;
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    // Basic range checks
    if (month < 1 || month > 12)
        return null;
    if (day < 1)
        return null;
    // Validate the date actually exists using Date arithmetic
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year ||
        d.getMonth() !== month - 1 ||
        d.getDate() !== day) {
        return null;
    }
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const yyyy = String(year).padStart(4, '0');
    return `${yyyy}-${mm}-${dd}`;
}
/**
 * Formats a YYYY-MM-DD ISO date string to DD/MM/YYYY display format.
 */
export function formatDisplayDate(iso) {
    const [yyyy, mm, dd] = iso.split('-');
    return `${dd}/${mm}/${yyyy}`;
}
/**
 * Returns the row status relative to today's date.
 */
export function getRowStatus(crushDateISO) {
    const today = new Date().toISOString().slice(0, 10);
    if (crushDateISO < today)
        return 'past';
    if (crushDateISO === today)
        return 'today';
    return 'future';
}
/**
 * Returns the number of days until the crush date.
 * Negative = overdue, 0 = today, positive = days remaining.
 */
export function daysUntilCrush(crushDateISO) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const crush = new Date(crushDateISO + 'T00:00:00');
    return Math.round((crush.getTime() - today.getTime()) / 86400000);
}
