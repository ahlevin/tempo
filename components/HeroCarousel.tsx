import { useRef, useState } from 'react';
import { View, Text, ScrollView, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { useIsFocused } from 'expo-router';
import { catColor, heroTintBg } from '../constants/colors';
import { CATEGORIES } from '../constants/data';
import { useTheme } from '../contexts/ThemeContext';
import { useTick } from '../contexts/TickContext';
import { useStore } from '../store/useStore';
import { FavStar } from './FavStar';
import { nextOccurrence, daysUntil, recurLabel, nextAnnual, yearsMonthsDays, ordinal, fmtMonthDay, toDate, isValidDate } from '../utils/dates';

const W = Dimensions.get('window').width - 32;
// Every hero card renders to this height so the carousel never resizes between
// slides (some types have a secondary line under the name, some don't).
const CARD_MIN_H = 258;

// ---- Shared hero building blocks -----------------------------------------

// The prominent number-in-a-tile (days remaining / entry count). Left-aligned
// focal point: big accent number over a small uppercase label, on a soft
// accent-tinted rounded square.
function HeroTile({ value, label, accent, bg }: { value: number | string; label: string; accent: string; bg: string }) {
  return (
    <View style={{ width: 132, height: 132, borderRadius: 24, backgroundColor: bg,
      alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 56, fontWeight: '500', color: accent, letterSpacing: -1, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text style={{ fontSize: 10, fontWeight: '700', color: accent, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

// Right-of-tile column that fills the horizontal space: weekday + full date,
// vertically centered, with optional extra lines (e.g. an event's Hh Mm, or a
// goal's progress + nudge controls).
function InfoColumn({ line1, line2, children }: { line1?: string; line2: string; children?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
      <View>
        {!!line1 && <Text style={{ fontSize: 12, color: colors.text3, marginBottom: 2 }}>{line1}</Text>}
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text1 }}>{line2}</Text>
      </View>
      {children}
    </View>
  );
}

function Eyebrow({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase',
      color, marginBottom: 5, paddingRight: 48 }}>
      {children}
    </Text>
  );
}

function CardName({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text numberOfLines={1} style={{ fontSize: 22, fontWeight: '700', color: colors.text1, paddingRight: 48 }}>
      {children}
    </Text>
  );
}

// Secondary line under the name. Rendered on EVERY card type (with a sensible
// per-type value) so the tile row starts at the same Y and heights match.
function Secondary({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color, marginTop: 2 }}>
      {children}
    </Text>
  );
}

// Shared card frame: themed surface + border, with the favorite star pinned
// top-right on every card type.
function HeroFrame({ bgDark, borderDark, fav, onFav, children }: {
  bgDark: string; borderDark: string; fav: boolean; onFav: () => void; children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ width: W, minHeight: CARD_MIN_H, backgroundColor: colors.isDark ? bgDark : colors.surf,
      borderRadius: 24, padding: 22, borderWidth: 1, borderColor: colors.isDark ? borderDark : colors.border }}>
      <View style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
        <FavStar active={fav} onToggle={onFav} />
      </View>
      {children}
    </View>
  );
}

const tileRow = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 16, marginTop: 14 };

// ---- Event ----------------------------------------------------------------

function EventRow({ e, accent, now }: { e: any; accent: string; now: number }) {
  const { colors } = useTheme();
  const nd     = nextOccurrence(e);
  const target = toDate(nd);
  const ms     = isValidDate(target) ? target.getTime() - now : 0;
  const d      = ms > 0 ? Math.floor(ms / 86400000) : 0;
  const h      = ms > 0 ? Math.floor((ms % 86400000) / 3600000) : 0;
  const mi     = ms > 0 ? Math.floor((ms % 3600000) / 60000) : 0;
  const wday   = isValidDate(target) ? target.toLocaleDateString('en-US', { weekday: 'long' }) : '';
  const dstr   = isValidDate(target) ? target.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  const timeStr = (!e.allDay && isValidDate(target)) ? target.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
  return (
    <View style={tileRow}>
      <HeroTile value={d} label={d === 1 ? 'Day Away' : 'Days Away'} accent={accent} bg={heroTintBg(colors, accent)} />
      <InfoColumn line1={wday} line2={timeStr ? `${dstr} · ${timeStr}` : dstr}>
        <Text style={{ fontSize: 12, color: colors.text2, fontVariant: ['tabular-nums'] }}>{h}h {mi}m</Text>
      </InfoColumn>
    </View>
  );
}

