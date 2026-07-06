import { fmt, daysUntil } from '../utils/dates';

// ---------------------------------------------------------------------------
// US holiday LIBRARY — computed date rules, defined entirely in code. Holidays
// are never stored as events; they are a derived, show/hide-able layer whose
// per-user visibility lives in prefs.holidays (see store/types.ts).
// ---------------------------------------------------------------------------

export type HolidayGroup =
  | 'national' | 'popular' | 'fun'
  | 'religious' | 'cultural' | 'state' | 'school'; // last four reserved for v2

// weekday: 0=Sun … 6=Sat
export type HolidayRule =
  | { t: 'fixed'; month: number; day: number }             // e.g. Jul 4
  | { t: 'nth'; n: number; weekday: number; month: number } // e.g. 3rd Mon of Jan
  | { t: 'last'; weekday: number; month: number }           // e.g. last Mon of May
  | { t: 'easter' };                                        // Easter Sunday (Meeus)

export interface Holiday {
  id: string;
  name: string;
  emoji: string;
  group: HolidayGroup;
  rule: HolidayRule;
}

// ---- Date-computation helpers ---------------------------------------------

/** A fixed calendar date in `year` (month is 1-12). Local midnight. */
export function fixedDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

/** The n-th `weekday` of `month` in `year` (e.g. 3rd Monday of January). */
export function nthWeekdayOfMonth(year: number, n: number, weekday: number, month: number): Date {
  const first = new Date(year, month - 1, 1);
  const shift = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month - 1, 1 + shift + (n - 1) * 7);
}

/** The last `weekday` of `month` in `year` (e.g. last Monday of May). */
export function lastWeekdayOfMonth(year: number, weekday: number, month: number): Date {
  const last = new Date(year, month, 0); // day 0 of next month = last day of this month
  const shift = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month - 1, last.getDate() - shift);
}

/** Easter Sunday for `year` — Meeus/Jones/Butcher (Gregorian) algorithm. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Resolve a holiday's rule to a concrete Date in the given year. */
export function holidayDateInYear(h: Holiday, year: number): Date {
  const r = h.rule;
  switch (r.t) {
    case 'fixed':  return fixedDate(year, r.month, r.day);
    case 'nth':    return nthWeekdayOfMonth(year, r.n, r.weekday, r.month);
    case 'last':   return lastWeekdayOfMonth(year, r.weekday, r.month);
    case 'easter': return easterSunday(year);
  }
}

/** Next occurrence Date from `from` — this year's if still upcoming, else next year's. */
export function holidayNextDate(h: Holiday, from: Date = new Date()): Date {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let d = holidayDateInYear(h, today.getFullYear());
  if (d < today) d = holidayDateInYear(h, today.getFullYear() + 1);
  return d;
}

/** Next occurrence as a "YYYY-MM-DD" string (so it plugs into daysUntil/etc). */
export function holidayNextISO(h: Holiday, from: Date = new Date()): string {
  return fmt(holidayNextDate(h, from));
}

// ---- The library ----------------------------------------------------------

