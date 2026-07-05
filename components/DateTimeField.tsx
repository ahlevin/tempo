import { createElement, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { format } from 'date-fns';
import { Colors } from '../constants/colors';
import { fmt, toDate, fmtDateTime, isValidDate } from '../utils/dates';

// Native module only — never loaded on web (it has no web implementation).
const DateTimePicker: any =
  Platform.OS !== 'web' ? require('@react-native-community/datetimepicker').default : null;

export type DateTimeMode = 'date' | 'datetime';

interface Props {
  /** 'date' mode uses "YYYY-MM-DD"; 'datetime' mode uses full ISO "YYYY-MM-DDTHH:mm:ss". */
  value: string;
  onChange: (next: string) => void;
  mode?: DateTimeMode;
  label?: string;
}

export function DateTimeField({ value, onChange, mode = 'date', label }: Props) {
  const [show, setShow] = useState(false);
  const [androidStep, setAndroidStep] = useState<'date' | 'time'>('date');
  const partial = useRef<Date | null>(null);

  // Guard against a partial/invalid `value` (e.g. mid-typing "03032012") — never
  // feed an Invalid Date into format(), which throws "Invalid time value".
  const parsed = toDate(value);
  const valid = isValidDate(parsed);
  const current = valid ? parsed : new Date();
  const display = !valid ? '' : (mode === 'date' ? format(current, 'EEE, MMM d, yyyy') : fmtDateTime(value, false));

  function emit(d: Date) {
    if (!isValidDate(d)) return;
    onChange(mode === 'date' ? fmt(d) : `${fmt(d)}T${format(d, 'HH:mm:ss')}`);
  }

  // ---- Web: use the browser's native date / datetime-local input ----
  if (Platform.OS === 'web') {
    return (
      <View style={{ marginBottom: 14 }}>
        {!!label && <FieldLabel text={label} />}
        {createElement('input' as any, {
          type: mode === 'date' ? 'date' : 'datetime-local',
          value: mode === 'date' ? value.slice(0, 10) : value.slice(0, 16),
          onChange: (e: any) => {
            const v: string = e.target.value;
            if (!v) return;
            // Only commit a value that actually parses to a valid date; while the
            // user is mid-typing an incomplete/invalid date, hold the raw text.
            const next = mode === 'date' ? v : v.length === 16 ? `${v}:00` : v;
            if (isValidDate(toDate(next))) onChange(next);
          },
          style: {
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 12,
            color: Colors.text1,
            fontSize: 15,
            width: '100%',
            colorScheme: 'dark',
            outline: 'none',
            boxSizing: 'border-box',
          },
        } as any)}
      </View>
    );
  }

  // ---- Native: tap to open the platform picker ----
  function handleChange(event: any, selected?: Date) {
    if (Platform.OS === 'android') {
      // Android fires a dialog per step and dismisses each time.
      if (event?.type === 'dismissed' || !selected) {
        setShow(false); setAndroidStep('date'); partial.current = null;
        return;
      }
      if (mode === 'datetime' && androidStep === 'date') {
        partial.current = selected;   // hold the date, then ask for the time
        setAndroidStep('time');
        return;
      }
      const base = mode === 'datetime' && partial.current ? partial.current : selected;
      const finalD = mode === 'datetime' && partial.current
        ? new Date(base.getFullYear(), base.getMonth(), base.getDate(), selected.getHours(), selected.getMinutes())
        : selected;
      setShow(false); setAndroidStep('date'); partial.current = null;
      emit(finalD);
    } else {
      // iOS: inline spinner, updates live.
      if (selected) emit(selected);
    }
  }

  return (
    <View style={{ marginBottom: 14 }}>
      {!!label && <FieldLabel text={label} />}
      <Pressable onPress={() => { setAndroidStep('date'); setShow(true); }}
        style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 }}>
        <Text style={{ color: Colors.text1, fontSize: 15 }}>{display}</Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={current}
          mode={Platform.OS === 'android' && mode === 'datetime' ? androidStep : mode}
          is24Hour={false}
          display="default"
          onChange={handleChange}
        />
      )}
      {Platform.OS === 'ios' && show && (
        <Pressable onPress={() => setShow(false)} style={{ alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 4 }}>
          <Text style={{ color: Colors.accent, fontWeight: '700', fontSize: 14 }}>Done</Text>
        </Pressable>
      )}
    </View>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.text3,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{text}</Text>
  );
}
