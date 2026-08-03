import { Event, CountdownType } from '../store/types';
import { toDate, isValidDate } from './dates';
import { deviceTz, wallClockToUtc, viewerLocalInstant, formatInZone, zoneAbbrev, sameWallClock } from './tz';

// The live hr:min:sec countdown only kicks in when an event is THIS close; beyond
// it we show whole days. Named tunable — raise/lower to change when ticking starts.
export const LIVE_TICK_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24h

// Resolve the countdown type, inferring for legacy rows that predate the field:
// a stored startAtUtc ⇒ exact_instant, a viewer_local marker ⇒ viewer_local,
// otherwise date_only (the original all-day behavior). Never throws.
export function countdownType(e: Event): CountdownType {
  if (e.countdownType) return e.countdownType;
  if (e.startAtUtc) return 'exact_instant';
  if (e.localTime && e.localDate) return 'viewer_local';
  return 'date_only';
}

export const isDateOnly = (e: Event) => countdownType(e) === 'date_only';
export const isTimed = (e: Event) => countdownType(e) !== 'date_only';

// The real START instant (ms) for the current countdown, per type. date_only maps
// to viewer-LOCAL midnight of its date (unchanged whole-day behavior). Returns null
// only on malformed data.
export function eventStartMs(e: Event): number | null {
  const t = countdownType(e);
  if (t === 'exact_instant') {
    const ms = e.startAtUtc ? Date.parse(e.startAtUtc) : NaN;
    return isNaN(ms) ? null : ms;
  }
  if (t === 'viewer_local') {
    const d = viewerLocalInstant(e.localDate ?? '', e.localTime ?? '');
    return d && isValidDate(d) ? d.getTime() : null;
  }
  // date_only → local midnight of the date part of `start`.
  const d = toDate((e.start ?? '').slice(0, 10));
  return isValidDate(d) ? d.getTime() : null;
}

// The END instant (ms), or null when the event has no end. date_only endDate is
// EXCLUSIVE (July 4–8 → ends when the 8th begins), matching calendar convention.
export function eventEndMs(e: Event): number | null {
  const t = countdownType(e);
  if (t === 'exact_instant') {
    if (!e.endAtUtc) return null;
    const ms = Date.parse(e.endAtUtc);
    return isNaN(ms) ? null : ms;
  }
  if (t === 'date_only') {
    if (!e.endDate) return null;
    const d = toDate(e.endDate);          // exclusive: local midnight of endDate
    return isValidDate(d) ? d.getTime() : null;
  }
  return null; // viewer_local has no end in this build
}

