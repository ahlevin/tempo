// Value formatting/parsing for VALUE goals, keyed on the goal's unit TOKEN.
// The unit is a canonical token chosen by an explicit Format picker — never
// inferred from free text — so the entry control is unambiguous:
//   'sec'  → Time min:sec, stored as total seconds   (381 ⇄ "6:21")
//   'hms'  → Time hr:min,  stored as total seconds    (9000 ⇄ "2:30")
//   '$'    → Money                                     (1234 ⇄ "$1,234")
//   other  → plain Number with a free-text unit label  ("225 lbs", "8 hrs")

export type ValueFormat = 'minsec' | 'hrmin' | 'money' | 'number';

// Time (min:sec). Robust to hand-typed synonyms as a fallback, but the Format
// picker is the real source of truth (it stores the canonical 'sec').
export function isTimeUnit(unit?: string): boolean {
  const u = (unit ?? '').trim().toLowerCase();
  return u === 'sec' || u === 'secs' || u === 'seconds'
    || u === 'min' || u === 'mins' || u === 'minute' || u === 'minutes'
    || u === 'mm:ss' || u === 'time';
}

// Time (hr:min) — canonical token 'hms', plus a few hand-typed synonyms.
export function isHourMinuteUnit(unit?: string): boolean {
  const u = (unit ?? '').trim().toLowerCase();
  return u === 'hms' || u === 'hrmin' || u === 'hr:min' || u === 'h:mm' || u === 'hh:mm';
}

export function isMoneyUnit(unit?: string): boolean {
  return (unit ?? '').trim() === '$';
}

/** Which entry control / display format a unit token maps to. */
export function valueFormat(unit?: string): ValueFormat {
  if (isTimeUnit(unit)) return 'minsec';
  if (isHourMinuteUnit(unit)) return 'hrmin';
  if (isMoneyUnit(unit)) return 'money';
  return 'number';
}

function trimNum(n: number): string {
  // Whole numbers → no decimals; otherwise up to 2 decimals. Thousands-separated.
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Format a stored numeric value for display, per unit token. */
export function formatValue(value: number, unit?: string): string {
  const f = valueFormat(unit);
  if (f === 'minsec') {
    const total = Math.max(0, Math.round(value));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  if (f === 'hrmin') {
    const total = Math.max(0, Math.round(value));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `${h}:${String(m).padStart(2, '0')}`;
  }
  if (f === 'money') return '$' + Math.round(value).toLocaleString();
  const u = (unit ?? '').trim();
  return `${trimNum(value)}${u ? ' ' + u : ''}`;
}

/** Parse a typed string into a stored numeric value, per unit token. null if
 *  invalid. Time accepts "m:ss"/"h:mm" (or a raw number); money/other strip $/commas.
 *  (Entry now flows through ValueInput; this remains for any raw-string callers.) */
export function parseValue(str: string, unit?: string): number | null {
  const t = (str ?? '').trim();
  if (!t) return null;
  const f = valueFormat(unit);
  if (f === 'minsec' || f === 'hrmin') {
    if (t.includes(':')) {
      const [aa, bb] = t.split(':');
      const a = parseInt(aa, 10);
      const b = parseInt(bb, 10);
      if (isNaN(a) || isNaN(b) || b < 0 || b >= 60) return null;
      return f === 'hrmin' ? a * 3600 + b * 60 : a * 60 + b;
    }
    const n = parseFloat(t);            // raw number (seconds)
    return isNaN(n) ? null : n;
  }
  const n = parseFloat(t.replace(/[$,\s]/g, ''));
  return isNaN(n) ? null : n;
}