export const HOLIDAYS: Holiday[] = [
  // Major U.S. federal holidays
  { id: 'new-years',    name: "New Year's Day",                emoji: '🎉', group: 'national', rule: { t: 'fixed', month: 1, day: 1 } },
  { id: 'mlk',          name: 'Martin Luther King Jr. Day',    emoji: '✊', group: 'national', rule: { t: 'nth', n: 3, weekday: 1, month: 1 } },
  { id: 'presidents',   name: "Presidents' Day",               emoji: '🏛️', group: 'national', rule: { t: 'nth', n: 3, weekday: 1, month: 2 } },
  { id: 'memorial',     name: 'Memorial Day',                  emoji: '🇺🇸', group: 'national', rule: { t: 'last', weekday: 1, month: 5 } },
  { id: 'juneteenth',   name: 'Juneteenth',                    emoji: '✊🏾', group: 'national', rule: { t: 'fixed', month: 6, day: 19 } },
  { id: 'independence', name: 'Independence Day',              emoji: '🎆', group: 'national', rule: { t: 'fixed', month: 7, day: 4 } },
  { id: 'labor',        name: 'Labor Day',                     emoji: '🛠️', group: 'national', rule: { t: 'nth', n: 1, weekday: 1, month: 9 } },
  { id: 'columbus',     name: "Columbus / Indigenous Peoples' Day", emoji: '🧭', group: 'national', rule: { t: 'nth', n: 2, weekday: 1, month: 10 } },
  { id: 'veterans',     name: 'Veterans Day',                  emoji: '🎖️', group: 'national', rule: { t: 'fixed', month: 11, day: 11 } },
  { id: 'thanksgiving', name: 'Thanksgiving',                  emoji: '🦃', group: 'national', rule: { t: 'nth', n: 4, weekday: 4, month: 11 } },
  { id: 'christmas',    name: 'Christmas',                     emoji: '🎄', group: 'national', rule: { t: 'fixed', month: 12, day: 25 } },

  // Popular / widely observed (not federal)
  { id: 'valentines',    name: "Valentine's Day",     emoji: '❤️', group: 'popular', rule: { t: 'fixed', month: 2, day: 14 } },
  { id: 'st-patricks',   name: "St. Patrick's Day",   emoji: '☘️', group: 'popular', rule: { t: 'fixed', month: 3, day: 17 } },
  { id: 'easter',        name: 'Easter',              emoji: '🐰', group: 'popular', rule: { t: 'easter' } },
  { id: 'mothers',       name: "Mother's Day",        emoji: '💐', group: 'popular', rule: { t: 'nth', n: 2, weekday: 0, month: 5 } },
  { id: 'fathers',       name: "Father's Day",        emoji: '👔', group: 'popular', rule: { t: 'nth', n: 3, weekday: 0, month: 6 } },
  { id: 'halloween',     name: 'Halloween',           emoji: '🎃', group: 'popular', rule: { t: 'fixed', month: 10, day: 31 } },
  { id: 'new-years-eve', name: "New Year's Eve",      emoji: '🥂', group: 'popular', rule: { t: 'fixed', month: 12, day: 31 } },

  // Fun / novelty
  { id: 'groundhog',  name: 'Groundhog Day',           emoji: '🦫', group: 'fun', rule: { t: 'fixed', month: 2, day: 2 } },
  { id: 'pi-day',     name: 'Pi Day',                  emoji: '🥧', group: 'fun', rule: { t: 'fixed', month: 3, day: 14 } },
  { id: 'earth-day',  name: 'Earth Day',               emoji: '🌍', group: 'fun', rule: { t: 'fixed', month: 4, day: 22 } },
  { id: 'star-wars',  name: 'Star Wars Day',           emoji: '🚀', group: 'fun', rule: { t: 'fixed', month: 5, day: 4 } },
  { id: 'pirate-day', name: 'Talk Like a Pirate Day',  emoji: '🏴‍☠️', group: 'fun', rule: { t: 'fixed', month: 9, day: 19 } },
];

export const HOLIDAY_BY_ID: Record<string, Holiday> =
  Object.fromEntries(HOLIDAYS.map(h => [h.id, h]));

// Group display metadata. The first three are populated; the rest are reserved
// for v2 and rendered as disabled "Coming soon" sections.
export const HOLIDAY_GROUPS: { id: HolidayGroup; label: string; comingSoon: boolean }[] = [
  { id: 'national',  label: 'Major U.S. Holidays', comingSoon: false },
  { id: 'popular',   label: 'Popular',             comingSoon: false },
  { id: 'fun',       label: 'Fun / Novelty',       comingSoon: false },
  { id: 'religious', label: 'Religious',           comingSoon: true },
  { id: 'cultural',  label: 'Cultural',            comingSoon: true },
  { id: 'state',     label: 'State / Local',       comingSoon: true },
  { id: 'school',    label: 'School',              comingSoon: true },
];

// High-signal defaults pre-selected the first time a user turns holidays on.
// (No religious holidays are auto-enabled.)
export const DEFAULT_HOLIDAY_IDS: string[] = [
  'new-years', 'valentines', 'mothers', 'fathers', 'memorial', 'independence',
  'labor', 'halloween', 'thanksgiving', 'christmas', 'new-years-eve',
];

// ---- Visible-holiday selector (derived countdown items) -------------------

export interface HolidayItem {
  id: string;
  name: string;
  emoji: string;
  group: HolidayGroup;
  cat: 'holidays';
  dateISO: string; // next occurrence "YYYY-MM-DD"
  days: number;    // days until next occurrence
  fav: boolean;
}

// Structural view of prefs.holidays (the canonical type lives in store/types.ts
// as HolidayPrefs). Kept structural here so this library never imports the store.
type HolidayVisibility = {
  enabled: boolean;
  shown?: Record<string, boolean>;
  fav?: Record<string, boolean>;
};

/** The visible holidays as sorted countdown items — only when globally enabled
 *  AND individually shown. Derived on read; never stored. */
export function visibleHolidays(hp: HolidayVisibility | undefined, from: Date = new Date()): HolidayItem[] {
  if (!hp?.enabled) return [];
  return HOLIDAYS
    .filter(h => hp.shown?.[h.id])
    .map(h => {
      const dateISO = holidayNextISO(h, from);
      return {
        id: h.id, name: h.name, emoji: h.emoji, group: h.group, cat: 'holidays' as const,
        dateISO, days: daysUntil(dateISO), fav: !!hp.fav?.[h.id],
      };
    })
    .sort((a, b) => a.days - b.days);
}
