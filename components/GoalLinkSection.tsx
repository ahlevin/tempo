import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../store/useStore';
import { FL } from './FormControls';
import { DateTimeField } from './DateTimeField';
import { isTimeUnit } from '../utils/values';
import type { GoalWindowKind, GoalPeriodKind, GoalKind, GoalDirection, GoalAgg } from '../store/types';

export interface GoalLink {
  linkedLogId?: string | null;
  linkedPreset?: string | null;
  windowKind?: GoalWindowKind | null;
  windowYear?: number | null;
  windowStart?: string | null;
}

const WINDOWS: { kind: GoalWindowKind; label: string }[] = [
  { kind: 'year',     label: 'This year' },
  { kind: 'by_date',  label: 'By target date' },
  { kind: 'all_time', label: 'All-time' },
];

// Shared filled-chip styling (bold selected — unmistakable in both themes).
function useChipStyles() {
  const { colors } = useTheme();
  const chip = (sel: boolean) => ({
    flex: 1, paddingVertical: 9, borderRadius: 9, borderWidth: 1.5, alignItems: 'center' as const,
    borderColor: sel ? colors.teal : colors.border,
    backgroundColor: sel ? colors.teal : colors.glass,
  });
  const chipText = (sel: boolean) => ({
    fontSize: 12, fontWeight: sel ? ('700' as const) : ('600' as const),
    color: sel ? (colors.isDark ? '#0A0A0F' : '#fff') : colors.text2,
  });
  return { chip, chipText };
}