// Only the active/visible card subscribes to the shared per-minute tick, so
// inactive cards never re-render on tick and the interval idles otherwise.
function LiveEventRow({ e, accent }: { e: any; accent: string }) {
  const now = useTick();
  return <EventRow e={e} accent={accent} now={now} />;
}

function EventCard({ event: e, active }: { event: any; active: boolean }) {
  const { colors } = useTheme();
  const toggleFav = useStore(s => s.toggleEventFav);
  const accent = catColor(colors, e.cat);
  const rl     = recurLabel(e);
  const cat    = CATEGORIES.find(c => c.id === e.cat);
  const secondary = cat ? `${cat.emoji} ${cat.short}` : 'Countdown';
  return (
    <HeroFrame bgDark="#1A1830" borderDark="rgba(124,106,245,0.22)" fav={e.fav} onFav={() => toggleFav(e.id)}>
      <Eyebrow color={accent}>{rl ? '🔁 ' + rl : 'Next Up'}</Eyebrow>
      <CardName>{e.emoji} {e.name}</CardName>
      <Secondary color={accent}>{secondary}</Secondary>
      {active
        ? <LiveEventRow e={e} accent={accent} />
        : <EventRow e={e} accent={accent} now={Date.now()} />}
    </HeroFrame>
  );
}

// ---- Goal -----------------------------------------------------------------

function GoalCard({ goal: g }: { goal: any }) {
  const { colors } = useTheme();
  const nudge     = useStore(s => s.nudgeGoal);
  const toggleFav = useStore(s => s.toggleGoalFav);
  const gp  = Math.round(Math.min(100, (g.current / g.target) * 100));
  const target = new Date(g.date + 'T00:00:00');
  const ms  = target.getTime() - Date.now();
  const d   = ms > 0 ? Math.floor(ms / 86400000) : 0;
  const wday = target.toLocaleDateString('en-US', { weekday: 'long' });
  const dstr = target.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <HeroFrame bgDark="#0F1E1A" borderDark="rgba(62,207,178,0.25)" fav={g.fav} onFav={() => toggleFav(g.id)}>
      <Eyebrow color={colors.teal}>Active Goal</Eyebrow>
      <CardName>{g.emoji} {g.name}</CardName>
      <Secondary color={colors.teal}>Goal: {g.target.toLocaleString()} {g.unit}</Secondary>
      <View style={tileRow}>
        <HeroTile value={d} label={d === 1 ? 'Day Left' : 'Days Left'} accent={colors.teal} bg={heroTintBg(colors, colors.teal)} />
        <InfoColumn line1={wday} line2={dstr}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.teal }}>
                {g.current.toLocaleString()}
                <Text style={{ fontSize: 11, color: colors.text3 }}>/{g.target.toLocaleString()}</Text>
              </Text>
              <Text style={{ fontSize: 9, color: colors.text3, textTransform: 'uppercase' }}>{g.unit} · {gp}%</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 5 }}>
              <TouchableOpacity onPress={() => nudge(g.id, -1)}
                style={{ width: 28, height: 28, borderRadius: 14,
                  backgroundColor: (colors.isDark ? 'rgba(255,255,255,0.08)' : colors.tint),
                  alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.text2, fontWeight: '700' }}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => nudge(g.id, 1)}
                style={{ width: 28, height: 28, borderRadius: 14,
                  backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontWeight: '700' }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </InfoColumn>
      </View>
    </HeroFrame>
  );
}

// ---- Memory (birthday / anniversary / memorial / life log) ----------------

