import { useState } from 'react';
import { DimensionValue, GestureResponderEvent, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../store/useStore';
import { Memory } from '../store/types';
import { SwipeableRow } from './SwipeableRow';
import { FavStar } from './FavStar';
import { AlertBadge } from './AlertBadge';
import { lightCardShadow, catColor } from '../constants/colors';
import { presetUniverse } from '../constants/lifelogs';
import {
  yearsMonthsDays, nextAnnual, daysSince, daysUntil, daysBetween,
  ordinal, fmtShort, fmtFull, fmtMonthDay, fmtShortNoYear, fmtLogDate,
} from '../utils/dates';

// Sort life-log entries oldest→newest with dateless/partial handled: entries
// with a date sort ascending; dateless entries fall to the end.
function cmpEntryAsc(a: Memory['entries'][number], b: Memory['entries'][number]) {
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  return a.date.localeCompare(b.date);
}

// memorial's 'accent' key is a placeholder — its color is resolved via
// catColor('memorial') (muted slate) rather than a palette key.
const TYPE_COLOR_KEY: Record<Memory['type'], 'rose' | 'accent' | 'teal'> = {
  birthday: 'rose', anniversary: 'accent', memorial: 'accent', lifelog: 'teal',
};
const TYPE_BORDER: Record<Memory['type'], string> = {
  birthday: 'rgba(232,80,122,0.28)', anniversary: 'rgba(124,106,245,0.28)',
  memorial: 'rgba(143,163,184,0.28)', lifelog: 'rgba(62,207,178,0.28)',
};
const TYPE_BG: Record<Memory['type'], string> = {
  birthday: 'rgba(232,80,122,0.12)', anniversary: 'rgba(124,106,245,0.12)',
  memorial: 'rgba(143,163,184,0.12)', lifelog: 'rgba(62,207,178,0.11)',
};

function Stat({ value, label, color }: { value: string | number; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.tile, borderRadius: 12, padding: 10 }}>
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
      backgroundColor: colors.tile, borderWidth: 1, borderColor: colors.border,
    }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color, paddingRight: 56 }}>{text}</Text>
    </View>
  );
}

const KNOWN_TYPES = new Set(['birthday', 'anniversary', 'memorial', 'lifelog']);

