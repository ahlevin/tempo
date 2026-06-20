import { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, CatColors } from '../constants/colors';
import { useStore } from '../store/useStore';
import { nextOccurrence, daysUntil, pctElapsed, recurLabel, nextAnnual, yearsMonthsDays, ordinal } from '../utils/dates';

const W = Dimensions.get('window').width - 32;
const CIRC = 301.6;

function Ring({ pct, color }: { pct: number; color: string }) {
  const filled = CIRC * pct / 100;
  const empty  = CIRC - filled;
  return (
    <View style={{ width:100, height:100, position:'relative' }}>
      <View style={{ width:100, height:100, borderRadius:50,
        borderWidth:6, borderColor:'rgba(255,255,255,0.07)', position:'absolute' }} />
      <View style={{ width:100, height:100, borderRadius:50,
        borderWidth:6, borderColor:color,
        borderTopColor:'transparent', borderLeftColor:'transparent',
        position:'absolute', transform:[{ rotate: (pct * 3.6 - 90) + 'deg' }] }} />
      <View style={{ position:'absolute', inset:0, alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize:17, fontWeight:'800', color }}>{pct}%</Text>
        <Text style={{ fontSize:8, color:Colors.text3, textTransform:'uppercase', letterSpacing:0.5 }}>elapsed</Text>
      </View>
    </View>
  );
}

// Two concentric SVG rings: outer = time elapsed, inner = goal progress.
function DualRing({ goalPct, timePct }: { goalPct: number; timePct: number }) {
  const SIZE = 100, STROKE = 7;
  const cx = SIZE / 2, cy = SIZE / 2;
  const rOuter = 46, rInner = 33;
  const cOuter = 2 * Math.PI * rOuter;
  const cInner = 2 * Math.PI * rInner;
  const track  = 'rgba(255,255,255,0.07)';

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        {/* Outer track + time elapsed */}
        <Circle cx={cx} cy={cy} r={rOuter} stroke={track} strokeWidth={STROKE} fill="none" />
        <Circle cx={cx} cy={cy} r={rOuter} stroke={Colors.amber} strokeWidth={STROKE} fill="none"
          strokeLinecap="round" strokeDasharray={cOuter}
          strokeDashoffset={cOuter * (1 - Math.min(100, timePct) / 100)}
          transform={`rotate(-90 ${cx} ${cy})`} />
        {/* Inner track + goal progress */}
        <Circle cx={cx} cy={cy} r={rInner} stroke={track} strokeWidth={STROKE} fill="none" />
        <Circle cx={cx} cy={cy} r={rInner} stroke={Colors.teal} strokeWidth={STROKE} fill="none"
          strokeLinecap="round" strokeDasharray={cInner}
          strokeDashoffset={cInner * (1 - Math.min(100, goalPct) / 100)}
          transform={`rotate(-90 ${cx} ${cy})`} />
      </Svg>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.teal }}>{goalPct}%</Text>
        <Text style={{ fontSize: 7, color: Colors.text3, textTransform: 'uppercase' }}>goal</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.amber, marginTop: 1 }}>{timePct}%</Text>
        <Text style={{ fontSize: 7, color: Colors.text3, textTransform: 'uppercase' }}>time</Text>
      </View>
    </View>
  );
}

