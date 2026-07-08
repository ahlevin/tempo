import { DimensionValue, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../store/useStore';
import { Memory } from '../store/types';
import { SwipeableRow } from './SwipeableRow';
import { FavStar } from './FavStar';
import { AlertBadge } from './AlertBadge';
import { LinkBadge } from './LinkBadge';
import { lightCardShadow, catColor } from '../constants/colors';
import { isCollectionLog, logCount, upcomingCount, logVisits } from '../utils/lifelog';
import { openMemoryDetail } from '../utils/nav';
import {
  yearsMonthsDays, nextAnnual, daysSince, daysUntil,
  ordinal, fmtShort, fmtMonthDay, fmtShortNoYear, fmtLogDate,
} from '../utils/dates';

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
  // Tap opens a read-only detail view (each has its own Edit button). Life logs
  // use their richer detail (entries + add); other memories use detail-memory.
  const open = () => openMemoryDetail(m);

  return (
    <SwipeableRow onDelete={() => deleteMemory(m.id)} marginBottom={10}
      confirmTitle="Delete Memory" confirmMessage={`Delete "${m.name}"? This can't be undone.`}>
    <View style={{
      backgroundColor: colors.surf, borderRadius: 18, borderWidth: 1,
      borderColor: border, marginBottom: 10, overflow: 'hidden',
      ...(colors.isDark ? null : lightCardShadow),
    }}>
      <View style={{ height: 3, backgroundColor: color }} />
      {/* Tap the card to open (detail for life logs, edit for others). */}
      <TouchableOpacity activeOpacity={0.85} onPress={open} style={{ padding: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text1, maxWidth: '80%' }} numberOfLines={1}>{m.name}</Text>
              {(m.type === 'birthday' || m.type === 'anniversary' || m.type === 'memorial') && <AlertBadge count={m.alerts?.length} />}
              {m.type !== 'lifelog' && <LinkBadge count={m.links?.length} />}
            </View>
            {/* Life logs have no container date (dates live on entries). */}
            {m.type !== 'lifelog' && (
              <Text style={{ fontSize: 13, color: colors.text2, marginTop: 2 }}>
                {m.yearUnknown ? fmtShortNoYear(m.originDate) : fmtShort(m.originDate)}
              </Text>
            )}
            {!!m.note && m.type !== 'lifelog' && (
              <Text style={{ fontSize: 13, color: colors.text2, marginTop: 2, fontStyle: 'italic' }} numberOfLines={1}>
                {m.note}
              </Text>
            )}
          </View>
          <FavStar active={m.fav} onToggle={() => toggleMemoryFav(m.id)} />
        </View>

        {m.type === 'birthday'    && <BirthdayBody m={m} r={r} color={color} />}
        {m.type === 'anniversary' && <AnniversaryBody m={m} r={r} color={color} />}
        {m.type === 'memorial'    && <MemorialBody m={m} r={r} color={color} />}
        {m.type === 'lifelog'     && <LifelogSummary m={m} color={color} />}
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

// Life logs show a COMPACT summary on their card (count · last, or "X of Y"
// with a progress bar). Tapping the card opens the detail view to see/add/edit
// entries — no inline expansion here.
function LifelogSummary({ m, color }: { m: Memory; color: string }) {
  const { colors } = useTheme();
  const collection = isCollectionLog(m);
  const target = m.logTarget;
  const count = logCount(m);        // UNIQUE completed items (coverage)
  const visits = logVisits(m);      // total completed entries (repeat visits)
  const upN = upcomingCount(m);
  const pct = collection && target ? Math.min(100, Math.round((count / target) * 100)) : null;
  // "last" ignores future-dated entries.
  const dated = m.entries.filter(e => e.date && daysUntil(e.date) <= 0).sort((a, b) => a.date.localeCompare(b.date));
  const last = dated[dated.length - 1];
  return (
    <View style={{ marginTop: 12 }}>
      {collection && target ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={{ fontSize: 30, fontWeight: '800', color, fontVariant: ['tabular-nums'] }}>{count}</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text2 }}>of {target}</Text>
            {pct !== null && <Text style={{ fontSize: 13, color: colors.text2, marginLeft: 2 }}>· {pct}%</Text>}
            {collection && visits > count && <Text style={{ fontSize: 13, color: colors.text2, marginLeft: 2 }}>· {visits} visits</Text>}
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.track, marginTop: 8, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${pct ?? 0}%` as DimensionValue, backgroundColor: color, borderRadius: 3 }} />
          </View>
        </>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color, fontVariant: ['tabular-nums'] }}>{count}</Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text2 }}>{count === 1 ? 'time' : 'times'}</Text>
          {last && <Text style={{ fontSize: 13, color: colors.text2, marginLeft: 4 }}>· last {fmtLogDate(last.date, last.datePrecision)}</Text>}
        </View>
      )}
      {upN > 0 && (
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.teal, marginTop: 8 }}>⏳ {upN} upcoming</Text>
      )}
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.teal, marginTop: 12 }}>Tap to view & add ›</Text>
    </View>
  );
}
