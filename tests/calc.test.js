import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calcCrushDate, parseDisplayDate, formatDisplayDate, getRowStatus } from '../src/calc';
// ── Unit tests ────────────────────────────────────────────────────────────────
describe('calcCrushDate', () => {
    it('returns same-day start (offset 0) by default', () => {
        // 2025-01-01 + 28 days = 2025-01-29
        expect(calcCrushDate('2025-01-01', 28)).toBe('2025-01-29');
    });
    it('returns day-after start when offset is 1', () => {
        // 2025-01-01 + 1 (offset) + 28 (duration) = 2025-01-30
        expect(calcCrushDate('2025-01-01', 28, 1)).toBe('2025-01-30');
    });
    it('handles month boundary correctly with offset 0', () => {
        // Jan 31 + 1 day duration = Feb 01
        expect(calcCrushDate('2025-01-31', 1)).toBe('2025-02-01');
    });
    it('handles month boundary correctly with offset 1', () => {
        // Jan 31 + 1 offset + 1 duration = Feb 02
        expect(calcCrushDate('2025-01-31', 1, 1)).toBe('2025-02-02');
    });
});
describe('parseDisplayDate', () => {
    it('parses a valid date', () => {
        expect(parseDisplayDate('15/06/2025')).toBe('2025-06-15');
    });
    it('accepts a valid leap year date', () => {
        expect(parseDisplayDate('29/02/2024')).toBe('2024-02-29');
    });
    it('rejects wrong format (ISO instead of DD/MM/YYYY)', () => {
        expect(parseDisplayDate('2025-01-01')).toBeNull();
    });
    it('rejects non-existent date 31/02/2025', () => {
        expect(parseDisplayDate('31/02/2025')).toBeNull();
    });
    it('rejects non-existent date 29/02/2023 (non-leap year)', () => {
        expect(parseDisplayDate('29/02/2023')).toBeNull();
    });
    it('rejects 32/01/2025', () => {
        expect(parseDisplayDate('32/01/2025')).toBeNull();
    });
    it('rejects 00/00/0000', () => {
        expect(parseDisplayDate('00/00/0000')).toBeNull();
    });
    it('rejects invalid month 13', () => {
        expect(parseDisplayDate('01/13/2025')).toBeNull();
    });
});
describe('formatDisplayDate', () => {
    it('converts ISO to DD/MM/YYYY', () => {
        expect(formatDisplayDate('2025-06-15')).toBe('15/06/2025');
    });
    it('pads single-digit day and month', () => {
        expect(formatDisplayDate('2025-01-05')).toBe('05/01/2025');
    });
});
describe('getRowStatus', () => {
    it('returns "today" for today\'s date', () => {
        const today = new Date().toISOString().slice(0, 10);
        expect(getRowStatus(today)).toBe('today');
    });
    it('returns "past" for a past date', () => {
        expect(getRowStatus('2000-01-01')).toBe('past');
    });
    it('returns "future" for a future date', () => {
        expect(getRowStatus('2099-12-31')).toBe('future');
    });
});
// ── Property tests ────────────────────────────────────────────────────────────
// Feature: concrete-sample-crush-scheduler, Property 1: Crush Date Calculation Correctness
describe('Property 1: Crush Date Calculation Correctness', () => {
    it('crush date is exactly offset + curingDays calendar days after castingDate', () => {
        const isoDateArb = fc.date({
            min: new Date('2000-01-01'),
            max: new Date('2099-12-31'),
        }).map(d => d.toISOString().slice(0, 10));
        const curingDaysArb = fc.integer({ min: 1, max: 365 });
        const offsetArb = fc.integer({ min: 0, max: 10 });
        fc.assert(fc.property(isoDateArb, curingDaysArb, offsetArb, (castingDate, curingDays, offset) => {
            const result = calcCrushDate(castingDate, curingDays, offset);
            const expected = new Date(castingDate);
            expected.setDate(expected.getDate() + offset + curingDays);
            const expectedISO = expected.toISOString().slice(0, 10);
            return result === expectedISO;
        }), { numRuns: 100 });
    });
});
// Feature: concrete-sample-crush-scheduler, Property 3: Date Display Round-Trip
describe('Property 3: Date Display Round-Trip', () => {
    it('parseDisplayDate(formatDisplayDate(d)) === d for any valid ISO date', () => {
        const isoDateArb = fc.date({
            min: new Date('1900-01-01'),
            max: new Date('2099-12-31'),
        }).map(d => d.toISOString().slice(0, 10));
        fc.assert(fc.property(isoDateArb, (iso) => {
            const display = formatDisplayDate(iso);
            const roundTripped = parseDisplayDate(display);
            return roundTripped === iso;
        }), { numRuns: 100 });
    });
});
