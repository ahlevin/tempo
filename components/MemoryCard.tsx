import { useState } from 'react';
import { GestureResponderEvent, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../store/useStore';
import { Memory } from '../store/types';
import { SwipeableRow } from './SwipeableRow';
import { FavStar } from './FavStar';
import { AlertBadge } from './AlertBadge';
import { lightCardShadow } from '../constants/colors';
import {
  yearsMonthsDays, nextAnnual, daysSince, daysUntil, daysBetween,
  ordinal, fmtShort, fmtFull,
} from '../utils/dates';

const TYPE_COLOR_KEY: Record<Memory['type'], 'rose' | 'accent' | 'teal'> = {
  birthday: 'rose', anniversary: 'accent', lifelog: 'teal',
};
const TYPE_BORDER: Record<Memory['type'], string> = {
  birthday: 'rgba(232,80,122,0.28)', anniversary: 'rgba(124,106,245,0.28)', lifelog: 'rgba(62,207,178,0.28)',
};
const TYPE_BG: Record<Memory['type'], string> = {
  birthday: 'rgba(232,80,122,0.12)', anniversary: 'rgba(124,106,245,0.12)', lifelog: 'rgba(62,207,178,0.11)',
};

function Stat({ value, label, color }: { value: string | number; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10 }}>
      <Text style={{ fontSize: 17, fontWeight: '800', color, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ fontSize: 9, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function Bridge({ text, color }: { text: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{
      marginTop: 12, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border,
    }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color, paddingRight: 56 }}>{text}</Text>
    </View>
  );
}

const KNOWN_TYPES = new Set(['birthday', 'anniversary', 'lifelog']);

export function MemoryCard({ memory: m }: { memory: Memory }) {
  const { colors } = useTheme();
  const deleteMemory    = useStore(s => s.deleteMemory);
  const toggleMemoryFav = useStore(s => s.toggleMemoryFav);
  const [showAll, setShowAll] = useState(false);

  // Legacy/unknown types (e.g. a removed 'milestone' row) render nothing.
  if (!KNOWN_TYPES.has(m.type)) return null;

  const color  = colors[TYPE_COLOR_KEY[m.type]];
  const border = TYPE_BORDER[m.type];
  const bg     = TYPE_BG[m.type];
  const r      = yearsMonthsDays(m.originDate);
  const edit = () => router.push({ pathname: '/modals/edit-memory', params: { id: m.id } });

  return (
    <SwipeableRow onDelete={() => deleteMemory(m.id)} marginBottom={10}
      confirmTitle="Delete Memory" confirmMessage={`Delete "${m.name}"? This can't be undone.`}>
    <View style={{
      backgroundColor: colors.surf, borderRadius: 18, borderWidth: 1,
      borderColor: border, marginBottom: 10, overflow: 'hidden',
      ...(colors.isDark ? null : lightCardShadow),
    }}>
      <View style={{ height: 3, backgroundColor: color }} />
      {/* Tap anywhere on the card to edit; inner controls stop propagation. */}
      <TouchableOpacity activeOpacity={0.85} onPress={edit} style={{ padding: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text1, maxWidth: '80%' }} numberOfLines={1}>{m.name}</Text>
              {(m.type === 'birthday' || m.type === 'anniversary') && <AlertBadge count={m.alerts?.length} />}
            </View>
            <Text style={{ fontSize: 11, color: colors.text3, marginTop: 2 }}>{fmtShort(m.originDate)}</Text>
          </View>
          <FavStar active={m.fav} onToggle={() => toggleMemoryFav(m.id)} />
        </View>

        {m.type === 'birthday'    && <BirthdayBody m={m} r={r} color={color} />}
        {m.type === 'anniversary' && <AnniversaryBody m={m} r={r} color={color} />}
        {m.type === 'lifelog'     && (
          <LifelogBody m={m} color={color} showAll={showAll} onToggle={() => setShowAll(v => !v)} />
        )}
      </TouchableOpacity>
    </View>
    </SwipeableRow>
  );
}

type YMD = { y: number; mo: number; d: number };

function BigNumber({ value, label, color }: { value: number; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 14 }}>
      <Text style={{ fontSize: 52, fontWeight: '800', color, letterSpacing: -2, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: colors.text3, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function BirthdayBody({ m, r, color }: { m: Memory; r: YMD; color: string }) {
  const { colors } = useTheme();
  const nb = nextAnnual(m.originDate);
  return (
    <>
      <BigNumber value={r.y} label="years old" color={color} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Stat value={daysSince(m.originDate).toLocaleString()} label="days alive" color={color} />
        <Stat value={r.y * 12 + r.mo} label="months" color={colors.text1} />
        <Stat value={r.d} label="days" color={colors.text1} />
      </View>
      <Bridge color={color}
        text={`Turning ${r.y + 1} on ${fmtShort(nb)} — ${daysUntil(nb)} days away`} />
    </>
  );
}

function AnniversaryBody({ m, r, color }: { m: Memory; r: YMD; color: string }) {
  const { colors } = useTheme();
  const nb = nextAnnual(m.originDate);
  return (
    <>
      <BigNumber value={r.y} label={r.y === 1 ? 'year' : 'years'} color={color} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Stat value={daysSince(m.originDate).toLocaleString()} label="days together" color={color} />
        <Stat value={r.y * 12 + r.mo} label="months" color={colors.text1} />
        <Stat value={r.d} label="days" color={colors.text1} />
      </View>
      <Bridge color={color}
        text={`${ordinal(r.y + 1)} anniversary — ${fmtShort(nb)} · ${daysUntil(nb)} days away`} />
    </>
  );
}

function LifelogBody({
  m, color, showAll, onToggle,
}: { m: Memory; color: string; showAll: boolean; onToggle: () => void }) {
  const { colors } = useTheme();
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
          <Stat value={sinceFirst} label="days since first" color={colors.text1} />
          <Stat value={avgBetween === null ? '—' : avgBetween} label="avg between" color={colors.text1} />
        </View>
      )}

      {/* Log buttons */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <TouchableOpacity
          onPress={(ev) => { ev.stopPropagation(); router.push({ pathname: '/modals/log-entry', params: { id: m.id, past: '0' } }); }}
          style={{ flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: 'rgba(62,207,178,0.16)', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.teal }}>+ Log today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={(ev) => { ev.stopPropagation(); router.push({ pathname: '/modals/log-entry', params: { id: m.id, past: '1' } }); }}
          style={{ flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text2 }}>Past date</Text>
        </TouchableOpacity>
      </View>

      {/* History */}
      {count > 0 && (
        <View style={{ marginTop: 14 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
            History
          </Text>
          {visible.map(({ entry, num, gap }) => (
            <View key={entry.date + num} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(62,207,178,0.16)', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.teal }}>{num}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text1 }}>{fmtFull(entry.date)}</Text>
                  {gap !== null && (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text3 }}>+{gap}d</Text>
                  )}
                </View>
                {!!entry.note && (
                  <Text style={{ fontSize: 12, color: colors.text2, marginTop: 2 }}>{entry.note}</Text>
                )}
              </View>
            </View>
          ))}
          {rows.length > 3 && (
            <TouchableOpacity onPress={(ev) => { ev.stopPropagation(); onToggle(); }} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
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
