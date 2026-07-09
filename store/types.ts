export interface Alert {
  value: number;
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
}

// A labeled hyperlink attached to an item. `label` is the display text (falls
// back to the URL/domain when blank); `url` is normalized to include a scheme.
export interface Link {
  label: string;
  url: string;
}

export interface Recurrence {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  dow: number[];
  endType: 'never' | 'on' | 'after';
  endDate?: string;
  count?: number;
}

export interface Event {
  id: string;
  name: string;
  emoji: string;
  cat: 'money' | 'travel' | 'work' | 'medical' | 'house' | 'holidays' | 'parties';
  allDay: boolean;
  start: string;       // ISO datetime, e.g. "2026-06-26T19:00:00"
  end: string | null;  // ISO datetime, or null when there is no end
  /** @deprecated Pre-v1 date-only field. Retained for migration; new code uses `start`/`allDay`. */
  date: string;        // "YYYY-MM-DD"
  created: string;
  fav: boolean;
  note: string;
  recur: Recurrence | null;
  alerts: Alert[];
  links: Link[];
}

export type GoalWindowKind = 'year' | 'by_date' | 'all_time';

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  target: number;
  current: number;
  unit: string;
  step: number;
  date: string;
  created: string;
  fav: boolean;
  note: string;
  alerts: Alert[];
  links: Link[];
  /** Opt-in: also surface this goal as a countdown on the Countdowns tab.
   *  Defaults false (missing/legacy → false). */
  showOnCountdown?: boolean;
  // Optional life-log link — when set, progress is DERIVED from the linked log
  // (never stored). All null/absent for existing manual goals (unchanged behavior).
  linkedPreset?: string | null;   // linked life-log preset id
  linkedLogId?: string | null;    // linked life-log memory id (uuid)
  windowKind?: GoalWindowKind | null;
  windowYear?: number | null;     // the year, for windowKind 'year'
  windowStart?: string | null;    // "YYYY-MM-DD" lower bound for windowKind 'by_date'; null → use created
}

export type DatePrecision = 'none' | 'year' | 'month' | 'full';

export interface LogEntry {
  /** "YYYY-MM-DD" (unknown parts defaulted to 01), or "" when precision is 'none'. */
  date: string;
  note: string;
  /** For COLLECTION life logs: the named thing logged (e.g. a country). Absent
   *  on plain count entries (backward compatible). */
  item?: string;
  /** How much of `date` is known — controls display (e.g. "2019" vs "March 2019"
   *  vs "March 15, 2019" vs no date). Absent → treat as 'full'. */
  datePrecision?: DatePrecision;
  /** Per-entry labeled hyperlinks. Absent on older entries → treated as []. */
  links?: Link[];
  /** Reminders for an UPCOMING (future-dated) entry — same shape as Event.alerts.
   *  Carried through the attach flow; absent on older entries → treated as []. */
  alerts?: Alert[];
}

export interface Memory {
  id: string;
  type: 'birthday' | 'anniversary' | 'memorial' | 'lifelog';
  name: string;
  emoji: string;
  originDate: string;
  /** True when only the month/day is known. Suppresses age/years everywhere;
   *  the countdown to the next annual occurrence still works from month/day. */
  yearUnknown: boolean;
  entries: LogEntry[];
  // Life-log shaping (ignored by birthday/anniversary/memorial):
  //  - 'count' (default): tally of occurrences (entries.length)
  //  - 'collection': progress toward a universe/target (distinct items of Y)
  logKind?: 'count' | 'collection';
  logPreset?: string;   // preset id (constants/lifelogs.ts), or undefined for custom
  logTarget?: number;   // the "Y" (universe size or custom target) for collections
  /** Memory-level date precision (default 'full'); life-log entries can each
   *  override via LogEntry.datePrecision for back-filled/partial dates. */
  datePrecision?: DatePrecision;
  note: string;
  fav: boolean;
  alerts: Alert[];
  links: Link[];
}

// Per-user holiday visibility. The holiday LIBRARY is code (constants/holidays.ts);
// only what to show/fav/remind lives here (persisted as prefs.holidays jsonb).
export interface HolidayPrefs {
  enabled: boolean;                          // global on/off for the holiday layer
  shown: Record<string, boolean>;            // holidayId -> visible in countdown
  fav?: Record<string, boolean>;             // holidayId -> pinned to hero
  reminders?: Record<string, Alert[]>;       // holidayId -> reminder offsets
}

export interface UserPrefs {
  quotePref: 'bible' | 'motivational' | 'jokes' | 'off';
  timezone: string;
  location: string;
  displayName: string;
  onboarded: boolean;
  theme: 'light' | 'dark';
  holidays: HolidayPrefs;
  /** Server-controlled flag (prefs.is_superuser). READ-ONLY in the app — never
   *  written back — it gates the universe admin. Defaults false. */
  isSuperuser: boolean;
}
