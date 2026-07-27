import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { DateTimeField } from './DateTimeField';
import { Event, CountdownType } from '../store/types';
import { countdownType } from '../utils/events';
import { deviceTz, wallClockToUtc } from '../utils/tz';

// One controlled editor for an event's timing across all three countdown types,
// used by both add-event and edit-event. The parent owns a WhenValue; the mapping
// helpers convert to/from the Event fields (and default a new one).

export interface WhenValue {
  type: CountdownType;
  dateOnlyDate: string;   // "YYYY-MM-DD"
  dateOnlyEnd: string;    // "" or exclusive end "YYYY-MM-DD"
  exactStart: string;     // origin wall-clock "YYYY-MM-DDTHH:mm:ss"
  exactEnd: string;       // origin wall-clock end
  exactHasEnd: boolean;
  exactTz: string;        // IANA
  floatWhen: string;      // viewer-local wall-clock "YYYY-MM-DDTHH:mm:ss"
}

const addHour = (iso: string) => {
  const d = new Date(iso.length >= 19 ? iso : iso + ':00');
  if (isNaN(d.getTime())) return iso;
  d.setHours(d.getHours() + 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
};

const pad2 = (n: number) => String(n).padStart(2, '0');
// A naive wall-clock string "YYYY-MM-DDTHH:mm:ss" from a Date's LOCAL parts (never
// UTC — avoids the midnight-UTC off-by-one that flips the day in UTC− zones).
const localWall = (dt: Date) =>
  `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}T${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:00`;
const localDateStr = (dt: Date) => `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;

// Sensible new-countdown defaults, computed from the viewer's LOCAL clock:
//  - date        = today (local)
//  - time        = the NEXT round hour (10:03 → 11:00; 10:00 → 11:00), like
//                  Google/Apple Calendar. Rolling past midnight advances the date
//                  (JS Date normalizes hour 24 → next local day).
//  - end (when added) = start + 1h; timezone = device tz.
export function defaultWhen(now: Date = new Date()): WhenValue {
  const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
  const plusOne = new Date(nextHour.getTime() + 60 * 60 * 1000);
  return {
    type: 'date_only',
    dateOnlyDate: localDateStr(now),
    dateOnlyEnd: '',
    exactStart: localWall(nextHour),
    exactEnd: localWall(plusOne),
    exactHasEnd: false,
    exactTz: deviceTz(),
    floatWhen: localWall(nextHour),
  };
}

// Prefill the editor from an existing event (for edit / type conversions).
export function eventToWhen(e: Event): WhenValue {
  const t = countdownType(e);
  const base = defaultWhen();
  if (t === 'exact_instant') {
    return { ...base, type: t,
      exactStart: e.startLocal || e.start || base.exactStart,
      exactEnd: e.endLocal || e.end || base.exactEnd,
      exactHasEnd: !!(e.endAtUtc || e.endLocal),
      exactTz: e.eventTimezone || deviceTz() };
  }
  if (t === 'viewer_local') {
    return { ...base, type: t,
      floatWhen: `${e.localDate ?? base.dateOnlyDate}T${e.localTime ?? '09:00'}:00` };
  }
  return { ...base, type: 'date_only',
    dateOnlyDate: (e.start ?? '').slice(0, 10) || base.dateOnlyDate,
    dateOnlyEnd: e.endDate || '' };
}

// Convert the editor value into the Event timing fields on save. Returns null with
// a reason string when invalid (e.g. exact end not after start).
export function whenToEventFields(w: WhenValue):
  { fields: Partial<Event>; error?: undefined } | { fields?: undefined; error: string } {
  if (w.type === 'date_only') {
    const d = w.dateOnlyDate.slice(0, 10);
    const endExclusive = w.dateOnlyEnd ? w.dateOnlyEnd.slice(0, 10) : null;
    if (endExclusive && endExclusive <= d) return { error: 'End date must be after the start date.' };
    return { fields: {
      allDay: true, start: `${d}T00:00:00`, end: null, date: d,
      countdownType: 'date_only', endDate: endExclusive,
      startAtUtc: null, endAtUtc: null, eventTimezone: null, startLocal: null, endLocal: null,
      localDate: null, localTime: null,
    } };
  }
  if (w.type === 'exact_instant') {
    const tz = w.exactTz || deviceTz();
    const startUtc = wallClockToUtc(w.exactStart, tz);
    if (!startUtc) return { error: 'Enter a valid start date & time.' };
    let endLocal: string | null = null, endUtcIso: string | null = null;
    if (w.exactHasEnd) {
      const endUtc = wallClockToUtc(w.exactEnd, tz);
      if (!endUtc) return { error: 'Enter a valid end date & time.' };
      if (endUtc.getTime() <= startUtc.getTime()) return { error: 'End must be after start.' };
      endLocal = w.exactEnd; endUtcIso = endUtc.toISOString();
    }
    return { fields: {
      allDay: false, start: w.exactStart, end: w.exactHasEnd ? w.exactEnd : null, date: w.exactStart.slice(0, 10),
      countdownType: 'exact_instant',
      startAtUtc: startUtc.toISOString(), endAtUtc: endUtcIso,
      eventTimezone: tz, startLocal: w.exactStart, endLocal,
      endDate: null, localDate: null, localTime: null,
    } };
  }
  // viewer_local
  const d = w.floatWhen.slice(0, 10);
  const time = w.floatWhen.slice(11, 16) || '09:00';
  return { fields: {
    allDay: false, start: w.floatWhen, end: null, date: d,
    countdownType: 'viewer_local', localDate: d, localTime: time,
    startAtUtc: null, endAtUtc: null, eventTimezone: null, startLocal: null, endLocal: null, endDate: null,
  } };
}

const TYPES: { type: CountdownType; label: string; hint: string }[] = [
  { type: 'date_only',     label: 'On a date',                          hint: 'All-day — counts to midnight in your timezone.' },
  { type: 'exact_instant', label: 'At an exact date & time',            hint: 'One worldwide moment (concert, launch, dinner).' },
  { type: 'viewer_local',  label: "At this time in each person's zone",  hint: 'Floating — zero arrives at everyone’s own local time.' },
];

// Common quick-pick zones + the device zone; any IANA name can be typed.
const QUICK_TZ = ['America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York', 'Europe/London', 'UTC'];
const isValidTz = (tz: string) => { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; } };

export function CountdownWhenEditor({ value: w, onChange }: { value: WhenValue; onChange: (w: WhenValue) => void }) {
  const { colors } = useTheme();
  const set = (patch: Partial<WhenValue>) => onChange({ ...w, ...patch });
  const [tzText, setTzText] = useState(w.exactTz);

  const fi = { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 12, color: colors.text1, fontSize: 15, marginBottom: 14 };

  const dev = deviceTz();

  return (
    <>
      <FL label="When does this countdown end?" />
      <View style={{ gap: 7, marginBottom: 14 }}>
        {TYPES.map(t => {
          const sel = w.type === t.type;
          return (
            <TouchableOpacity key={t.type} onPress={() => set({ type: t.type })}
              style={{ padding: 12, borderRadius: 12, borderWidth: 1.5,
                borderColor: sel ? colors.accent : colors.border,
                backgroundColor: sel ? (colors.isDark ? 'rgba(124,106,245,0.12)' : colors.tint) : colors.glass }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                  borderColor: sel ? colors.accent : colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  {sel && <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent }} />}
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: sel ? colors.accent : colors.text1 }}>{t.label}</Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.text3, marginTop: 4, marginLeft: 28 }}>{t.hint}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {w.type === 'date_only' && (
        <>
          <DateTimeField mode="date" label="Date" value={w.dateOnlyDate} onChange={d => set({ dateOnlyDate: d })} />
          {w.dateOnlyEnd ? (
            <>
              <DateTimeField mode="date" label="End date (exclusive — through the day before)" value={w.dateOnlyEnd} onChange={d => set({ dateOnlyEnd: d })} />
              <MiniLink label="Remove end date" onPress={() => set({ dateOnlyEnd: '' })} />
            </>
          ) : (
            <MiniLink label="+ Add end date (all-day range)" onPress={() => set({ dateOnlyEnd: w.dateOnlyDate })} />
          )}
        </>
      )}

      {w.type === 'exact_instant' && (
        <>
          <DateTimeField mode="datetime" label="Starts" value={w.exactStart} onChange={d => set({ exactStart: d })} />
          {w.exactHasEnd ? (
            <>
              <DateTimeField mode="datetime" label="Ends" value={w.exactEnd} onChange={d => set({ exactEnd: d })} />
              <MiniLink label="Remove end time" onPress={() => set({ exactHasEnd: false })} />
            </>
          ) : (
            <MiniLink label="+ Add end time" onPress={() => set({ exactHasEnd: true, exactEnd: addHour(w.exactStart) })} />
          )}

          <FL label="Timezone (IANA)" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {[dev, ...QUICK_TZ.filter(z => z !== dev)].map(z => {
              const sel = w.exactTz === z;
              return (
                <TouchableOpacity key={z} onPress={() => { set({ exactTz: z }); setTzText(z); }}
                  style={{ paddingVertical: 7, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1.5,
                    borderColor: sel ? colors.accent : colors.border,
                    backgroundColor: sel ? (colors.isDark ? 'rgba(124,106,245,0.12)' : colors.tint) : colors.glass }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: sel ? colors.accent : colors.text2 }}>
                    {z === dev ? `Device (${z})` : z}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput value={tzText} onChangeText={t => { setTzText(t); if (isValidTz(t.trim())) set({ exactTz: t.trim() }); }}
            autoCapitalize="none" placeholder="America/Los_Angeles" placeholderTextColor={colors.text3} style={fi} />
          {!isValidTz(tzText.trim()) && <Text style={{ fontSize: 11, color: colors.rose, marginTop: -8, marginBottom: 12 }}>Not a recognized IANA zone — using {w.exactTz}.</Text>}
        </>
      )}

      {w.type === 'viewer_local' && (
        <>
          <DateTimeField mode="datetime" label="Time (in each viewer's own zone)" value={w.floatWhen} onChange={d => set({ floatWhen: d })} />
          <Text style={{ fontSize: 12, color: colors.text3, marginTop: -8, marginBottom: 12, marginLeft: 2 }}>
            No timezone stored — the countdown hits zero at this wall-clock time wherever the viewer is.
          </Text>
        </>
      )}
    </>
  );
}

function FL({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text3,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</Text>;
}

function MiniLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} style={{ marginTop: -6, marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>{label}</Text>
    </TouchableOpacity>
  );
}
