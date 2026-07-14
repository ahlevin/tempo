import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Event, Goal, Memory, Alert } from '../store/types';
import { nextOccurrence, nextAnnual, toDate, isValidDate } from '../utils/dates';

// Notifications only run on the native app. On web everything below is a no-op.
const isNative = Platform.OS !== 'web';

// Show notifications while the app is foregrounded (native only).
if (isNative) {
  Notifications.setNotificationHandler({
    // expo-notifications (SDK 56) replaced the deprecated `shouldShowAlert` with
    // `shouldShowBanner` + `shouldShowList`. Show the banner and list while
    // foregrounded, play a sound, don't touch the badge.
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const UNIT_MS: Record<Alert['unit'], number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
  weeks: 604_800_000,
  months: 2_592_000_000, // ~30 days (approximate)
};
const offsetMs = (a: Alert) => (a.value || 0) * (UNIT_MS[a.unit] || 0);
const unitLabel = (a: Alert) => (a.value === 1 ? a.unit.replace(/s$/, '') : a.unit);
// Date-only items (all-day events, goal deadlines, birthdays, life-log entries)
// use 9:00 AM LOCAL on the item's date as the BASE instant, and the alert offset
// is subtracted from THAT with full precision — so "1 day before" → 9am the
// previous day, "2 hours before" → 7am the same day. (Previously at9am was
// applied AFTER subtracting the offset, which discarded the sub-day precision
// and collapsed most offsets to "9am the previous day" — often already in the
// past and silently skipped.)
const at9am = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0);

// Diagnostic logging (native path only — rescheduleAll no-ops on web). Plain
// console.log so it shows in the TestFlight device console; lets us verify what
// actually gets scheduled vs skipped as past.
const logFire = (kind: string, name: string, fire: Date, scheduling: boolean) =>
  console.log(`[notif] ${kind} "${name}" fire=${fire.toString()} now=${new Date().toString()} → ${scheduling ? 'SCHEDULING' : 'SKIPPED(past)'}`);

/** Request notification permission on native; silently returns false on web. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted || cur.status === 'granted') return true;
    const next = await Notifications.requestPermissionsAsync();
    return next.granted || next.status === 'granted';
  } catch (e) {
    console.warn('[notifications] permission request failed', e);
    return false;
  }
}

interface Snapshot { events: Event[]; goals: Goal[]; memories: Memory[]; }

/**
 * Cancel and re-schedule all local notifications from the current data. Call on
 * app load and whenever items/alerts/dates change. No-op on web or without
 * permission. Idempotent — safe to call repeatedly.
 */
export async function rescheduleAll(data: Snapshot): Promise<void> {
  if (!isNative) return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!(perm.granted || perm.status === 'granted')) return; // don't schedule without permission
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = Date.now();

    // Events — one-shot DATE trigger at next occurrence minus the offset. Recurring
    // events get their following instance re-scheduled on the next rescheduleAll.
    for (const e of data.events) {
      if (!e.alerts?.length) continue;
      const start = toDate(nextOccurrence(e));
      if (!isValidDate(start)) continue;
      // All-day → base is 9:00 AM local on the event date; timed → the exact start.
      const base = e.allDay ? at9am(start) : start;
      for (const a of e.alerts) {
        const fire = new Date(base.getTime() - offsetMs(a)); // full offset precision
        const ok = fire.getTime() > now;
        logFire('event', e.name, fire, ok);
        if (!ok) continue;
        await schedule(
          { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fire },
          `${e.emoji} ${e.name}`, `Starts in ${a.value} ${unitLabel(a)}`,
        );
      }
    }

    // Birthdays / anniversaries — YEARLY trigger so they recur every year without
    // needing the app open. Fires at 9am on (next occurrence − offset).
    for (const m of data.memories) {
      if (m.type !== 'birthday' && m.type !== 'anniversary' && m.type !== 'memorial') continue;
      if (!m.alerts?.length) continue;
      const occ = toDate(nextAnnual(m.originDate));
      if (!isValidDate(occ)) continue;
      const base = at9am(occ); // 9:00 AM local on the occurrence date
      const kind = m.type === 'birthday' ? 'Birthday' : m.type === 'memorial' ? 'Memorial' : 'Anniversary';
      for (const a of m.alerts) {
        const fire = new Date(base.getTime() - offsetMs(a)); // precise; keeps hours/minutes
        // YEARLY recurs by month/day/time, so no past-skip; use the precise fire.
        logFire('memory', m.name, fire, true);
        await schedule(
          {
            type: Notifications.SchedulableTriggerInputTypes.YEARLY,
            day: fire.getDate(), month: fire.getMonth(), hour: fire.getHours(), minute: fire.getMinutes(),
          },
          `${m.emoji} ${m.name}`, `${kind} in ${a.value} ${unitLabel(a)}`,
        );
      }
    }

    // Goals — one-shot DATE trigger at deadline minus the offset (9am).
    for (const g of data.goals) {
      if (!g.alerts?.length) continue;
      const gdate = toDate(g.date);
      if (!isValidDate(gdate)) continue;
      const base = at9am(gdate); // goals are date-only → 9:00 AM on the deadline date
      for (const a of g.alerts) {
        const fire = new Date(base.getTime() - offsetMs(a));
        const ok = fire.getTime() > now;
        logFire('goal', g.name, fire, ok);
        if (!ok) continue;
        await schedule(
          { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fire },
          `${g.emoji} ${g.name}`, `Deadline in ${a.value} ${unitLabel(a)}`,
        );
      }
    }

    // Future-dated life-log ENTRIES with reminders — an attached upcoming item is
    // the single source of truth (no standalone event), so schedule it here just
    // like an all-day event: fire at 9am on (entry date − offset). Past/dateless
    // entries and those without alerts are skipped.
    for (const m of data.memories) {
      for (const e of m.entries) {
        if (!e.alerts?.length || !e.date) continue;
        const day = toDate(`${e.date}T00:00:00`);
        if (!isValidDate(day)) continue;
        const base = at9am(day); // entries are date-only → 9:00 AM on the entry date
        const label = e.item || m.name;
        for (const a of e.alerts) {
          const fire = new Date(base.getTime() - offsetMs(a));
          const ok = fire.getTime() > now;
          logFire('logentry', label, fire, ok);
          if (!ok) continue;
          await schedule(
            { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fire },
            `${m.emoji} ${label}`, `In ${a.value} ${unitLabel(a)}`,
          );
        }
      }
    }

    // Confirm what iOS actually holds now (diagnostic — device console).
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`[notif] pending=${pending.length}`, pending.slice(0, 5).map(p => JSON.stringify(p.trigger)));
  } catch (e) {
    console.warn('[notifications] rescheduleAll failed', e);
  }
}

async function schedule(trigger: any, title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger });
  } catch (e) {
    console.warn('[notifications] schedule failed for', title, e);
  }
}