// Progress Window picker (+ Count-from when By target date). Controlled on GoalLink.
// The window only DRIVES progress once a life log is linked; shown regardless.
export function GoalWindowPicker({ value, onChange, createdDate }: { value: GoalLink; onChange: (v: GoalLink) => void; createdDate: string }) {
  const { colors } = useTheme();
  const { chip, chipText } = useChipStyles();
  const thisYear = new Date().getFullYear();
  const setWindow = (kind: GoalWindowKind) =>
    onChange({ ...value, windowKind: kind, windowYear: kind === 'year' ? (value.windowYear ?? thisYear) : value.windowYear });

  return (
    <>
      <FL label="Progress Window" />
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
        {WINDOWS.map(w => {
          const sel = (value.windowKind ?? 'all_time') === w.kind;
          return (
            <TouchableOpacity key={w.kind} onPress={() => setWindow(w.kind)} style={chip(sel)}>
              <Text style={chipText(sel)}>{w.kind === 'year' ? `${value.windowYear ?? thisYear}` : w.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {value.windowKind === 'by_date' && (
        <DateTimeField mode="date" label="Count from"
          value={value.windowStart ?? createdDate}
          onChange={d => onChange({ ...value, windowStart: d })} />
      )}
      <Text style={{ fontSize: 11, color: colors.text3, marginTop: -2, marginBottom: 14, marginLeft: 2 }}>
        When linked to a life log, progress counts {value.windowKind === 'year' ? `entries dated in ${value.windowYear ?? thisYear}`
          : value.windowKind === 'by_date' ? `entries from ${value.windowStart ?? createdDate} to the target date`
          : 'all completed entries'}.
      </Text>
    </>
  );
}

const PERIODS: { kind: GoalPeriodKind; label: string; noun: string }[] = [
  { kind: 'day',   label: 'Daily',   noun: 'day' },
  { kind: 'week',  label: 'Weekly',  noun: 'week' },
  { kind: 'month', label: 'Monthly', noun: 'month' },
];

// Recurring toggle + period picker + target-per-period. When repeats is ON the
// caller hides the one-shot fields (single target / deadline / progress window).
export function GoalRepeatSection({ repeats, onRepeats, periodKind, onPeriodKind, periodTarget, onPeriodTarget, showToggle = true }: {
  repeats: boolean; onRepeats: (v: boolean) => void;
  periodKind: GoalPeriodKind; onPeriodKind: (k: GoalPeriodKind) => void;
  periodTarget: string; onPeriodTarget: (v: string) => void;
  showToggle?: boolean;  // false → always show period fields (kind is already 'streak')
}) {
  const { colors } = useTheme();
  const { chip, chipText } = useChipStyles();
  const noun = PERIODS.find(p => p.kind === periodKind)?.noun ?? 'period';
  const fi = { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 12, color: colors.text1, fontSize: 15, marginBottom: 14 };
  return (
    <>
      {showToggle && <MiniToggle label="🔁 Repeats (streak goal)" value={repeats} onChange={onRepeats} />}
      {(repeats || !showToggle) && (
        <>
          <FL label="Period" />
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
            {PERIODS.map(p => {
              const sel = periodKind === p.kind;
              return (
                <TouchableOpacity key={p.kind} onPress={() => onPeriodKind(p.kind)} style={chip(sel)}>
                  <Text style={chipText(sel)}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <FL label={`Target per ${noun}`} />
          <TextInput value={periodTarget} onChangeText={onPeriodTarget} keyboardType="numeric"
            placeholder="e.g. 5" placeholderTextColor={colors.text3} style={fi} />
          <Text style={{ fontSize: 11, color: colors.text3, marginTop: -8, marginBottom: 12, marginLeft: 2 }}>
            How many to hit each {noun}. Link a life log to count entries automatically, or leave unlinked for a manual counter. No single deadline — it repeats and builds a streak.
          </Text>
        </>
      )}
    </>
  );
}

// "Link to a life log" toggle + the collapsed log picker (Change re-expands).
// Controlled on GoalLink; leaves windowKind/windowStart alone (owned by the picker).
export function GoalLogLink({ value, onChange }: { value: GoalLink; onChange: (v: GoalLink) => void }) {
  const { colors } = useTheme();
  const logs = useStore(s => s.memories).filter(m => m.type === 'lifelog');
  const thisYear = new Date().getFullYear();
  const selectedLog = logs.find(l => l.id === value.linkedLogId);
  const [open, setOpen] = useState(!!(value.linkedLogId || value.linkedPreset));
  const [pickerOpen, setPickerOpen] = useState(!value.linkedLogId);

  function pickLog(logId: string) {
    const log = logs.find(l => l.id === logId);
    onChange({
      ...value,
      linkedLogId: logId,
      linkedPreset: log?.logPreset ?? null,
      windowKind: value.windowKind ?? 'all_time',
      windowYear: value.windowYear ?? thisYear,
    });
    setPickerOpen(false);
  }
  function toggle(v: boolean) {
    setOpen(v);
    if (v) setPickerOpen(!value.linkedLogId);
    else onChange({ ...value, linkedLogId: null, linkedPreset: null });
  }

  return (
    <>
      <MiniToggle label="🔗 Link to a life log" value={open} onChange={toggle} />
      {open && (
        <View style={{ marginBottom: 8 }}>
          {logs.length === 0 ? (
            <Text style={{ fontSize: 12, color: colors.text2, marginBottom: 12 }}>
              Create a life log first, then link this goal to track its progress automatically.
            </Text>
          ) : (
            <>
              <FL label="Life Log" />
              {selectedLog && !pickerOpen ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: colors.surf, borderWidth: 1, borderColor: colors.teal,
                  borderRadius: 12, padding: 11, marginBottom: 12 }}>
                  <Text style={{ fontSize: 18 }}>{selectedLog.emoji}</Text>
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.text1 }} numberOfLines={1}>{selectedLog.name}</Text>
                  <Text style={{ fontSize: 15, color: colors.teal }}>✓</Text>
                  <TouchableOpacity onPress={() => setPickerOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 9, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.teal }}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 7, marginBottom: 12 }}>
                  {logs.map(l => {
                    const sel = value.linkedLogId === l.id;
                    return (
                      <TouchableOpacity key={l.id} onPress={() => pickLog(l.id)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 11, borderWidth: 1.5,
                          borderColor: sel ? colors.teal : colors.border,
                          backgroundColor: sel ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.glass }}>
                        <Text style={{ fontSize: 18 }}>{l.emoji}</Text>
                        <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: sel ? colors.teal : colors.text1 }} numberOfLines={1}>{l.name}</Text>
                        {sel && <Text style={{ fontSize: 15, color: colors.teal }}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>
      )}
    </>
  );
}

// ── Kind picker + value fields (measurement layer) ──────────────────────────
const KINDS: { kind: GoalKind; emoji: string; label: string }[] = [
  { kind: 'milestone',  emoji: '🏁', label: 'Milestone' },
  { kind: 'count',      emoji: '🔢', label: 'Count' },
  { kind: 'collection', emoji: '🗺️', label: 'Collection' },
  { kind: 'streak',     emoji: '🔥', label: 'Streak' },
  { kind: 'value',      emoji: '📈', label: 'Value' },
  { kind: 'quest',      emoji: '🧭', label: 'Quest' },
];

export function GoalKindPicker({ value, onChange }: { value: GoalKind; onChange: (k: GoalKind) => void }) {
  const { colors } = useTheme();
  return (
    <>
      <FL label="Goal type" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
        {KINDS.map(k => {
          const sel = value === k.kind;
          return (
            <TouchableOpacity key={k.kind} onPress={() => onChange(k.kind)}
              style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1.5,
                borderColor: sel ? colors.teal : colors.border,
                backgroundColor: sel ? (colors.isDark ? 'rgba(62,207,178,0.14)' : colors.tint) : colors.glass }}>
              <Text style={{ fontSize: 13, fontWeight: sel ? '700' : '600', color: sel ? colors.teal : colors.text2 }}>{k.emoji} {k.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

// The four value sub-types → direction + agg + unit defaults (all overridable).
export const VALUE_SUBTYPES: { id: string; label: string; direction: GoalDirection; agg: GoalAgg; unit: string }[] = [
  { id: 'time',       label: 'Beat a time / score (lower is better)', direction: 'lower',  agg: 'best',   unit: 'sec' },
  { id: 'reach',      label: 'Reach a number (higher is better)',     direction: 'higher', agg: 'best',   unit: '' },
  { id: 'accumulate', label: 'Accumulate a total',                    direction: 'higher', agg: 'sum',    unit: '' },
  { id: 'balance',    label: 'Track a balance (latest wins)',         direction: 'higher', agg: 'latest', unit: '$' },
];

export function GoalValueSection({ direction, agg, unit, targetValue, onPick, onUnit, onTargetValue }: {
  direction: GoalDirection; agg: GoalAgg; unit: string; targetValue: string;
  onPick: (d: GoalDirection, a: GoalAgg, unit: string) => void;
  onUnit: (u: string) => void;
  onTargetValue: (v: string) => void;
}) {
  const { colors } = useTheme();
  const fi = { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 12, color: colors.text1, fontSize: 15, marginBottom: 14 };
  const activeSub = VALUE_SUBTYPES.find(s => s.direction === direction && s.agg === agg)?.id;
  return (
    <>
      <FL label="What are you tracking?" />
      <View style={{ gap: 7, marginBottom: 14 }}>
        {VALUE_SUBTYPES.map(s => {
          const sel = activeSub === s.id;
          return (
            <TouchableOpacity key={s.id} onPress={() => onPick(s.direction, s.agg, s.unit)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 11, borderWidth: 1.5,
                borderColor: sel ? colors.teal : colors.border,
                backgroundColor: sel ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.glass }}>
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: sel ? colors.teal : colors.text1 }}>{s.label}</Text>
              {sel && <Text style={{ fontSize: 15, color: colors.teal }}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
      <FL label="Unit (sec, lbs, miles, $, hrs, books…)" />
      <TextInput value={unit} onChangeText={onUnit} placeholder="sec" autoCapitalize="none"
        placeholderTextColor={colors.text3} style={fi} />
      <FL label={`Target${isTimeUnit(unit) ? ' (mm:ss)' : ''}`} />
      <TextInput value={targetValue} onChangeText={onTargetValue} autoCapitalize="none"
        placeholder={isTimeUnit(unit) ? '6:00' : 'e.g. 225'} placeholderTextColor={colors.text3} style={fi} />
    </>
  );
}

// A compact toggle matching FormControls' Toggle but local to this section (teal).
function MiniToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={() => onChange(!value)}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.tile, borderWidth: 1, borderColor: colors.border, borderRadius: 11, padding: 12, marginBottom: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text1 }}>{label}</Text>
      <View style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: value ? colors.teal : colors.border, justifyContent: 'center', paddingHorizontal: 2 }}>
        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', alignSelf: value ? 'flex-end' : 'flex-start' }} />
      </View>
    </TouchableOpacity>
  );
}
