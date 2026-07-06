export interface Alert {
  value: number;
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
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
}

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
}

export interface LogEntry {
  date: string;
  note: string;
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
  note: string;
  fav: boolean;
  alerts: Alert[];
}

export interface UserPrefs {
  quotePref: 'bible' | 'motivational' | 'jokes' | 'off';
  timezone: string;
  location: string;
  displayName: string;
  onboarded: boolean;
  theme: 'light' | 'dark';
}
