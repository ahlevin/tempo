import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { isMoneyUnit, isTimeUnit } from '../utils/values';

// Unit-adaptive entry for a VALUE goal attempt. Emits the STORED numeric value
// (seconds for time, a plain number otherwise) or null while empty. The same
// control is used for logging a new attempt and editing an existing one.
//   TIME  ('sec'/'time', usually lower-is-better) → two fields, Min : Sec,
//          each typeable (numeric keyboard) AND scrollable (a spin wheel).
//   MONEY ('$')                                   → single "$" field, plain number.
//   PLAIN (lbs, books, miles, hrs, reps, …)       → single field + unit suffix.
export function ValueInput({ unit, value, onChange }: {
  unit?: string;
  value: number | null;
  onChange: (n: number | null) => void;
}) {
  const { colors } = useTheme();

  if (isTimeUnit(unit)) {
    const mm = value == null ? null : Math.floor(value / 60);
    const ss = value == null ? null : value % 60;
    const combine = (m: number | null, s: number | null) => {
      if (m == null && s == null) { onChange(null); return; }
      onChange((m ?? 0) * 60 + (s ?? 0));
    };
    return (
      <View style={{ marginBottom: 14 }}>
        <FL label="Time (min : sec)" />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <WheelField label="Min" value={mm} min={0} max={90} typeMax={999} onChange={m => combine(m, ss)} />
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text2, marginTop: 34 }}>:</Text>
          <WheelField label="Sec" value={ss} min={0} max={59} pad onChange={s => combine(mm, s)} />
        </View>
      </View>
    );
  }

  if (isMoneyUnit(unit)) return <MoneyField value={value} onChange={onChange} />;
  return <PlainField unit={unit} value={value} onChange={onChange} />;
}

// ── A single numeric field that is both typeable and (on native) scrollable ──
const ITEM_H = 34;

function WheelField({ label, value, min, max, typeMax, pad, onChange }: {
  label: string; value: number | null; min: number; max: number;
  typeMax?: number; pad?: boolean; onChange: (n: number | null) => void;
}) {
  const { colors } = useTheme();
  const web = Platform.OS === 'web';
  const focused = useRef(false);
  const [text, setText] = useState(value == null ? '' : String(value));
  // The wheel only spans min..max, but typing may exceed it (minutes for a
  // marathon-length time) up to typeMax.
  const hi = typeMax ?? max;

  // Keep the text buffer in sync with external value changes (prefill / wheel
  // spins) — but never yank text out from under the user while they're typing.
  useEffect(() => { if (!focused.current) setText(value == null ? '' : String(value)); }, [value]);

  const commit = (t: string) => {
    const clean = t.replace(/[^0-9]/g, '');
    setText(clean);
    if (clean === '') { onChange(null); return; }
    let n = parseInt(clean, 10);
    if (isNaN(n)) { onChange(null); return; }
    n = Math.max(min, Math.min(hi, n));   // clamp (seconds 0–59; minutes 0–999)
    onChange(n);
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <FL label={label} />
      <TextInput
        value={text}
        onChangeText={commit}
        onFocus={() => { focused.current = true; }}
        onBlur={() => { focused.current = false; setText(value == null ? '' : String(value)); }}
        keyboardType="number-pad"
        placeholder={pad ? '00' : '0'}
        placeholderTextColor={colors.text3}
        style={{ backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border,
          borderRadius: 12, paddingVertical: 10, width: 70, textAlign: 'center',
          color: colors.text1, fontSize: 20, fontWeight: '700' }}
      />
      {!web && <NumberWheel value={value} min={min} max={max} pad={pad} onChange={onChange} />}
    </View>
  );
}

