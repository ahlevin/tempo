import { useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../../contexts/ThemeContext';
import { CloseButton } from '../../components/CloseButton';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../contexts/AuthContext';
import { rescheduleAll, notifRunStats } from '../../lib/notifications';
import { upcomingLogItems } from '../../utils/lifelog';

// Native-only on-device notification diagnostics. Read-only insight into
// permission, the auth-session gate, store counts, what iOS actually has
// scheduled, and the last rescheduleAll run — plus reschedule / test-ping / refresh.
export default function NotifDebugModal() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const events   = useStore(s => s.events);
  const goals    = useStore(s => s.goals);
  const memories = useStore(s => s.memories);
  const upcomingEntries = upcomingLogItems(memories).length;

  const native = Platform.OS !== 'web';
  const [perm, setPerm] = useState<Notifications.NotificationPermissionsStatus | null>(null);
  const [pending, setPending] = useState<Notifications.NotificationRequest[]>([]);
  const [, setTick] = useState(0); // force re-read of the mutable notifRunStats

  async function load() {
    if (!native) return;
    try { setPerm(await Notifications.getPermissionsAsync()); } catch { setPerm(null); }
    try { setPending(await Notifications.getAllScheduledNotificationsAsync()); } catch { setPending([]); }
    setTick(t => t + 1);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function doReschedule() {
    await rescheduleAll({ events, goals, memories });
    await load();
  }
  async function doTestPing() {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'sayZay test', body: 'If you see this, delivery works' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10 },
      });
    } catch { /* surfaced via the pending count on refresh */ }
    await load();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surf2 }} edges={['top']}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text1 }}>🔧 Notification Debug</Text>
        <CloseButton />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {!native ? (
          <Card colors={colors}>
            <Text style={{ fontSize: 13, color: colors.text2 }}>Notifications are native-only — this panel does nothing on web.</Text>
          </Card>
        ) : (
          <>
            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <Btn colors={colors} label="Reschedule now" onPress={doReschedule} />
              <Btn colors={colors} label="Test ping (10s)" onPress={doTestPing} />
              <Btn colors={colors} label="Refresh" onPress={load} />
            </View>

            <Sec label="Permission" colors={colors} />
            <Card colors={colors}>
              <Row colors={colors} k="granted" v={perm ? String(perm.granted) : '—'} />
              <Row colors={colors} k="status" v={perm?.status ?? '—'} />
              <Row colors={colors} k="ios.status" v={perm?.ios?.status != null ? String(perm.ios.status) : '—'} />
            </Card>

            <Sec label="Auth session gate" colors={colors} />
            <Card colors={colors}>
              <Row colors={colors} k="has session" v={String(!!session)}
                vColor={session ? colors.teal : colors.rose} />
              <Text style={{ fontSize: 11, color: colors.text3, marginTop: 4 }}>
                rescheduleAll's effect is gated on a session — false here means nothing schedules on start.
              </Text>
            </Card>

            <Sec label="Store counts" colors={colors} />
            <Card colors={colors}>
              <Row colors={colors} k="events" v={String(events.length)} />
              <Row colors={colors} k="memories" v={String(memories.length)} />
              <Row colors={colors} k="goals" v={String(goals.length)} />
              <Row colors={colors} k="upcoming log entries" v={String(upcomingEntries)} />
            </Card>

            <Sec label="Last rescheduleAll" colors={colors} />
            <Card colors={colors}>
              <Row colors={colors} k="last run"
                v={notifRunStats.lastRun ? notifRunStats.lastRun.toLocaleString() : '— never this session'}
                vColor={notifRunStats.lastRun ? colors.text1 : colors.rose} />
              <Row colors={colors} k="scheduled" v={String(notifRunStats.scheduled)} vColor={colors.teal} />
              <Row colors={colors} k="skipped (past)" v={String(notifRunStats.skipped)} vColor={colors.text2} />
            </Card>

            <Sec label={`Pending with iOS · ${pending.length}`} colors={colors} />
            <Card colors={colors}>
              {pending.length === 0 ? (
                <Text style={{ fontSize: 13, color: colors.text3 }}>Nothing scheduled.</Text>
              ) : pending.slice(0, 10).map((r, i) => (
                <View key={r.identifier ?? i} style={{ marginBottom: i === Math.min(pending.length, 10) - 1 ? 0 : 10,
                  paddingBottom: 10, borderBottomWidth: i === Math.min(pending.length, 10) - 1 ? 0 : 1, borderBottomColor: colors.border }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text1 }} numberOfLines={1}>
                    {r.content?.title || '(no title)'}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.text2, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                    {triggerText(r.trigger)}
                  </Text>
                </View>
              ))}
              {pending.length > 10 && (
                <Text style={{ fontSize: 11, color: colors.text3, marginTop: 8 }}>… and {pending.length - 10} more</Text>
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Stringify a scheduled trigger into a readable fire time (DATE / interval / yearly).
function triggerText(t: any): string {
  if (!t) return 'trigger: none';
  try {
    // DATE trigger — iOS returns { type:'date', value:<ms> }; also tolerate { date }.
    const ms = t.value ?? t.date;
    if ((t.type === 'date' || t.date != null || (typeof ms === 'number' && t.repeats == null)) && ms != null && !t.seconds) {
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return `date · ${d.toLocaleString()}`;
    }
    if (t.type === 'timeInterval' || t.seconds != null) {
      return `interval · ${t.seconds}s${t.repeats ? ' (repeats)' : ''}`;
    }
    if (t.type === 'yearly' || (t.month != null && t.day != null)) {
      const p2 = (n: number) => String(n).padStart(2, '0');
      return `yearly · ${p2((t.month ?? 0) + 1)}/${p2(t.day)} ${p2(t.hour ?? 0)}:${p2(t.minute ?? 0)}`;
    }
    return JSON.stringify(t);
  } catch {
    return JSON.stringify(t);
  }
}

function Sec({ label, colors }: { label: string; colors: any }) {
  return <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text3, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 8, marginTop: 4 }}>{label}</Text>;
}
function Card({ children, colors }: { children: React.ReactNode; colors: any }) {
  return <View style={{ backgroundColor: colors.surf, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 18 }}>{children}</View>;
}
function Row({ k, v, colors, vColor }: { k: string; v: string; colors: any; vColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3, gap: 12 }}>
      <Text style={{ fontSize: 13, color: colors.text2 }}>{k}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: vColor ?? colors.text1, flexShrink: 1, textAlign: 'right' }}
        numberOfLines={1}>{v}</Text>
    </View>
  );
}
function Btn({ label, onPress, colors }: { label: string; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity onPress={onPress}
      style={{ flex: 1, paddingVertical: 11, borderRadius: 11, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.glass, alignItems: 'center' }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.teal, textAlign: 'center' }}>{label}</Text>
    </TouchableOpacity>
  );
}