function MemoryCard({ memory: m }: { memory: any }) {
  const { colors } = useTheme();
  const toggleFav = useStore(s => s.toggleMemoryFav);
  const r = yearsMonthsDays(m.originDate);

  if (m.type === 'birthday' || m.type === 'anniversary' || m.type === 'memorial') {
    const isBday     = m.type === 'birthday';
    const isMemorial = m.type === 'memorial';
    const nb    = nextAnnual(m.originDate);
    const days  = daysUntil(nb);
    const num   = r.y + 1;
    // Dark keeps the decorative rose/violet; light routes birthdays/anniversaries
    // to navy (rose reserved for urgency). Memorial keeps its muted slate.
    const slate  = catColor(colors, 'memorial');
    const dark   = isMemorial ? slate : (isBday ? colors.rose : colors.accent);
    const accent = isMemorial ? slate : (colors.isDark ? dark : colors.accent);
    const eyebrow = isBday ? 'Birthday Countdown' : isMemorial ? 'Memorial' : 'Anniversary Countdown';
    const cardBgDark = isMemorial ? '#141A22' : '#1E0F1A';
    const borderDark = isMemorial ? 'rgba(143,163,184,0.28)' : (isBday ? 'rgba(232,80,122,0.28)' : 'rgba(124,106,245,0.28)');
    const midLabel   = m.yearUnknown ? fmtMonthDay(m.originDate)
      : isBday ? `Turning ${num}`
      : isMemorial ? `Remembering · ${num} years`
      : `${ordinal(num)} Anniversary`;
    const wday = new Date(nb + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    const dstr = new Date(nb + 'T00:00:00').toLocaleDateString('en-US',
      m.yearUnknown ? { month: 'long', day: 'numeric' } : { month: 'long', day: 'numeric', year: 'numeric' });
    // dark accent hex drives the tile tint; light uses the neutral tint.
    const tileBg = heroTintBg(colors, dark);
    return (
      <HeroFrame bgDark={cardBgDark} borderDark={borderDark} fav={m.fav} onFav={() => toggleFav(m.id)}>
        <Eyebrow color={accent}>{eyebrow}</Eyebrow>
        <CardName>{m.emoji} {m.name}</CardName>
        <Secondary color={accent}>{midLabel}</Secondary>
        <View style={tileRow}>
          <HeroTile value={days} label={days === 1 ? 'Day Away' : 'Days Away'} accent={accent} bg={tileBg} />
          <InfoColumn line1={wday} line2={dstr} />
        </View>
      </HeroFrame>
    );
  }

  // Life log → count of entries.
  const accent = colors.teal;
  const dark   = colors.isDark ? colors.teal : colors.accent;
  const bigVal   = m.entries.length;
  const bigLabel = bigVal === 1 ? 'Time' : 'Times';
  const dstr = new Date(m.originDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  // Most recent entry date for the secondary line (keeps height uniform + useful).
  const lastDate = (m.entries ?? []).map((en: any) => en.date).filter(Boolean).sort().pop();
  const secondary = lastDate
    ? `Last: ${new Date(lastDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'No entries yet';
  return (
    <HeroFrame bgDark="#0F1E1A" borderDark="rgba(62,207,178,0.28)" fav={m.fav} onFav={() => toggleFav(m.id)}>
      <Eyebrow color={accent}>Life Log</Eyebrow>
      <CardName>{m.emoji} {m.name}</CardName>
      <Secondary color={accent}>{secondary}</Secondary>
      <View style={tileRow}>
        <HeroTile value={bigVal} label={bigLabel} accent={accent} bg={heroTintBg(colors, dark)} />
        <InfoColumn line1="Since" line2={dstr} />
      </View>
    </HeroFrame>
  );
}

// ---- Carousel -------------------------------------------------------------

export function HeroCarousel() {
  const { colors } = useTheme();
  const focused  = useIsFocused();
  const events   = useStore(s => s.events);
  const goals    = useStore(s => s.goals);
  const memories = useStore(s => s.memories);
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Smoothly scroll to a card index (matches the paging snap interval) and sync idx.
  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(i, items.length - 1));
    scrollRef.current?.scrollTo({ x: clamped * (W + 12), animated: true });
    setIdx(clamped);
  };

  // Hero = ONLY starred items, of every type (events, goals, memories),
  // sorted by soonest upcoming date.
  const items: { kind: 'event' | 'goal' | 'memory'; data: any; days: number }[] = [];
  events.filter(e => e.fav).forEach(e => items.push({ kind:'event', data:e, days: daysUntil(nextOccurrence(e)) }));
  goals.filter(g => g.fav).forEach(g => items.push({ kind:'goal', data:g, days: daysUntil(g.date) }));
  memories
    .filter(m => m.fav && (m.type === 'birthday' || m.type === 'anniversary' || m.type === 'memorial' || m.type === 'lifelog'))
    .forEach(m => {
      const days = (m.type === 'birthday' || m.type === 'anniversary' || m.type === 'memorial')
        ? daysUntil(nextAnnual(m.originDate)) : Number.MAX_SAFE_INTEGER;
      items.push({ kind:'memory', data:m, days });
    });
  items.sort((a, b) => a.days - b.days);

  if (!items.length) {
    return (
      <View style={{ backgroundColor:colors.surf, borderRadius:24, padding:36,
        alignItems:'center', marginBottom:8, borderWidth:1,
        borderColor:(colors.isDark ? 'rgba(255,255,255,0.08)' : colors.tint) }}>
        <Text style={{ fontSize:32, marginBottom:10 }}>⭐</Text>
        <Text style={{ color:colors.text3, fontSize:14, textAlign:'center' }}>
          Star events, goals, or memories to pin them here.
        </Text>
      </View>
    );
  }

  // Mouse-friendly arrows on web (touch devices use swipe). Harmless elsewhere.
  const showArrows = Platform.OS === 'web' && items.length > 1;

  const arrowStyle = {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.isDark ? colors.glass : colors.surf,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  };

  return (
    <View style={{ marginBottom:8 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={W + 12}
        decelerationRate="fast"
        contentContainerStyle={{ gap:12 }}
        onMomentumScrollEnd={e => {
          const i = Math.round(e.nativeEvent.contentOffset.x / (W + 12));
          setIdx(Math.max(0, Math.min(i, items.length - 1)));
        }}
      >
        {items.map((item, i) => (
          <View key={i}>
            {/* Only the on-screen card on the focused Home tab ticks (per minute). */}
            {item.kind === 'event'  && <EventCard event={item.data} active={focused && i === idx} />}
            {item.kind === 'goal'   && <GoalCard  goal={item.data} />}
            {item.kind === 'memory' && <MemoryCard memory={item.data} />}
          </View>
        ))}
      </ScrollView>

      {/* Controls row below the card: ‹ arrow — dots — arrow › (arrows web-only). */}
      {items.length > 1 && (
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:12, marginTop:12 }}>
          {showArrows && (
            <TouchableOpacity onPress={() => goTo(idx - 1)} disabled={idx === 0} accessibilityLabel="Previous"
              style={[arrowStyle, { opacity: idx === 0 ? 0.35 : 1 }]}>
              <Text style={{ fontSize:20, lineHeight:22, fontWeight:'700', color:colors.text1, marginTop:-2 }}>‹</Text>
            </TouchableOpacity>
          )}
          <View style={{ flexDirection:'row', gap:6 }}>
            {items.map((_,i) => (
              <TouchableOpacity key={i} onPress={() => goTo(i)} accessibilityLabel={`Go to card ${i + 1}`}
                hitSlop={{ top:10, bottom:10, left:6, right:6 }}>
                <View style={{ height:5, borderRadius:3,
                  backgroundColor: i===idx
                    ? (colors.isDark ? '#fff' : colors.accent)
                    : (colors.isDark ? 'rgba(255,255,255,0.2)' : colors.border),
                  width: i===idx ? 18 : 5 }} />
              </TouchableOpacity>
            ))}
          </View>
          {showArrows && (
            <TouchableOpacity onPress={() => goTo(idx + 1)} disabled={idx === items.length - 1} accessibilityLabel="Next"
              style={[arrowStyle, { opacity: idx === items.length - 1 ? 0.35 : 1 }]}>
              <Text style={{ fontSize:20, lineHeight:22, fontWeight:'700', color:colors.text1, marginTop:-2 }}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
