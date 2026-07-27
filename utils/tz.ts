// IANA timezone helpers built on Intl.DateTimeFormat — no dependency (the app
// already relies on Intl for prefs.timezone, and RN/Hermes Intl tz support is the
// exact thing to verify on-device). We store IANA zone names only; the tz database
// resolves DST by date automatically. NEVER store abbreviations like "PST".
//
// ⚠️ VERIFY ON iOS RELEASE: zone conversion here depends on Intl having tz data.
// It is web-verifiable; confirm formatInZone / wallClockToUtc on an iOS release build.

/** The device's current IANA zone, e.g. "America/New_York". */
export function deviceTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}

// Offset (ms) that wall-clock time in `tz` is AHEAD of UTC at a given instant.
// Positive east of UTC. Uses formatToParts to read the zone's wall clock for the
// instant, then compares to the instant's UTC fields.
function tzOffsetMs(instant: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(instant)) map[p.type] = p.value;
  const asUTC = Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour, +map.minute, +map.second);
  return asUTC - instant.getTime();
}

// Parse a naive wall-clock string "YYYY-MM-DDTHH:mm[:ss]" (or "YYYY-MM-DD" + "HH:mm").
function parseWall(s: string): { y: number; mo: number; d: number; h: number; mi: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s ?? '');
  if (!m) return null;
  return { y: +m[1], mo: +m[2], d: +m[3], h: +(m[4] ?? '0'), mi: +(m[5] ?? '0') };
}

/**
 * Convert a wall-clock time in a specific IANA zone to the real UTC instant.
 * `wall` is "YYYY-MM-DDTHH:mm" interpreted in `tz`.
 * DST edges: spring-forward skipped time → resolves forward past the gap;
 * fall-back repeated time → resolves to the first (earlier) occurrence.
 * Returns null on malformed input.
 */
export function wallClockToUtc(wall: string, tz: string): Date | null {
  const w = parseWall(wall);
  if (!w) return null;
  // Pretend the wall-clock fields are UTC, then correct by the zone offset.
  const asUTC = Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, 0);
  const off1 = tzOffsetMs(new Date(asUTC), tz);
  let utc = asUTC - off1;
  // One refinement pass: near a DST boundary the offset at the guessed instant can
  // differ from the offset at the corrected instant; re-correct so the result is a
  // real instant (first occurrence on fall-back, shifted-forward on spring-forward).
  const off2 = tzOffsetMs(new Date(utc), tz);
  if (off2 !== off1) utc = asUTC - off2;
  return new Date(utc);
}

/**
 * Resolve a floating (viewer_local) time to an instant in the VIEWER's current tz.
 * Constructing a Date from local components uses the device zone by definition.
 */
export function viewerLocalInstant(localDate: string, localTime: string): Date | null {
  const w = parseWall(`${localDate}T${localTime || '00:00'}`);
  if (!w) return null;
  return new Date(w.y, w.mo - 1, w.d, w.h, w.mi, 0);
}

/** Format an instant in a specific zone, e.g. "7:00 PM". */
export function formatInZone(instant: Date | number, tz: string, opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, ...opts }).format(instant);
  } catch {
    return new Intl.DateTimeFormat('en-US', opts).format(instant);
  }
}

/** Short zone label for an instant, e.g. "PST" / "GMT+2". Empty on failure. */
export function zoneAbbrev(instant: Date | number, tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short', hour: '2-digit' }).formatToParts(instant);
    return parts.find(p => p.type === 'timeZoneName')?.value ?? '';
  } catch { return ''; }
}

/** True when two IANA zones resolve to the SAME offset for an instant (so we can
 *  skip a redundant "your time" label when origin and viewer coincide). */
export function sameWallClock(instant: Date | number, tzA: string, tzB: string): boolean {
  if (tzA === tzB) return true;
  const d = typeof instant === 'number' ? new Date(instant) : instant;
  return tzOffsetMs(d, tzA) === tzOffsetMs(d, tzB);
}
