import { format, differenceInCalendarDays, addDays, addMonths, addYears, parseISO } from 'date-fns';
import { Event } from '../store/types';

// True only for a real, finite Date. Used to guard every format()/getTime() call
// so a partial or malformed user-typed value can never throw "Invalid time value".
export function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime());
}

export const fmt = (d: Date) => (isValidDate(d) ? format(d, 'yyyy-MM-dd') : '');
export const today = () => format(new Date(), 'yyyy-MM-dd');

// Accepts either a date-only string ("YYYY-MM-DD") or a full ISO datetime
// ("YYYY-MM-DDTHH:mm:ss"). Date-only strings are anchored to local midnight.
// May return an Invalid Date for bad input — callers must guard with isValidDate.
export function toDate(s: string): Date {
  if (!s) return new Date(NaN);
  return parseISO(s.includes('T') ? s : s + 'T00:00:00');
}

export function daysUntil(dateStr: string): number {
  const d = toDate(dateStr);
  if (!isValidDate(d)) return 0;
  const now = new Date(); now.setHours(0,0,0,0);
  return differenceInCalendarDays(d, now);
}

export function msUntil(dateStr: string): number {
  const d = toDate(dateStr);
  return isValidDate(d) ? d.getTime() - Date.now() : 0;
}

export function pctElapsed(created: string, target: string): number {
  const cs = toDate(created), ce = toDate(target);
  if (!isValidDate(cs) || !isValidDate(ce)) return 0;
  const s = cs.getTime(), e = ce.getTime();
  if (e === s) return 0;
  const n = Date.now();
  return Math.round(Math.min(100, Math.max(0, ((n - s) / (e - s)) * 100)));
}

export function urgencyColor(days: number): string {
  if (days <= 7)  return '#E8507A';
  if (days <= 30) return '#F0A04B';
  return '#3ECFB2';
}

const datePart = (iso: string) => iso.slice(0, 10);
const timePart = (iso: string) => (iso.length >= 19 ? iso.slice(11, 19) : '00:00:00');

// Returns the next occurrence as an ISO datetime. All-day events resolve to
// midnight; timed events keep their original time-of-day. Recurrence is advanced
// at calendar-date granularity (matching the prior behaviour), then the
// time-of-day is re-attached.
export function nextOccurrence(event: Event): string {
  const base = datePart(event.start);
  const time = event.allDay ? '00:00:00' : timePart(event.start);
  if (!event.recur) return `${base}T${time}`;

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const { freq, dow } = event.recur;
  if (freq === 'weekly' && dow.length > 0) {
    for (let i = 1; i <= 8; i++) {
      const d = addDays(now, i);
      if (dow.includes(d.getDay())) return `${fmt(d)}T${time}`;
    }
    return `${base}T${time}`;
  }
  let cur = parseISO(base + 'T00:00:00');
  if (!isValidDate(cur)) return `${base}T${time}`;
  let itr = 0;
  while (cur <= now && itr < 3650) {
    itr++;
    if (freq === 'daily')        cur = addDays(cur, 1);
    else if (freq === 'monthly') cur = addMonths(cur, 1);
    else if (freq === 'yearly')  cur = addYears(cur, 1);
    else break;
  }
  return `${fmt(cur)}T${time}`;
}

export function recurLabel(event: Event): string {
  if (!event.recur) return '';
  const { freq, dow } = event.recur;
  if (freq === 'daily')   return 'Every day';
  if (freq === 'monthly') return 'Monthly';
  if (freq === 'yearly')  return 'Yearly';
  if (freq === 'weekly') {
    if (dow.length === 7) return 'Every day';
    if (dow.length === 5 && dow.join(',') === '1,2,3,4,5') return 'Weekdays';
    if (dow.length === 1) return 'Every ' + ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow[0]];
    return dow.map(d => ['Su','Mo','Tu','We','Th','Fr','Sa'][d]).join('·');
  }
  return 'Repeats';
}

export function nextAnnual(originDate: string): string {
  const o = toDate(originDate);
  if (!isValidDate(o)) return '';
  const now = new Date(); now.setHours(0,0,0,0);
  let next = new Date(now.getFullYear(), o.getMonth(), o.getDate());
  if (next <= now) next = new Date(now.getFullYear() + 1, o.getMonth(), o.getDate());
  return fmt(next);
}

export function yearsMonthsDays(originDate: string) {
  const o = toDate(originDate);
  if (!isValidDate(o)) return { y: 0, mo: 0, d: 0 };
  const now = new Date();
  let y = now.getFullYear() - o.getFullYear();
  let mo = now.getMonth() - o.getMonth();
  let d = now.getDate() - o.getDate();
  if (d < 0)  { mo--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (mo < 0) { y--; mo += 12; }
  return { y, mo, d };
}

export function daysSince(dateStr: string): number {
  const d = toDate(dateStr);
  if (!isValidDate(d)) return 0;
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

// Whole calendar days between two yyyy-MM-dd strings (toStr - fromStr).
export function daysBetween(fromStr: string, toStr: string): number {
  const a = toDate(fromStr), b = toDate(toStr);
  if (!isValidDate(a) || !isValidDate(b)) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function ordinal(n: number): string {
  return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
}

export function fmtDisplay(dateStr: string): string {
  const d = toDate(dateStr);
  return isValidDate(d) ? format(d, 'EEE, MMM d, yyyy') : '';
}

export function fmtFull(dateStr: string): string {
  const d = toDate(dateStr);
  return isValidDate(d) ? format(d, 'EEEE, MMMM d, yyyy') : '';
}

export function fmtShort(dateStr: string): string {
  const d = toDate(dateStr);
  return isValidDate(d) ? format(d, 'MMM d, yyyy') : '';
}

// Event-aware display: timed events append the time, all-day events show date only.
// Compact, e.g. "Fri, Jun 26 · 7:00 PM" or "Fri, Jun 26".
export function fmtDateTime(iso: string, allDay: boolean): string {
  const d = toDate(iso);
  if (!isValidDate(d)) return '';
  const day = format(d, 'EEE, MMM d');
  return allDay ? day : `${day} · ${format(d, 'h:mm a')}`;
}

// Long form, e.g. "Friday, June 26, 2026 · 7:00 PM" or "Friday, June 26, 2026".
export function fmtDateTimeFull(iso: string, allDay: boolean): string {
  const d = toDate(iso);
  if (!isValidDate(d)) return '';
  const day = format(d, 'EEEE, MMMM d, yyyy');
  return allDay ? day : `${day} · ${format(d, 'h:mm a')}`;
}

// Convenience wrappers operating on an event's next occurrence.
export function eventWhen(event: Event): string {
  return fmtDateTime(nextOccurrence(event), event.allDay);
}
export function eventWhenFull(event: Event): string {
  return fmtDateTimeFull(nextOccurrence(event), event.allDay);
}

export function dailyQuote<T>(quotes: T[]): T {
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return quotes[seed % quotes.length];
}
