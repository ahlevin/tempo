import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Event, Goal, Memory, Alert } from '../store/types';
import { nextOccurrence, nextAnnual, toDate, isValidDate } from '../utils/dates';

// Notifications only run on the native app. On web everything below is a no-op.
const isNative = Platform.OS !== 'web';

// Show notifications while the app is foregrounded (native only).
if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
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
// Date-only items (birthdays, all-day events, goal deadlines) fire the reminder
// at 9am local rather than midnight.
const at9am = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0);

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
      for (const a of e.alerts) {
        let fire = new Date(start.getTime() - offsetMs(a));
        if (e.allDay) fire = at9am(fire);
        if (fire.getTime() <= now) continue;
        await schedule(
          { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fire },
          `${e.emoji} ${e.name}`, `Starts in ${a.value} ${unitLabel(a)}`,
        );
      }
    }

    // Birthdays / anniversaries — YEARLY trigger so they recur every year without
    // needing the app open. Fires at 9am on (next occurrence − offset).
    for (const m of data.memories) {
      if (m.type !== 'birthday' && m.type !== 'anniversary') continue;
      if (!m.alerts?.length) continue;
      const base = toDate(nextAnnual(m.originDate));
      if (!isValidDate(base)) continue;
      const kind = m.type === 'birthday' ? 'Birthday' : 'Anniversary';
      for (const a of m.alerts) {
        const fire = at9am(new Date(base.getTime() - offsetMs(a)));
        await schedule(
          {
            type: Notifications.SchedulableTriggerInputTypes.YEARLY,
            day: fire.getDate(), month: fire.getMonth(), hour: 9, minute: 0,
          },
          `${m.emoji} ${m.name}`, `${kind} in ${a.value} ${unitLabel(a)}`,
        );
      }
    }

    // Goals — one-shot DATE trigger at deadline minus the offset (9am).
    for (const g of data.goals) {
      if (!g.alerts?.length) continue;
      const base = toDate(g.date);
      if (!isValidDate(base)) continue;
      for (const a of g.alerts) {
        const fire = at9am(new Date(base.getTime() - offsetMs(a)));
        if (fire.getTime() <= now) continue;
        await schedule(
          { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fire },
          `${g.emoji} ${g.name}`, `Deadline in ${a.value} ${unitLabel(a)}`,
        );
      }
    }
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
