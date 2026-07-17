// Value formatting/parsing for VALUE goals, keyed on the goal's unit.
//  - unit 'sec' (a time value) → mm:ss  (381 ⇄ "6:21")
//  - unit '$'                  → "$1,234"
//  - anything else             → "<value> <unit>"  ("225 lbs", "8 hrs")

export function isTimeUnit(unit?: string): boolean {
  const u = (unit ?? '').trim().toLowerCase();
  return u === 'sec' || u === 'secs' || u === 'seconds' || u === 'time';
}

export function isMoneyUnit(unit?: string): boolean {
  return (unit ?? '').trim() === '$';
}

function trimNum(n: number): string {
  // Whole numbers → no decimals; otherwise up to 2 decimals. Thousands-separated.
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Format a stored numeric value for display, per unit. */
export function formatValue(value: number, unit?: string): string {
  if (isTimeUnit(unit)) {
    const total = Math.max(0, Math.round(value));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  if (isMoneyUnit(unit)) return '$' + Math.round(value).toLocaleString();
  const u = (unit ?? '').trim();
  return `${trimNum(value)}${u ? ' ' + u : ''}`;
}

/** Parse a typed string into a stored numeric value, per unit. null if invalid.
 *  Time accepts "mm:ss" (or raw seconds); money/other strip $ and commas. */
export function parseValue(str: string, unit?: string): number | null {
  const t = (str ?? '').trim();
  if (!t) return null;
  if (isTimeUnit(unit)) {
    if (t.includes(':')) {
      const [mm, ss] = t.split(':');
      const m = parseInt(mm, 10);
      const s = parseInt(ss, 10);
      if (isNaN(m) || isNaN(s) || s < 0 || s >= 60) return null;
      return m * 60 + s;
    }
    const n = parseFloat(t);            // raw seconds
    return isNaN(n) ? null : n;
  }
  const n = parseFloat(t.replace(/[$,\s]/g, ''));
  return isNaN(n) ? null : n;
}
