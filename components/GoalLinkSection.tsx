import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../store/useStore';
import { FL } from './FormControls';
import { DateTimeField } from './DateTimeField';
import type { GoalWindowKind } from '../store/types';

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

// Optional "Link to a life log" editor for add/edit-goal. When linked, the goal's
// progress is DERIVED from the chosen log within the chosen time window (see
// utils/goals). Controlled via value/onChange; emits null link fields when off.
export function GoalLinkSection({ value, onChange, createdDate }: { value: GoalLink; onChange: (v: GoalLink) => void; createdDate: string }) {
  const { colors } = useTheme();
  const logs = useStore(s => s.memories).filter(m => m.type === 'lifelog');
  const thisYear = new Date().getFullYear();
  const [open, setOpen] = useState(!!(value.linkedLogId || value.linkedPreset));

  function pickLog(logId: string) {
    const log = logs.find(l => l.id === logId);
    onChange({
      linkedLogId: logId,
      linkedPreset: log?.logPreset ?? null,
      windowKind: value.windowKind ?? 'all_time',
      windowYear: value.windowYear ?? thisYear,
    });
  }
  function toggle(v: boolean) {
    setOpen(v);
    if (v) { if (logs.length && !value.linkedLogId) pickLog(logs[0].id); }
    else onChange({ linkedLogId: null, linkedPreset: null, windowKind: null, windowYear: null, windowStart: null });
  }
  function setWindow(kind: GoalWindowKind) {
    onChange({ ...value, windowKind: kind, windowYear: kind === 'year' ? (value.windowYear ?? thisYear) : value.windowYear });
  }

  const chip = (selected: boolean) => ({
    flex: 1, paddingVertical: 9, borderRadius: 9, borderWidth: 1.5, alignItems: 'center' as const,
    borderColor: selected ? colors.teal : colors.border,
    backgroundColor: selected ? colors.teal : colors.glass,
  });
  const chipText = (selected: boolean) => ({
    fontSize: 12, fontWeight: selected ? ('700' as const) : ('600' as const),
    color: selected ? (colors.isDark ? '#0A0A0F' : '#fff') : colors.text2,
  });

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
              <FL label="Life log" />
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
              <FL label="Progress window" />
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
              <Text style={{ fontSize: 11, color: colors.text3, marginBottom: 10, marginLeft: 2 }}>
                Progress counts {value.windowKind === 'year' ? `entries dated in ${value.windowYear ?? thisYear}`
                  : value.windowKind === 'by_date' ? `entries from ${value.windowStart ?? createdDate} to the target date`
                  : 'all completed entries'} — updates as you log.
              </Text>
            </>
          )}
        </View>
      )}
    </>
  );
}

// A compact toggle matching FormControls' Toggle but local to this section.
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