export function MemoryCard({ memory: m }: { memory: Memory }) {
  const { colors } = useTheme();
  const deleteMemory    = useStore(s => s.deleteMemory);
  const toggleMemoryFav = useStore(s => s.toggleMemoryFav);
  const [expanded, setExpanded] = useState(false);

  // Legacy/unknown types (e.g. a removed 'milestone' row) render nothing.
  if (!KNOWN_TYPES.has(m.type)) return null;

  // Light "Yacht Club": decorative type colors route to navy (rose is reserved
  // for crimson urgency); borders/backgrounds use the neutral tokens. Memorial
  // keeps its muted slate in both themes (respectful, never crimson/navy).
  const color  = m.type === 'memorial'
    ? catColor(colors, 'memorial')
    : (colors.isDark ? colors[TYPE_COLOR_KEY[m.type]] : colors.accent);
  const border = colors.isDark ? TYPE_BORDER[m.type] : colors.border;
  const bg     = colors.isDark ? TYPE_BG[m.type] : colors.tint;
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
              {(m.type === 'birthday' || m.type === 'anniversary' || m.type === 'memorial') && <AlertBadge count={m.alerts?.length} />}
            </View>
            <Text style={{ fontSize: 11, color: colors.text3, marginTop: 2 }}>
              {m.yearUnknown ? fmtShortNoYear(m.originDate) : fmtShort(m.originDate)}
            </Text>
            {!!m.note && (
              <Text style={{ fontSize: 11, color: colors.text2, marginTop: 2, fontStyle: 'italic' }} numberOfLines={1}>
                {m.note}
              </Text>
            )}
          </View>
          <FavStar active={m.fav} onToggle={() => toggleMemoryFav(m.id)} />
        </View>

        {m.type === 'birthday'    && <BirthdayBody m={m} r={r} color={color} />}
        {m.type === 'anniversary' && <AnniversaryBody m={m} r={r} color={color} />}
        {m.type === 'memorial'    && <MemorialBody m={m} r={r} color={color} />}
        {m.type === 'lifelog'     && (
          <LifelogBody m={m} color={color} expanded={expanded} onToggleExpand={() => setExpanded(v => !v)} />
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

// Shown in place of the big age/years number when the year is unknown: the
// month + day (no year, no age), with the countdown preserved below.
function BigDate({ value, label, color }: { value: string; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 18 }}>
      <Text style={{ fontSize: 34, fontWeight: '800', color, letterSpacing: -1 }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: colors.text3, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}

function BirthdayBody({ m, r, color }: { m: Memory; r: YMD; color: string }) {
  const { colors } = useTheme();
  const nb = nextAnnual(m.originDate);
  // Year unknown → no age, no year-dependent stats. Show the month/day and keep
  // the countdown to the next birthday.
  if (m.yearUnknown) {
    return (
      <>
        <BigDate value={fmtMonthDay(m.originDate)} label="birthday" color={color} />
        <Bridge color={color}
          text={`Next on ${fmtShortNoYear(nb)} — ${daysUntil(nb)} days away`} />
      </>
    );
  }
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
  // Year unknown → no "Nth anniversary", no year-dependent stats. Show the
  // month/day and keep the countdown to the next anniversary.
  if (m.yearUnknown) {
    return (
      <>
        <BigDate value={fmtMonthDay(m.originDate)} label="anniversary" color={color} />
        <Bridge color={color}
          text={`Next on ${fmtShortNoYear(nb)} — ${daysUntil(nb)} days away`} />
      </>
    );
  }
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

// Memorial reuses the anniversary layout (annual countdown, "X years since"),
// with respectful wording — "years since" / "Remembering · N years" — instead
// of "Nth anniversary".
function MemorialBody({ m, r, color }: { m: Memory; r: YMD; color: string }) {
  const { colors } = useTheme();
  const nb = nextAnnual(m.originDate);
  if (m.yearUnknown) {
    return (
      <>
        <BigDate value={fmtMonthDay(m.originDate)} label="in memory" color={color} />
        <Bridge color={color}
          text={`Remembering · next on ${fmtShortNoYear(nb)} — ${daysUntil(nb)} days away`} />
      </>
    );
  }
  return (
    <>
      <BigNumber value={r.y} label="years since" color={color} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Stat value={daysSince(m.originDate).toLocaleString()} label="days since" color={color} />
        <Stat value={r.y * 12 + r.mo} label="months" color={colors.text1} />
        <Stat value={r.d} label="days" color={colors.text1} />
      </View>
      <Bridge color={color}
        text={`Remembering · ${r.y + 1} years — ${fmtShort(nb)} · ${daysUntil(nb)} days away`} />
    </>
  );
}

// Life logs render COLLAPSED by default: a one-line summary (count · last, or
// "X of Y" with a progress bar for collections). A chevron expands the detail
// (dated timeline for counts; logged items for collections). The card's own tap
// still opens edit — inner controls stopPropagation.
function LifelogBody({
  m, color, expanded, onToggleExpand,
}: { m: Memory; color: string; expanded: boolean; onToggleExpand: () => void }) {
  const { colors } = useTheme();
  const kind = m.logKind ?? 'count';
  const universe = presetUniverse(m.logPreset);
  const target = m.logTarget;
  const isCollection = kind === 'collection';

  const chrono = [...m.entries].sort(cmpEntryAsc);
  const dated = chrono.filter(e => e.date);        // entries that actually have a date
  const last = dated[dated.length - 1];            // most-recent dated entry (for "last …")

  // For collections, keep the first-logged entry per distinct named item.
  const itemEntry = new Map<string, Memory['entries'][number]>();
  for (const e of chrono) if (e.item && !itemEntry.has(e.item)) itemEntry.set(e.item, e);
  const count = isCollection ? itemEntry.size : m.entries.length;
  const pct = isCollection && target ? Math.min(100, Math.round((count / target) * 100)) : null;

  const openAdd = (past: string) => router.push({ pathname: '/modals/log-entry', params: { id: m.id, past } });

  return (
    <>
      {/* Collapsed summary */}
      <View style={{ marginTop: 12 }}>
        {isCollection && target ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{ fontSize: 30, fontWeight: '800', color, fontVariant: ['tabular-nums'] }}>{count}</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text2 }}>of {target}</Text>
              {pct !== null && <Text style={{ fontSize: 13, color: colors.text3, marginLeft: 2 }}>· {pct}%</Text>}
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.track, marginTop: 8, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${pct ?? 0}%` as DimensionValue, backgroundColor: color, borderRadius: 3 }} />
            </View>
          </>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 30, fontWeight: '800', color, fontVariant: ['tabular-nums'] }}>{count}</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text2 }}>{count === 1 ? 'time' : 'times'}</Text>
            {last && <Text style={{ fontSize: 12, color: colors.text3, marginLeft: 4 }}>· last {fmtLogDate(last.date, last.datePrecision)}</Text>}
          </View>
        )}
      </View>

      {/* Actions: log affordance + expand chevron */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' }}>
        {isCollection ? (
          <TouchableOpacity
            onPress={(ev) => { ev.stopPropagation(); openAdd('0'); }}
            style={{ flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.isDark ? 'rgba(62,207,178,0.16)' : colors.tint, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.teal }}>{universe ? '+ Add' : '+ Log'}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              onPress={(ev) => { ev.stopPropagation(); openAdd('0'); }}
              style={{ flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.isDark ? 'rgba(62,207,178,0.16)' : colors.tint, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.teal }}>+ Log today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(ev) => { ev.stopPropagation(); openAdd('1'); }}
              style={{ flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text2 }}>Past date</Text>
            </TouchableOpacity>
          </>
        )}
        {count > 0 && (
          <TouchableOpacity
            onPress={(ev) => { ev.stopPropagation(); onToggleExpand(); }}
            accessibilityLabel={expanded ? 'Collapse' : 'Expand'}
            style={{ width: 42, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, color: colors.text2, marginTop: -1 }}>{expanded ? '⌃' : '⌄'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Expanded detail */}
      {expanded && count > 0 && (
        isCollection
          ? <CollectionList itemEntry={itemEntry} universe={universe} target={target} />
          : <CountTimeline chrono={chrono} color={color} />
      )}
    </>
  );
}

function CollectionList({ itemEntry, universe, target }:
  { itemEntry: Map<string, Memory['entries'][number]>; universe?: string[]; target?: number }) {
  const { colors } = useTheme();
  // Newest first, dateless items last.
  const rows = Array.from(itemEntry.values()).sort((a, b) => -cmpEntryAsc(a, b));
  const total = universe ? universe.length : target;
  const remaining = total ? Math.max(0, total - rows.length) : 0;
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
        Logged{remaining > 0 ? ` · ${remaining} to go` : ' · complete! 🎉'}
      </Text>
      {rows.map((e) => (
        <View key={e.item} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.isDark ? 'rgba(62,207,178,0.16)' : colors.tint, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 11, color: colors.teal }}>✓</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.text1 }} numberOfLines={1}>{e.item}</Text>
          <Text style={{ fontSize: 11, color: colors.text3 }}>{fmtLogDate(e.date, e.datePrecision)}</Text>
        </View>
      ))}
    </View>
  );
}

function CountTimeline({ chrono, color }: { chrono: Memory['entries']; color: string }) {
  const { colors } = useTheme();
  // Stats only make sense for fully/partly dated entries.
  const dated = chrono.filter(e => e.date);
  const first = dated[0];
  const last  = dated[dated.length - 1];
  const avgBetween = dated.length > 1 ? Math.round(daysBetween(first.date, last.date) / (dated.length - 1)) : null;
  // Newest first (dateless last), numbered by chronological order.
  const rows = chrono
    .map((e, i) => ({ entry: e, num: i + 1 }))
    .reverse();
  return (
    <View style={{ marginTop: 14 }}>
      {dated.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Stat value={daysSince(last.date)} label="since last" color={color} />
          <Stat value={daysSince(first.date)} label="days since first" color={colors.text1} />
          <Stat value={avgBetween === null ? '—' : avgBetween} label="avg between" color={colors.text1} />
        </View>
      )}
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
        History
      </Text>
      {rows.map(({ entry, num }) => (
        <View key={(entry.date || 'none') + num} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.isDark ? 'rgba(62,207,178,0.16)' : colors.tint, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.teal }}>{num}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: entry.date ? colors.text1 : colors.text3 }}>
              {entry.datePrecision === 'full' || !entry.datePrecision ? fmtFull(entry.date) : fmtLogDate(entry.date, entry.datePrecision)}
            </Text>
            {!!entry.note && (
              <Text style={{ fontSize: 12, color: colors.text2, marginTop: 2 }}>{entry.note}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
