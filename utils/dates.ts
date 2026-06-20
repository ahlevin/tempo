import { format, differenceInCalendarDays, addDays, addMonths, addYears, parseISO } from 'date-fns';
import { Event } from '../store/types';

export const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
export const today = () => fmt(new Date());

export function daysUntil(dateStr: string): number {
  const now = new Date(); now.setHours(0,0,0,0);
  return differenceInCalendarDays(parseISO(dateStr + 'T00:00:00'), now);
}

export function msUntil(dateStr: string): number {
  return parseISO(dateStr + 'T00:00:00').getTime() - Date.now();
}

export function pctElapsed(created: string, target: string): number {
  const s = parseISO(created).getTime();
  const e = parseISO(target + 'T00:00:00').getTime();
  const n = Date.now();
  return Math.round(Math.min(100, Math.max(0, ((n - s) / (e - s)) * 100)));
}

export function urgencyColor(days: number): string {
  if (days <= 7)  return '#E8507A';
  if (days <= 30) return '#F0A04B';
  return '#3ECFB2';
}

export function nextOccurrence(event: Event): string {
  if (!event.recur) return event.date;
  const now = new Date(); now.setHours(0,0,0,0);
  const { freq, dow } = event.recur;
  if (freq === 'weekly' && dow.length > 0) {
    for (let i = 1; i <= 8; i++) {
      const d = addDays(now, i);
      if (dow.includes(d.getDay())) return fmt(d);
    }
    return event.date;
  }
  let cur = parseISO(event.date + 'T00:00:00');
  let itr = 0;
  while (cur <= now && itr < 3650) {
    itr++;
    if (freq === 'daily')        cur = addDays(cur, 1);
    else if (freq === 'monthly') cur = addMonths(cur, 1);
    else if (freq === 'yearly')  cur = addYears(cur, 1);
    else break;
  }
  return fmt(cur);
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
  const o = parseISO(originDate + 'T00:00:00');
  const now = new Date(); now.setHours(0,0,0,0);
  let next = new Date(now.getFullYear(), o.getMonth(), o.getDate());
  if (next <= now) next = new Date(now.getFullYear() + 1, o.getMonth(), o.getDate());
  return fmt(next);
}

export function yearsMonthsDays(originDate: string) {
  const o = parseISO(originDate + 'T00:00:00');
  const now = new Date();
  let y = now.getFullYear() - o.getFullYear();
  let mo = now.getMonth() - o.getMonth();
  let d = now.getDate() - o.getDate();
  if (d < 0)  { mo--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (mo < 0) { y--; mo += 12; }
  return { y, mo, d };
}

export function daysSince(dateStr: string): number {
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.floor((now.getTime() - parseISO(dateStr + 'T00:00:00').getTime()) / 86400000);
}

export function ordinal(n: number): string {
  return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
}

export function fmtDisplay(dateStr: string): string {
  return format(parseISO(dateStr + 'T00:00:00'), 'EEE, MMM d, yyyy');
}

export function fmtFull(dateStr: string): string {
  return format(parseISO(dateStr + 'T00:00:00'), 'EEEE, MMMM d, yyyy');
}

export function fmtShort(dateStr: string): string {
  return format(parseISO(dateStr + 'T00:00:00'), 'MMM d, yyyy');
}

export function dailyQuote<T>(quotes: T[]): T {
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return quotes[seed % quotes.length];
}
