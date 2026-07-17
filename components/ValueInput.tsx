import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { valueFormat } from '../utils/values';

// Unit-adaptive entry for a VALUE goal attempt / target. The format is chosen
// explicitly (never inferred from free text) via the unit token. Emits the
// STORED numeric value (total seconds for time, a plain number otherwise) or
// null while empty. Same control for logging, editing, and the goal's target.
//   'sec' → Min : Sec, each typeable (numeric keyboard) AND scrollable (wheel).
//   'hms' → Hr : Min,  same dual control (marathon-length times).
//   '$'   → single "$" field, plain number.
//   other → single field + free-text unit label as a suffix.
export function ValueInput({ unit, value, onChange, label }: {
  unit?: string;
  value: number | null;
  onChange: (n: number | null) => void;
  label?: string;
}) {
  const { colors } = useTheme();
  const fmt = valueFormat(unit);

  if (fmt === 'minsec' || fmt === 'hrmin') {
    const time = fmt === 'hrmin';
    const big = value == null ? null : Math.floor(value / (time ? 3600 : 60));
    const small = value == null ? null : (time ? Math.floor((value % 3600) / 60) : value % 60);
    const combine = (a: number | null, b: number | null) => {
      if (a == null && b == null) { onChange(null); return; }
      onChange((a ?? 0) * (time ? 3600 : 60) + (b ?? 0) * (time ? 60 : 1));
    };
    return (
      <View style={{ marginBottom: 14 }}>
        <FL label={label ?? (time ? 'Time (hr : min)' : 'Time (min : sec)')} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <WheelField label={time ? 'Hr' : 'Min'} value={big} min={0} max={time ? 24 : 90} typeMax={time ? 99 : 999} onChange={a => combine(a, small)} />
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text2, marginTop: 34 }}>:</Text>
          <WheelField label={time ? 'Min' : 'Sec'} value={small} min={0} max={59} pad onChange={b => combine(big, b)} />
        </View>
      </View>
    );
  }

  if (fmt === 'money') return <MoneyField value={value} onChange={onChange} label={label} />;
  return <PlainField unit={unit} value={value} onChange={onChange} label={label} />;
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
        onScrollEndDrag={e => {
          // If the release has no fling velocity, no momentum event follows —
          // settle now. Otherwise let onMomentumScrollEnd settle the final rest
          // position (settling here would jump the wheel mid-fling).
          const v = e.nativeEvent.velocity?.y ?? 0;
          if (Math.abs(v) < 0.05) settle(e.nativeEvent.contentOffset.y);
        }}
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
function MoneyField({ value, onChange, label }: { value: number | null; onChange: (n: number | null) => void; label?: string }) {
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
      <FL label={label ?? 'Amount'} />
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
function PlainField({ unit, value, onChange, label }: { unit?: string; value: number | null; onChange: (n: number | null) => void; label?: string }) {
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
      <FL label={label ?? `Value${u ? ` (${u})` : ''}`} />
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
