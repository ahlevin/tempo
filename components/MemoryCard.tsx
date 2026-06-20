import { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { useStore } from '../store/useStore';
import { Memory } from '../store/types';
import {
  yearsMonthsDays, nextAnnual, daysSince, daysUntil, daysBetween,
  ordinal, fmtShort, fmtFull,
} from '../utils/dates';

const TYPE_COLOR: Record<Memory['type'], string> = {
  birthday: Colors.rose, anniversary: Colors.accent,
  lifelog: Colors.teal, milestone: Colors.amber,
};
const TYPE_BORDER: Record<Memory['type'], string> = {
  birthday: 'rgba(232,80,122,0.28)', anniversary: 'rgba(124,106,245,0.28)',
  lifelog: 'rgba(62,207,178,0.28)', milestone: 'rgba(240,160,75,0.28)',
};
const TYPE_BG: Record<Memory['type'], string> = {
  birthday: 'rgba(232,80,122,0.12)', anniversary: 'rgba(124,106,245,0.12)',
  lifelog: 'rgba(62,207,178,0.11)', milestone: 'rgba(240,160,75,0.11)',
};

function Stat({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10 }}>
      <Text style={{ fontSize: 17, fontWeight: '800', color, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ fontSize: 9, color: Colors.text3, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function Bridge({ text, color }: { text: string; color: string }) {
  return (
    <View style={{
      marginTop: 12, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: Colors.border,
    }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color, paddingRight: 56 }}>{text}</Text>
    </View>
  );
}

export function MemoryCard({ memory: m }: { memory: Memory }) {
  const deleteMemory = useStore(s => s.deleteMemory);
  const [showAll, setShowAll] = useState(false);

  const color  = TYPE_COLOR[m.type];
  const border = TYPE_BORDER[m.type];
  const bg     = TYPE_BG[m.type];
  const r      = yearsMonthsDays(m.originDate);

  function openActions() {
    const buttons: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
      { text: 'Edit Memory', onPress: () => router.push({ pathname: '/modals/edit-memory', params: { id: m.id } }) },
    ];
    if (m.type === 'lifelog') {
      buttons.push({ text: 'Log New Entry', onPress: () => router.push({ pathname: '/modals/log-entry', params: { id: m.id, past: '0' } }) });
    }
    buttons.push({
      text: 'Delete Memory', style: 'destructive',
      onPress: () => Alert.alert('Delete Memory', `Delete "${m.name}"? This can't be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMemory(m.id) },
      ]),
    });
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(`${m.emoji} ${m.name}`, undefined, buttons);
  }

  return (
    <View style={{
      backgroundColor: Colors.surf, borderRadius: 18, borderWidth: 1,
      borderColor: border, marginBottom: 10, overflow: 'hidden',
    }}>
      <View style={{ height: 3, backgroundColor: color }} />
      <View style={{ padding: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.text1 }} numberOfLines={1}>{m.name}</Text>
            <Text style={{ fontSize: 11, color: Colors.text3, marginTop: 2 }}>{fmtShort(m.originDate)}</Text>
          </View>
          <TouchableOpacity onPress={openActions} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, color: Colors.text3, marginTop: -6 }}>⋯</Text>
          </TouchableOpacity>
        </View>

        {m.type === 'birthday'    && <BirthdayBody m={m} r={r} color={color} />}
        {m.type === 'anniversary' && <AnniversaryBody m={m} r={r} color={color} />}
        {m.type === 'milestone'   && <MilestoneBody m={m} r={r} color={color} />}
        {m.type === 'lifelog'     && (
          <LifelogBody m={m} color={color} showAll={showAll} onToggle={() => setShowAll(v => !v)} />
        )}
      </View>
    </View>
  );
}

type YMD = { y: number; mo: number; d: number };

function BigNumber({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 14 }}>
      <Text style={{ fontSize: 52, fontWeight: '800', color, letterSpacing: -2, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: Colors.text3, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function BirthdayBody({ m, r, color }: { m: Memory; r: YMD; color: string }) {
  const nb = nextAnnual(m.originDate);
  return (
    <>
      <BigNumber value={r.y} label="years old" color={color} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Stat value={daysSince(m.originDate).toLocaleString()} label="days alive" color={color} />
        <Stat value={r.y * 12 + r.mo} label="months" color={Colors.text1} />
        <Stat value={r.d} label="days" color={Colors.text1} />
      </View>
      <Bridge color={color}
        text={`Turning ${r.y + 1} on ${fmtShort(nb)} — ${daysUntil(nb)} days away`} />
    </>
  );
}

function AnniversaryBody({ m, r, color }: { m: Memory; r: YMD; color: string }) {
  const nb = nextAnnual(m.originDate);
  return (
    <>
      <BigNumber value={r.y} label={r.y === 1 ? 'year' : 'years'} color={color} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Stat value={daysSince(m.originDate).toLocaleString()} label="days together" color={color} />
        <Stat value={r.y * 12 + r.mo} label="months" color={Colors.text1} />
        <Stat value={r.d} label="days" color={Colors.text1} />
      </View>
      <Bridge color={color}
        text={`${ordinal(r.y + 1)} anniversary — ${fmtShort(nb)} · ${daysUntil(nb)} days away`} />
    </>
  );
}

function MilestoneBody({ m, r, color }: { m: Memory; r: YMD; color: string }) {
  const ago = r.y > 0 ? { v: r.y, l: r.y === 1 ? 'year ago' : 'years ago' }
            : r.mo > 0 ? { v: r.mo, l: r.mo === 1 ? 'month ago' : 'months ago' }
            : { v: r.d, l: r.d === 1 ? 'day ago' : 'days ago' };
  return (
    <>
      <BigNumber value={ago.v} label={ago.l} color={color} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Stat value={daysSince(m.originDate).toLocaleString()} label="days" color={color} />
        <Stat value={r.y * 12 + r.mo} label="months" color={Colors.text1} />
        <Stat value={r.y} label="years" color={Colors.text1} />
      </View>
    </>
  );
}

function LifelogBody({
  m, color, showAll, onToggle,
}: { m: Memory; color: string; showAll: boolean; onToggle: () => void }) {
  // Chronological (oldest → newest) so we can compute gaps; display newest first.
  const chrono = [...m.entries].sort((a, b) => a.date.localeCompare(b.date));
  const count  = chrono.length;
  const first  = chrono[0];
  const last   = chrono[count - 1];

  const sinceLast = count ? daysSince(last.date) : 0;
  const sinceFirst = count ? daysSince(first.date) : 0;
  const avgBetween = count > 1 ? Math.round(daysBetween(first.date, last.date) / (count - 1)) : null;

  const rows = chrono
    .map((e, i) => ({ entry: e, num: i + 1, gap: i === 0 ? null : daysBetween(chrono[i - 1].date, e.date) }))
    .reverse(); // newest first
  const visible = showAll ? rows : rows.slice(0, 3);

  return (
    <>
      <BigNumber value={count} label={count === 1 ? 'time' : 'times'} color={color} />
      {count > 0 && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Stat value={sinceLast} label="since last" color={color} />
          <Stat value={sinceFirst} label="days since first" color={Colors.text1} />
          <Stat value={avgBetween === null ? '—' : avgBetween} label="avg between" color={Colors.text1} />
        </View>
      )}

      {/* Log buttons */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/modals/log-entry', params: { id: m.id, past: '0' } })}
          style={{ flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: 'rgba(62,207,178,0.16)', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.teal }}>+ Log today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/modals/log-entry', params: { id: m.id, past: '1' } })}
          style={{ flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text2 }}>Past date</Text>
        </TouchableOpacity>
      </View>

      {/* History */}
      {count > 0 && (
        <View style={{ marginTop: 14 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
            History
          </Text>
          {visible.map(({ entry, num, gap }) => (
            <View key={entry.date + num} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(62,207,178,0.16)', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: Colors.teal }}>{num}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text1 }}>{fmtFull(entry.date)}</Text>
                  {gap !== null && (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.text3 }}>+{gap}d</Text>
                  )}
                </View>
                {!!entry.note && (
                  <Text style={{ fontSize: 12, color: Colors.text2, marginTop: 2 }}>{entry.note}</Text>
                )}
              </View>
            </View>
          ))}
          {rows.length > 3 && (
            <TouchableOpacity onPress={onToggle} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color }}>
                {showAll ? 'Show less' : `Show all ${rows.length}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );
}
