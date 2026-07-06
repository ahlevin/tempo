import { useRef, useState } from 'react';
import { View, Text, ScrollView, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { useIsFocused } from 'expo-router';
import { catColor, dayCountColor } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { useTick } from '../contexts/TickContext';
import { useStore } from '../store/useStore';
import { nextOccurrence, daysUntil, recurLabel, nextAnnual, yearsMonthsDays, ordinal, fmtDateTimeFull, fmtMonthDay, toDate, isValidDate } from '../utils/dates';

const W = Dimensions.get('window').width - 32;

// Prominent DAYS-remaining number for the hero event card (no ring, no seconds).
// Hours/minutes are a small secondary line that refreshes per minute via the
// shared tick when this is the active card. `now` is the shared per-minute tick
// for the active card, or a one-off Date.now() snapshot for inactive cards.
function CountdownBlock({ e, accent, now }: { e: any; accent: string; now: number }) {
  const { colors } = useTheme();
  const nd     = nextOccurrence(e);
  const target = toDate(nd);
  const ms     = isValidDate(target) ? target.getTime() - now : 0;
  const d      = ms > 0 ? Math.floor(ms / 86400000) : 0;
  const h      = ms > 0 ? Math.floor((ms % 86400000) / 3600000) : 0;
  const mi     = ms > 0 ? Math.floor((ms % 3600000) / 60000) : 0;
  return (
    <View style={{ alignItems:'center', paddingVertical:6, marginBottom:8 }}>
      <Text style={{ fontSize:64, fontWeight:'800', color:accent, letterSpacing:-2, fontVariant:['tabular-nums'] }}>{d}</Text>
      <Text style={{ fontSize:11, color:colors.text3, textTransform:'uppercase', letterSpacing:1, marginTop:2 }}>
        {d === 1 ? 'day away' : 'days away'}
      </Text>
      <Text style={{ fontSize:12, color:colors.text2, marginTop:6, fontVariant:['tabular-nums'] }}>
        {h}h {mi}m
      </Text>
    </View>
  );
}

// Only the active/visible card subscribes to the shared per-minute tick; this
// separate component isolates that subscription so inactive cards never
// re-render on tick (and the shared interval idles when none are active).
function LiveCountdown({ e, accent }: { e: any; accent: string }) {
  const now = useTick();
  return <CountdownBlock e={e} accent={accent} now={now} />;
}

function EventCard({ event: e, active }: { event: any; active: boolean }) {
  const { colors } = useTheme();
  const toggleFav = useStore(s => s.toggleEventFav);

  const nd     = nextOccurrence(e);
  const accent = catColor(colors, e.cat);
  const rl     = recurLabel(e);
  const whenStr = fmtDateTimeFull(nd, e.allDay);

  return (
    <View style={{ width:W, backgroundColor: colors.isDark ? '#1A1830' : colors.surf, borderRadius:24, padding:22,
      borderWidth:1, borderColor: colors.isDark ? 'rgba(124,106,245,0.22)' : colors.border }}>
      <TouchableOpacity onPress={() => toggleFav(e.id)}
        style={{ position:'absolute', top:16, right:16, width:30, height:30, borderRadius:15,
          backgroundColor:(colors.isDark ? 'rgba(255,255,255,0.08)' : colors.tint), alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize:14 }}>⭐</Text>
      </TouchableOpacity>
      <Text style={{ fontSize:11, fontWeight:'600', letterSpacing:1.2,
        textTransform:'uppercase', color:accent, marginBottom:5 }}>
        {rl ? '🔁 ' + rl : 'Next Up'}
      </Text>
      <Text style={{ fontSize:22, fontWeight:'700', color:colors.text1,
        marginBottom:18, paddingRight:34 }} numberOfLines={1}>
        {e.emoji} {e.name}
      </Text>
      {active
        ? <LiveCountdown e={e} accent={accent} />
        : <CountdownBlock e={e} accent={accent} now={Date.now()} />}
      <View style={{ borderTopWidth:1, borderTopColor:(colors.isDark ? 'rgba(255,255,255,0.07)' : colors.track), paddingTop:10 }}>
        <Text style={{ fontSize:12, fontWeight:'600', color:colors.text1 }}>{whenStr}</Text>
      </View>
    </View>
  );
}

function GoalCard({ goal: g }: { goal: any }) {
  const { colors } = useTheme();
  const nudge     = useStore(s => s.nudgeGoal);
  const toggleFav = useStore(s => s.toggleGoalFav);
  const gp  = Math.round(Math.min(100, (g.current / g.target) * 100));
  const ms  = new Date(g.date + 'T00:00:00').getTime() - Date.now();
  const d   = ms > 0 ? Math.floor(ms / 86400000) : 0;
  const wday = new Date(g.date + 'T00:00:00').toLocaleDateString('en-US', { weekday:'long' });
  const dstr = new Date(g.date + 'T00:00:00').toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });

  return (
    <View style={{ width:W, backgroundColor: colors.isDark ? '#0F1E1A' : colors.surf, borderRadius:24, padding:22,
      borderWidth:1, borderColor: colors.isDark ? 'rgba(62,207,178,0.25)' : colors.border }}>
      <TouchableOpacity onPress={() => toggleFav(g.id)}
        style={{ position:'absolute', top:16, right:16, width:30, height:30, borderRadius:15,
          backgroundColor: colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint, alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize:14 }}>⭐</Text>
      </TouchableOpacity>
      <Text style={{ fontSize:11, fontWeight:'600', letterSpacing:1.2,
        textTransform:'uppercase', color:colors.teal, marginBottom:5 }}>Active Goal</Text>
      <Text style={{ fontSize:22, fontWeight:'700', color:colors.text1,
        marginBottom:8, paddingRight:34 }} numberOfLines={1}>
        {g.emoji} {g.name}
      </Text>

      {/* Prominent days-left number */}
      <View style={{ alignItems:'center', paddingVertical:6, marginBottom:8 }}>
        <Text style={{ fontSize:64, fontWeight:'800', color:colors.teal, letterSpacing:-2, fontVariant:['tabular-nums'] }}>{d}</Text>
        <Text style={{ fontSize:11, color:colors.text3, textTransform:'uppercase', letterSpacing:1, marginTop:2 }}>
          {d === 1 ? 'day left' : 'days left'}
        </Text>
      </View>

      {/* Progress + nudge (secondary) */}
      <View style={{ backgroundColor:(colors.isDark ? 'rgba(255,255,255,0.05)' : colors.tile), borderRadius:12, padding:10,
        flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <View>
          <Text style={{ fontSize:15, fontWeight:'800', color:colors.teal }}>
            {g.current.toLocaleString()}
            <Text style={{ fontSize:11, color:colors.text3 }}>/{g.target.toLocaleString()}</Text>
          </Text>
          <Text style={{ fontSize:9, color:colors.text3, textTransform:'uppercase' }}>{g.unit} · {gp}%</Text>
        </View>
        <View style={{ flexDirection:'row', gap:5 }}>
          <TouchableOpacity onPress={() => nudge(g.id, -1)}
            style={{ width:28, height:28, borderRadius:14,
              backgroundColor:(colors.isDark ? 'rgba(255,255,255,0.08)' : colors.tint),
              alignItems:'center', justifyContent:'center' }}>
            <Text style={{ color:colors.text2, fontWeight:'700' }}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => nudge(g.id, 1)}
            style={{ width:28, height:28, borderRadius:14,
              backgroundColor:colors.teal, alignItems:'center', justifyContent:'center' }}>
            <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontWeight:'700' }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ borderTopWidth:1, borderTopColor:(colors.isDark ? 'rgba(255,255,255,0.07)' : colors.track), paddingTop:10 }}>
        <Text style={{ fontSize:12, color:colors.text2 }}>
          <Text style={{ color:colors.text3 }}>{wday} · </Text>
          <Text style={{ fontWeight:'600', color:colors.text1 }}>{dstr}</Text>
        </Text>
      </View>
    </View>
  );
}