// Live ticking clock, e.g. "2:05:10" (h:mm:ss) or "5:09" (m:ss) for < 1h.
export function formatHMS(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(ss)}` : `${m}:${p(ss)}`;
}

export type CountdownPhase = 'before' | 'during' | 'after';

export interface CountdownInfo {
  type: CountdownType;
  phase: CountdownPhase;
  targetMs: number | null;   // instant the countdown currently counts DOWN to
  startMs: number | null;
  endMs: number | null;
  live: boolean;             // near enough to tick hr:min:sec (timed only)
  passed: boolean;           // start (or end) instant is in the past
  visibleToday: boolean;     // still show it today (linger — no silent vanish)
}

// The START/END state machine + live-tick gating + passing/linger, computed once
// from `now` so callers don't re-derive it. For date_only this stays a whole-day
// concept (targets local midnight); the live tick is never enabled for date_only.
export function countdownInfo(e: Event, now: number = Date.now()): CountdownInfo {
  const type = countdownType(e);
  const startMs = eventStartMs(e);
  const endMs = eventEndMs(e);

  let phase: CountdownPhase = 'before';
  let targetMs: number | null = startMs;
  if (startMs != null && now >= startMs) {
    if (endMs != null && now < endMs) { phase = 'during'; targetMs = endMs; }
    else if (endMs != null && now >= endMs) { phase = 'after'; targetMs = endMs; }
    else { phase = endMs == null ? 'after' : 'during'; targetMs = endMs ?? startMs; }
  }

  const passedInstant = endMs ?? startMs;
  const passed = passedInstant != null && now >= passedInstant;

  // Linger: after passing, keep showing through the END of that local day (so a
  // timed event doesn't vanish at the passing minute — matches all-day lingering).
  let visibleToday = true;
  if (passed && passedInstant != null) {
    const p = new Date(passedInstant);
    const endOfDay = new Date(p.getFullYear(), p.getMonth(), p.getDate() + 1, 0, 0, 0).getTime();
    visibleToday = now < endOfDay;
  }

  const live = type !== 'date_only' && phase !== 'after' && targetMs != null
    && targetMs - now > 0 && targetMs - now <= LIVE_TICK_THRESHOLD_MS;

  return { type, phase, targetMs, startMs, endMs, live, passed, visibleToday };
}

// ── Passing lifecycle (pure function of the clock — no stored flag, no job) ──

// A one-shot event lingers in Upcoming for this long AFTER it passes, then archives.
export const LINGER_WINDOW_MS = 48 * 60 * 60 * 1000; // 48h

// The instant a ONE-SHOT event's countdown truly completes, for lifecycle staging.
// Reuses the SAME date resolvers as countdownInfo (no second passing calc):
//  - timed: its end instant, else its start instant.
//  - all-day: END of its last LOCAL day — an exclusive endDate midnight, or the
//    midnight AFTER a single-day event (so an all-day event is "today" all day).
// Returns null for recurring events (they advance to a future occurrence → never
// pass) and for malformed data.
export function eventPassedAtMs(e: Event, now: number = Date.now()): number | null {
  if (e.recur) return null;
  const startMs = eventStartMs(e);
  const endMs = eventEndMs(e);
  if (isTimed(e)) return endMs ?? startMs;
  if (endMs != null) return endMs;                     // date_only range → exclusive end midnight
  if (startMs == null) return null;
  const d = new Date(startMs);                         // single all-day day → next local midnight
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0).getTime();
}

export type EventStage = 'upcoming' | 'recently_passed' | 'archived';

// upcoming → not yet passed (incl. every recurring event).
// recently_passed → passed within LINGER_WINDOW_MS (stays in Upcoming, de-emphasized).
// archived → passed longer ago (leaves Upcoming; shows only in History).
export function eventStage(e: Event, now: number = Date.now()): EventStage {
  const at = eventPassedAtMs(e, now);
  if (at == null || now < at) return 'upcoming';
  return now - at <= LINGER_WINDOW_MS ? 'recently_passed' : 'archived';
}

/** True once a one-shot event has passed (recently_passed OR archived). */
export const isPassedEvent = (e: Event, now: number = Date.now()) => eventStage(e, now) !== 'upcoming';

// ── Display helpers ─────────────────────────────────────────────────────────

// The origin zone for an exact_instant (falls back to device tz).
export function originTz(e: Event): string {
  return e.eventTimezone || deviceTz();
}

// A "7:00 PM" (or "7:00–9:00 PM") time label for a timed event, in the VIEWER's
// zone by default. For exact_instant whose origin tz ≠ viewer tz, appends BOTH
// ("7:30 PM PT · 10:30 PM your time"). Empty for date_only.
export function eventTimeLabel(e: Event, viewerTz: string = deviceTz()): string {
  const type = countdownType(e);
  if (type === 'date_only') return '';
  const startMs = eventStartMs(e);
  if (startMs == null) return '';
  const endMs = eventEndMs(e);
  const timeOpts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

  const range = (tz: string) =>
    endMs != null
      ? `${formatInZone(startMs, tz, timeOpts)}–${formatInZone(endMs, tz, timeOpts)}`
      : formatInZone(startMs, tz, timeOpts);

  if (type === 'viewer_local') return range(viewerTz); // floating: viewer zone is the truth

  // exact_instant: show viewer-local; add origin-tz label when they differ.
  const oTz = originTz(e);
  if (sameWallClock(startMs, oTz, viewerTz)) return range(viewerTz);
  return `${range(oTz)} ${zoneAbbrev(startMs, oTz)} · ${range(viewerTz)} your time`;
}

// Whole-day + phase status text for the card/detail, e.g. "Starts in …",
// "Happening now · Ends …", "Ended". date_only returns '' (uses existing rendering).
export function eventStatusText(e: Event, info: CountdownInfo): string {
  if (info.type === 'date_only') return '';
  if (info.phase === 'during') return 'Happening now';
  if (info.phase === 'after') return 'Ended';
  return '';
}