function NumberWheel({ value, min, max, pad, onChange }: {
  value: number | null; min: number; max: number; pad?: boolean; onChange: (n: number) => void;
}) {
  const { colors } = useTheme();
  const ref = useRef<ScrollView>(null);
  const dragging = useRef(false);
  const inited = useRef(false);
  const items = useMemo(() => Array.from({ length: max - min + 1 }, (_, i) => min + i), [min, max]);
  const idxFor = (v: number | null) => v == null ? 0 : Math.max(0, Math.min(items.length - 1, v - min));

  useEffect(() => {
    if (dragging.current || !inited.current) return;
    ref.current?.scrollTo({ y: idxFor(value) * ITEM_H, animated: false });
  }, [value]);

  const settle = (offsetY: number) => {
    dragging.current = false;
    const idx = Math.max(0, Math.min(items.length - 1, Math.round(offsetY / ITEM_H)));
    onChange(items[idx]);
  };

  return (
    <View style={{ height: ITEM_H * 3, width: 70, marginTop: 8, overflow: 'hidden',
      borderRadius: 12, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H }}
        onContentSizeChange={() => {
          if (inited.current) return;
          inited.current = true;
          ref.current?.scrollTo({ y: idxFor(value) * ITEM_H, animated: false });
        }}
        onScrollBeginDrag={() => { dragging.current = true; }}
        onScrollEndDrag={e => settle(e.nativeEvent.contentOffset.y)}
        onMomentumScrollEnd={e => settle(e.nativeEvent.contentOffset.y)}
      >
        {items.map(n => {
          const sel = n === value;
          return (
            <View key={n} style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18, color: sel ? colors.teal : colors.text3, fontWeight: sel ? '800' : '400' }}>
                {pad ? String(n).padStart(2, '0') : String(n)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      <View pointerEvents="none" style={{ position: 'absolute', top: ITEM_H, left: 0, right: 0,
        height: ITEM_H, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.teal }} />
    </View>
  );
}

// ── Money: leading "$", thousands-formatted when idle, plain digits while typing ──
function MoneyField({ value, onChange }: { value: number | null; onChange: (n: number | null) => void }) {
  const { colors } = useTheme();
  const focused = useRef(false);
  const [text, setText] = useState(value == null ? '' : value.toLocaleString());

  useEffect(() => { if (!focused.current) setText(value == null ? '' : value.toLocaleString()); }, [value]);

  const commit = (t: string) => {
    const clean = t.replace(/[^0-9.]/g, '');
    setText(clean);
    if (clean === '') { onChange(null); return; }
    const n = parseFloat(clean);
    onChange(isNaN(n) ? null : n);
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <FL label="Amount" />
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glass,
        borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12 }}>
        <Text style={{ fontSize: 16, color: colors.text2, marginRight: 3 }}>$</Text>
        <TextInput
          value={text}
          onChangeText={commit}
          onFocus={() => { focused.current = true; setText(value == null ? '' : String(value)); }}
          onBlur={() => { focused.current = false; setText(value == null ? '' : value.toLocaleString()); }}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.text3}
          style={{ flex: 1, paddingVertical: 12, color: colors.text1, fontSize: 15 }}
        />
      </View>
    </View>
  );
}

// ── Plain number with the unit shown as a suffix (allows decimals) ──
function PlainField({ unit, value, onChange }: { unit?: string; value: number | null; onChange: (n: number | null) => void }) {
  const { colors } = useTheme();
  const focused = useRef(false);
  const [text, setText] = useState(value == null ? '' : String(value));
  const u = (unit ?? '').trim();

  useEffect(() => { if (!focused.current) setText(value == null ? '' : String(value)); }, [value]);

  const commit = (t: string) => {
    const clean = t.replace(/[^0-9.]/g, '');
    setText(clean);
    if (clean === '') { onChange(null); return; }
    const n = parseFloat(clean);
    onChange(isNaN(n) ? null : n);
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <FL label={`Value${u ? ` (${u})` : ''}`} />
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glass,
        borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12 }}>
        <TextInput
          value={text}
          onChangeText={commit}
          onFocus={() => { focused.current = true; }}
          onBlur={() => { focused.current = false; setText(value == null ? '' : String(value)); }}
          keyboardType="decimal-pad"
          placeholder="e.g. 225"
          placeholderTextColor={colors.text3}
          style={{ flex: 1, paddingVertical: 12, color: colors.text1, fontSize: 15 }}
        />
        {!!u && <Text style={{ fontSize: 15, color: colors.text2, marginLeft: 6 }}>{u}</Text>}
      </View>
    </View>
  );
}

function FL({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text3,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</Text>;
}