function MemoryCard({ memory: m }: { memory: any }) {
  const { colors } = useTheme();
  const r = yearsMonthsDays(m.originDate);

  // Birthday / anniversary / memorial → annual countdown.
  if (m.type === 'birthday' || m.type === 'anniversary' || m.type === 'memorial') {
    const isBday     = m.type === 'birthday';
    const isMemorial = m.type === 'memorial';
    const nb    = nextAnnual(m.originDate);
    const days  = daysUntil(nb);
    const num   = r.y + 1;
    // Dark keeps the decorative rose/violet. Light: labels/accents route to navy
    // (rose is reserved for crimson urgency); the big day-count uses the urgency ramp.
    // Memorial keeps its muted slate in both themes (never crimson/navy).
    const slate      = catColor(colors, 'memorial');
    const color      = isMemorial ? slate : (isBday ? colors.rose : colors.accent);
    const labelColor = isMemorial ? slate : (colors.isDark ? color : colors.accent);
    const bigColor   = isMemorial ? slate : (colors.isDark ? color : dayCountColor(colors, days));
    const eyebrow    = isBday ? 'Birthday Countdown' : isMemorial ? 'Memorial' : 'Anniversary Countdown';
    const cardBgDark = isMemorial ? '#141A22' : '#1E0F1A';
    const borderDark = isMemorial ? 'rgba(143,163,184,0.28)' : (isBday ? 'rgba(232,80,122,0.28)' : 'rgba(124,106,245,0.28)');
    const midLabel   = m.yearUnknown ? fmtMonthDay(m.originDate)
      : isBday ? `Turning ${num}`
      : isMemorial ? `Remembering · ${num} years`
      : `${ordinal(num)} Anniversary`;
    const wday  = new Date(nb + 'T00:00:00').toLocaleDateString('en-US', { weekday:'long' });
    // Year unknown → the next-occurrence date drops the year (no fake year printed).
    const dstr  = new Date(nb + 'T00:00:00').toLocaleDateString('en-US',
      m.yearUnknown ? { month:'long', day:'numeric' } : { month:'long', day:'numeric', year:'numeric' });
    return (
      <View style={{ width:W, backgroundColor: colors.isDark ? cardBgDark : colors.surf, borderRadius:24, padding:22,
        borderWidth:1, borderColor: colors.isDark ? borderDark : colors.border }}>
        <Text style={{ fontSize:11, fontWeight:'600', letterSpacing:1.2, textTransform:'uppercase', color:labelColor, marginBottom:5 }}>
          {eyebrow}
        </Text>
        <Text style={{ fontSize:22, fontWeight:'700', color:colors.text1, marginBottom:4 }} numberOfLines={1}>
          {m.emoji} {m.name}
        </Text>
        <Text style={{ fontSize:14, fontWeight:'600', color:labelColor, marginBottom:14 }}>
          {midLabel}
        </Text>
        <View style={{ alignItems:'center', paddingVertical:10 }}>
          <Text style={{ fontSize:64, fontWeight:'800', color:bigColor, letterSpacing:-2, fontVariant:['tabular-nums'] }}>{days}</Text>
          <Text style={{ fontSize:11, color:colors.text3, textTransform:'uppercase', letterSpacing:1, marginTop:4 }}>days away</Text>
        </View>
        <View style={{ borderTopWidth:1, borderTopColor:(colors.isDark ? 'rgba(255,255,255,0.07)' : colors.track), paddingTop:10 }}>
          <Text style={{ fontSize:12, color:colors.text2 }}>
            <Text style={{ color:colors.text3 }}>{wday} · </Text>
            <Text style={{ fontWeight:'600', color:colors.text1 }}>{dstr}</Text>
          </Text>
        </View>
      </View>
    );
  }

  // Life log → count of entries.
  if (m.type === 'lifelog') {
    const color = colors.teal;
    const bigVal   = m.entries.length;
    const bigLabel = m.entries.length === 1 ? 'time' : 'times';
    const dstr = new Date(m.originDate + 'T00:00:00').toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
    return (
      <View style={{ width:W, backgroundColor: colors.isDark ? '#0F1E1A' : colors.surf, borderRadius:24, padding:22,
        borderWidth:1, borderColor: colors.isDark ? 'rgba(62,207,178,0.28)' : colors.border }}>
        <Text style={{ fontSize:11, fontWeight:'600', letterSpacing:1.2, textTransform:'uppercase', color, marginBottom:5 }}>
          Life Log
        </Text>
        <Text style={{ fontSize:22, fontWeight:'700', color:colors.text1, marginBottom:14 }} numberOfLines={1}>
          {m.emoji} {m.name}
        </Text>
        <View style={{ alignItems:'center', paddingVertical:10 }}>
          <Text style={{ fontSize:64, fontWeight:'800', color, letterSpacing:-2, fontVariant:['tabular-nums'] }}>{bigVal}</Text>
          <Text style={{ fontSize:11, color:colors.text3, textTransform:'uppercase', letterSpacing:1, marginTop:4 }}>{bigLabel}</Text>
        </View>
        <View style={{ borderTopWidth:1, borderTopColor:(colors.isDark ? 'rgba(255,255,255,0.07)' : colors.track), paddingTop:10 }}>
          <Text style={{ fontSize:12, color:colors.text2 }}>
            <Text style={{ color:colors.text3 }}>Since </Text>
            <Text style={{ fontWeight:'600', color:colors.text1 }}>{dstr}</Text>
          </Text>
        </View>
      </View>
    );
  }

  // Unknown/legacy type (e.g. a removed 'milestone') → render nothing.
  return null;
}

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
  // sorted by soonest upcoming date. Memories no longer auto-appear.
  const items: { kind: 'event' | 'goal' | 'memory'; data: any; days: number }[] = [];
  events.filter(e => e.fav).forEach(e => items.push({ kind:'event', data:e, days: daysUntil(nextOccurrence(e)) }));
  goals.filter(g => g.fav).forEach(g => items.push({ kind:'goal', data:g, days: daysUntil(g.date) }));
  memories
    .filter(m => m.fav && (m.type === 'birthday' || m.type === 'anniversary' || m.type === 'memorial' || m.type === 'lifelog'))
    .forEach(m => {
      // birthdays/anniversaries/memorials have a next-occurrence; life logs don't, so they sort last.
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

  return (
    <View style={{ marginBottom:8 }}>
      <View style={{ position:'relative' }}>
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
              {/* Only the on-screen card on the focused Home tab ticks per second. */}
              {item.kind === 'event'  && <EventCard event={item.data} active={focused && i === idx} />}
              {item.kind === 'goal'   && <GoalCard  goal={item.data} />}
              {item.kind === 'memory' && <MemoryCard memory={item.data} />}
            </View>
          ))}
        </ScrollView>

        {/* Prev — hidden on the first card so there are no dead clicks */}
        {showArrows && idx > 0 && (
          <View pointerEvents="box-none" style={{ position:'absolute', left:4, top:0, bottom:0, justifyContent:'center' }}>
            <TouchableOpacity onPress={() => goTo(idx - 1)} accessibilityLabel="Previous" style={ARROW_BTN}>
              <Text style={[ARROW_TXT, { color: '#fff' }]}>‹</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Next — hidden on the last card */}
        {showArrows && idx < items.length - 1 && (
          <View pointerEvents="box-none" style={{ position:'absolute', right:4, top:0, bottom:0, justifyContent:'center' }}>
            <TouchableOpacity onPress={() => goTo(idx + 1)} accessibilityLabel="Next" style={ARROW_BTN}>
              <Text style={[ARROW_TXT, { color: '#fff' }]}>›</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {items.length > 1 && (
        <View style={{ flexDirection:'row', justifyContent:'center', gap:6, marginTop:10 }}>
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
      )}
    </View>
  );
}

const ARROW_BTN = {
  width: 36, height: 36, borderRadius: 18,
  backgroundColor: 'rgba(10,10,15,0.72)',
  alignItems: 'center' as const, justifyContent: 'center' as const,
};
const ARROW_TXT = { fontSize: 22, lineHeight: 24, fontWeight: '700' as const, marginTop: -2 };