function EventCard({ event: e }: { event: any }) {
  const toggleFav = useStore(s => s.toggleEventFav);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const nd     = nextOccurrence(e);
  const ms     = new Date(nd + 'T00:00:00').getTime() - Date.now();
  const d      = ms > 0 ? Math.floor(ms / 86400000) : 0;
  const h      = ms > 0 ? Math.floor((ms % 86400000) / 3600000) : 0;
  const mi     = ms > 0 ? Math.floor((ms % 3600000) / 60000) : 0;
  const s      = ms > 0 ? Math.floor((ms % 60000) / 1000) : 0;
  const p      = pctElapsed(e.created, nd);
  const accent = CatColors[e.cat] || Colors.accent;
  const rl     = recurLabel(e);
  const wday   = new Date(nd + 'T00:00:00').toLocaleDateString('en-US', { weekday:'long' });
  const dstr   = new Date(nd + 'T00:00:00').toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
  const pad    = (n: number) => String(n).padStart(2, '0');

  return (
    <View style={{ width:W, backgroundColor:'#1A1830', borderRadius:24, padding:22,
      borderWidth:1, borderColor:'rgba(124,106,245,0.22)' }}>
      <TouchableOpacity onPress={() => toggleFav(e.id)}
        style={{ position:'absolute', top:16, right:16, width:30, height:30, borderRadius:15,
          backgroundColor:'rgba(255,255,255,0.08)', alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize:14 }}>⭐</Text>
      </TouchableOpacity>
      <Text style={{ fontSize:11, fontWeight:'600', letterSpacing:1.2,
        textTransform:'uppercase', color:accent, marginBottom:5 }}>
        {rl ? '🔁 ' + rl : 'Next Up'}
      </Text>
      <Text style={{ fontSize:22, fontWeight:'700', color:Colors.text1,
        marginBottom:18, paddingRight:34 }} numberOfLines={1}>
        {e.emoji} {e.name}
      </Text>
      <View style={{ flexDirection:'row', alignItems:'center', gap:16, marginBottom:14 }}>
        <Ring pct={p} color={accent} />
        <View style={{ flex:1, flexDirection:'row', flexWrap:'wrap', gap:6 }}>
          {[
            { n:pad(d),  l:'Days',  c:accent },
            { n:pad(h),  l:'Hours', c:Colors.text1 },
            { n:pad(mi), l:'Mins',  c:Colors.text1 },
            { n:pad(s),  l:'Secs',  c:accent },
          ].map(u => (
            <View key={u.l} style={{ width:'46%', backgroundColor:'rgba(255,255,255,0.05)',
              borderRadius:12, padding:9 }}>
              <Text style={{ fontSize:20, fontWeight:'800', color:u.c,
                fontVariant:['tabular-nums'] }}>{u.n}</Text>
              <Text style={{ fontSize:9, color:Colors.text3,
                textTransform:'uppercase', marginTop:2 }}>{u.l}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.07)', paddingTop:10 }}>
        <Text style={{ fontSize:12, color:Colors.text2 }}>
          <Text style={{ color:Colors.text3 }}>{wday} · </Text>
          <Text style={{ fontWeight:'600', color:Colors.text1 }}>{dstr}</Text>
        </Text>
      </View>
    </View>
  );
}

function GoalCard({ goal: g }: { goal: any }) {
  const nudge     = useStore(s => s.nudgeGoal);
  const toggleFav = useStore(s => s.toggleGoalFav);
  const tp  = pctElapsed(g.created, g.date);
  const gp  = Math.round(Math.min(100, (g.current / g.target) * 100));
  const ms  = new Date(g.date + 'T00:00:00').getTime() - Date.now();
  const d   = ms > 0 ? Math.floor(ms / 86400000) : 0;
  const wday = new Date(g.date + 'T00:00:00').toLocaleDateString('en-US', { weekday:'long' });
  const dstr = new Date(g.date + 'T00:00:00').toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });

  return (
    <View style={{ width:W, backgroundColor:'#0F1E1A', borderRadius:24, padding:22,
      borderWidth:1, borderColor:'rgba(62,207,178,0.25)' }}>
      <TouchableOpacity onPress={() => toggleFav(g.id)}
        style={{ position:'absolute', top:16, right:16, width:30, height:30, borderRadius:15,
          backgroundColor:'rgba(62,207,178,0.12)', alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize:14 }}>⭐</Text>
      </TouchableOpacity>
      <Text style={{ fontSize:11, fontWeight:'600', letterSpacing:1.2,
        textTransform:'uppercase', color:Colors.teal, marginBottom:5 }}>Active Goal</Text>
      <Text style={{ fontSize:22, fontWeight:'700', color:Colors.text1,
        marginBottom:18, paddingRight:34 }} numberOfLines={1}>
        {g.emoji} {g.name}
      </Text>
      <View style={{ flexDirection:'row', alignItems:'center', gap:12, marginBottom:14 }}>
        <DualRing goalPct={gp} timePct={tp} />
        <View style={{ flex:1, gap:6 }}>
          <View style={{ backgroundColor:'rgba(255,255,255,0.05)', borderRadius:12, padding:9 }}>
            <Text style={{ fontSize:20, fontWeight:'800', color:Colors.teal,
              fontVariant:['tabular-nums'] }}>{String(d).padStart(2,'0')}</Text>
            <Text style={{ fontSize:9, color:Colors.text3, textTransform:'uppercase', marginTop:2 }}>Days Left</Text>
          </View>
          <View style={{ backgroundColor:'rgba(255,255,255,0.05)', borderRadius:12, padding:9,
            flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <View>
              <Text style={{ fontSize:15, fontWeight:'800', color:Colors.teal }}>
                {g.current.toLocaleString()}
                <Text style={{ fontSize:11, color:Colors.text3 }}>/{g.target.toLocaleString()}</Text>
              </Text>
              <Text style={{ fontSize:9, color:Colors.text3, textTransform:'uppercase' }}>{g.unit}</Text>
            </View>
            <View style={{ flexDirection:'row', gap:5 }}>
              <TouchableOpacity onPress={() => nudge(g.id, -1)}
                style={{ width:28, height:28, borderRadius:14,
                  backgroundColor:'rgba(255,255,255,0.08)',
                  alignItems:'center', justifyContent:'center' }}>
                <Text style={{ color:Colors.text2, fontWeight:'700' }}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => nudge(g.id, 1)}
                style={{ width:28, height:28, borderRadius:14,
                  backgroundColor:Colors.teal, alignItems:'center', justifyContent:'center' }}>
                <Text style={{ color:'#0A0A0F', fontWeight:'700' }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
      <View style={{ borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.07)', paddingTop:10 }}>
        <Text style={{ fontSize:12, color:Colors.text2 }}>
          <Text style={{ color:Colors.text3 }}>{wday} · </Text>
          <Text style={{ fontWeight:'600', color:Colors.text1 }}>{dstr}</Text>
        </Text>
      </View>
    </View>
  );
}

function MemoryCard({ memory: m, type }: { memory: any; type: 'bday' | 'anniv' }) {
  const isBday = type === 'bday';
  const nb     = nextAnnual(m.originDate);
  const r      = yearsMonthsDays(m.originDate);
  const days   = daysUntil(nb);
  const num    = r.y + 1;
  const color  = isBday ? Colors.rose : Colors.accent;
  const wday   = new Date(nb + 'T00:00:00').toLocaleDateString('en-US', { weekday:'long' });
  const dstr   = new Date(nb + 'T00:00:00').toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });

  return (
    <View style={{ width:W, backgroundColor:'#1E0F1A', borderRadius:24, padding:22,
      borderWidth:1, borderColor: isBday ? 'rgba(232,80,122,0.28)' : 'rgba(124,106,245,0.28)' }}>
      <Text style={{ fontSize:11, fontWeight:'600', letterSpacing:1.2,
        textTransform:'uppercase', color, marginBottom:5 }}>
        {isBday ? 'Birthday Countdown' : 'Anniversary Countdown'}
      </Text>
      <Text style={{ fontSize:22, fontWeight:'700', color:Colors.text1, marginBottom:18 }}>
        {m.emoji} {isBday ? 'Turning ' + num : ordinal(num) + ' Anniversary'}
      </Text>
      <View style={{ alignItems:'center', paddingVertical:14 }}>
        <Text style={{ fontSize:64, fontWeight:'800', color,
          letterSpacing:-2, fontVariant:['tabular-nums'] }}>{days}</Text>
        <Text style={{ fontSize:11, color:Colors.text3,
          textTransform:'uppercase', letterSpacing:1, marginTop:4 }}>days away</Text>
      </View>
      <View style={{ borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.07)', paddingTop:10 }}>
        <Text style={{ fontSize:12, color:Colors.text2 }}>
          <Text style={{ color:Colors.text3 }}>{wday} · </Text>
          <Text style={{ fontWeight:'600', color:Colors.text1 }}>{dstr}</Text>
        </Text>
      </View>
    </View>
  );
}

export function HeroCarousel() {
  const events   = useStore(s => s.events);
  const goals    = useStore(s => s.goals);
  const memories = useStore(s => s.memories);
  const [idx, setIdx] = useState(0);

  const items: any[] = [];
  events.filter(e => e.fav)
    .sort((a,b) => daysUntil(nextOccurrence(a)) - daysUntil(nextOccurrence(b)))
    .forEach(e => items.push({ type:'event', data:e }));
  goals.filter(g => g.fav)
    .forEach(g => items.push({ type:'goal', data:g }));
  memories.forEach(m => {
    if (m.type === 'birthday')    items.push({ type:'bday',  data:m });
    if (m.type === 'anniversary') items.push({ type:'anniv', data:m });
  });

  if (!items.length) {
    return (
      <View style={{ backgroundColor:Colors.surf, borderRadius:24, padding:36,
        alignItems:'center', marginBottom:8, borderWidth:1,
        borderColor:'rgba(255,255,255,0.08)' }}>
        <Text style={{ fontSize:32, marginBottom:10 }}>⭐</Text>
        <Text style={{ color:Colors.text3, fontSize:14, textAlign:'center' }}>
          Star events or goals to pin them here.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginBottom:8 }}>
      <ScrollView
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
            {item.type === 'event' && <EventCard event={item.data} />}
            {item.type === 'goal'  && <GoalCard  goal={item.data} />}
            {item.type === 'bday'  && <MemoryCard memory={item.data} type="bday" />}
            {item.type === 'anniv' && <MemoryCard memory={item.data} type="anniv" />}
          </View>
        ))}
      </ScrollView>
      {items.length > 1 && (
        <View style={{ flexDirection:'row', justifyContent:'center', gap:6, marginTop:10 }}>
          {items.map((_,i) => (
            <View key={i} style={{ height:5, borderRadius:3,
              backgroundColor: i===idx ? '#fff' : 'rgba(255,255,255,0.2)',
              width: i===idx ? 18 : 5 }} />
          ))}
        </View>
      )}
    </View>
  );
}
