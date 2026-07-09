import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { CloseButton } from '../../components/CloseButton';
import { dayCountColor, lightCardShadow, catColor } from '../../constants/colors';
import { useStore } from '../../store/useStore';
import { SwipeableRow } from '../../components/SwipeableRow';
import { MemoryCard } from '../../components/MemoryCard';
import { visibleHolidays } from '../../constants/holidays';
import { openEventDetail, openGoalDetail, openHolidayDetail, openLogEntryDetail } from '../../utils/nav';
import { nextOccurrence, daysUntil, fmtDateTime } from '../../utils/dates';
import { isUpcomingEntry } from '../../utils/lifelog';

// Favorites now lives as a sub-screen linked from Profile (was its own tab).
export default function FavoritesScreen() {
  const { colors } = useTheme();
  const events   = useStore(s => s.events);
  const goals    = useStore(s => s.goals);
  const memories = useStore(s => s.memories);
  const holidayPrefs   = useStore(s => s.prefs.holidays);
  const toggleEventFav = useStore(s => s.toggleEventFav);
  const toggleGoalFav  = useStore(s => s.toggleGoalFav);
  const toggleLogEntryFav = useStore(s => s.toggleLogEntryFav);
  const setHolidayFav  = useStore(s => s.setHolidayFav);
  const deleteEvent    = useStore(s => s.deleteEvent);
  const deleteGoal     = useStore(s => s.deleteGoal);
  const deleteLogEntry = useStore(s => s.deleteLogEntry);

  const favEvents = events.filter(e => e.fav)
    .sort((a,b) => daysUntil(nextOccurrence(a)) - daysUntil(nextOccurrence(b)));
  const favGoals = goals.filter(g => g.fav);
  // Favorited UPCOMING life-log entries (each an entry inside a lifelog memory).
  const favLogEntries = memories
    .filter(m => m.type === 'lifelog')
    .flatMap(m => m.entries.map((e, index) => ({ m, e, index }))
      .filter(({ e }) => e.fav && isUpcomingEntry(e))
      .map(({ e, index }) => ({
        memId: m.id, index, emoji: m.emoji, logName: m.name,
        label: e.item || m.name, dateISO: e.date, days: daysUntil(e.date),
      })))
    .sort((a,b) => a.days - b.days);
  const favMemories = memories.filter(m => m.fav);
  const favHolidays = visibleHolidays(holidayPrefs).filter(h => h.fav);
  const empty = !favEvents.length && !favGoals.length && !favLogEntries.length && !favMemories.length && !favHolidays.length;

  const hcolor = catColor(colors, 'holidays');

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2 }} edges={['top']}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center',
        paddingHorizontal:20, paddingVertical:14 }}>
        <Text style={{ fontSize:22, fontWeight:'700', color:colors.text1 }}>Favorites</Text>
        <CloseButton />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal:16, paddingBottom:60 }}
        showsVerticalScrollIndicator={false}>
        {empty && (
          <View style={{ alignItems:'center', paddingVertical:60 }}>
            <Text style={{ fontSize:40, marginBottom:12 }}>⭐</Text>
            <Text style={{ color:colors.text2, fontSize:15, textAlign:'center' }}>
              No favorites yet.{'\n'}Tap ☆ on any event, goal, memory, or holiday.
            </Text>
          </View>
        )}
        {favEvents.length > 0 && (
          <View>
            <Text style={{ fontSize:16, fontWeight:'700', color:colors.text1, marginBottom:10, marginTop:4 }}>Events</Text>
            {favEvents.map(e => {
              const nd = nextOccurrence(e);
              const d  = daysUntil(nd);
              const uc = dayCountColor(colors, d);
              return (
                <SwipeableRow key={e.id} onDelete={() => deleteEvent(e.id)}
                  confirmTitle="Delete Event" confirmMessage={`Delete "${e.name}"? This can't be undone.`}>
                <TouchableOpacity activeOpacity={0.8}
                  onPress={() => openEventDetail(e.id)}
                  style={{ backgroundColor:colors.surf, borderRadius:18,
                  borderWidth:1, borderColor:colors.border, padding:14,
                  marginBottom:8, flexDirection:'row', alignItems:'center', gap:12,
                  ...(colors.isDark ? null : lightCardShadow) }}>
                  <Text style={{ fontSize:22 }}>{e.emoji}</Text>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:14, fontWeight:'600', color:colors.text1 }}>{e.name}</Text>
                    <Text style={{ fontSize:13, color:colors.text2, marginTop:2 }}>
                      {fmtDateTime(nd, e.allDay)}
                    </Text>
                  </View>
                  <View style={{ alignItems:'flex-end', gap:4 }}>
                    <Text style={{ fontSize:20, fontWeight:'800', color:uc }}>{d}</Text>
                    <Text style={{ fontSize:9, color:colors.text3, textTransform:'uppercase' }}>
                      {d===1?'day':'days'}
                    </Text>
                    <TouchableOpacity hitSlop={{ top:8, bottom:8, left:8, right:8 }}
                      onPress={(ev) => { ev.stopPropagation(); toggleEventFav(e.id); }}>
                      <Text style={{ fontSize:16 }}>⭐</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
                </SwipeableRow>
              );
            })}
          </View>
        )}
        {favHolidays.length > 0 && (
          <View style={{ marginTop: favEvents.length ? 16 : 0 }}>
            <Text style={{ fontSize:16, fontWeight:'700', color:colors.text1, marginBottom:10 }}>Holidays</Text>
            {favHolidays.map(h => (
              <TouchableOpacity key={h.id} activeOpacity={0.8}
                onPress={() => openHolidayDetail(h.id)}
                style={{ backgroundColor:colors.surf, borderRadius:18, borderWidth:1, borderColor:colors.border,
                  padding:14, marginBottom:8, flexDirection:'row', alignItems:'center', gap:12,
                  ...(colors.isDark ? null : lightCardShadow) }}>
                <Text style={{ fontSize:22 }}>{h.emoji}</Text>
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:14, fontWeight:'600', color:colors.text1 }}>{h.name}</Text>
                  <Text style={{ fontSize:13, color:colors.text2, marginTop:2 }}>Holiday · repeats yearly</Text>
                </View>
                <View style={{ alignItems:'flex-end', gap:4 }}>
                  <Text style={{ fontSize:20, fontWeight:'800', color:hcolor }}>{h.days}</Text>
                  <Text style={{ fontSize:9, color:colors.text3, textTransform:'uppercase' }}>{h.days===1?'day':'days'}</Text>
                  <TouchableOpacity hitSlop={{ top:8, bottom:8, left:8, right:8 }}
                    onPress={(ev) => { ev.stopPropagation(); setHolidayFav(h.id, false); }}>
                    <Text style={{ fontSize:16 }}>⭐</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {favGoals.length > 0 && (
          <View style={{ marginTop: (favEvents.length || favHolidays.length) ? 16 : 0 }}>
            <Text style={{ fontSize:16, fontWeight:'700', color:colors.text1, marginBottom:10 }}>Goals</Text>
            {favGoals.map(g => {
              const pct = Math.round(Math.min(100,(g.current/g.target)*100));
              return (
                <SwipeableRow key={g.id} onDelete={() => deleteGoal(g.id)}
                  confirmTitle="Delete Goal" confirmMessage={`Delete "${g.name}"? This can't be undone.`}>
                <TouchableOpacity activeOpacity={0.8}
                  onPress={() => openGoalDetail(g.id)}
                  style={{ backgroundColor:colors.surf, borderRadius:18,
                  borderWidth:1, borderColor: colors.isDark ? 'rgba(62,207,178,0.2)' : colors.border,
                  padding:14, marginBottom:8, ...(colors.isDark ? null : lightCardShadow) }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:12, marginBottom:8 }}>
                    <Text style={{ fontSize:22 }}>{g.emoji}</Text>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:14, fontWeight:'600', color:colors.text1 }}>{g.name}</Text>
                    </View>
                    <TouchableOpacity hitSlop={{ top:8, bottom:8, left:8, right:8 }}
                      onPress={(ev) => { ev.stopPropagation(); toggleGoalFav(g.id); }}>
                      <Text style={{ fontSize:16 }}>⭐</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ height:6, backgroundColor:colors.track,
                    borderRadius:3, overflow:'hidden' }}>
                    <View style={{ height:'100%', width:`${pct}%`,
                      backgroundColor:colors.teal, borderRadius:3 }} />
                  </View>
                  <Text style={{ fontSize:12, color:colors.teal, marginTop:5, fontWeight:'600' }}>
                    {g.current.toLocaleString()} / {g.target.toLocaleString()} {g.unit} · {pct}%
                  </Text>
                </TouchableOpacity>
                </SwipeableRow>
              );
            })}
          </View>
        )}
        {favLogEntries.length > 0 && (
          <View style={{ marginTop: (favEvents.length || favHolidays.length || favGoals.length) ? 16 : 0 }}>
            <Text style={{ fontSize:16, fontWeight:'700', color:colors.text1, marginBottom:10 }}>Life Log</Text>
            {favLogEntries.map(it => {
              const uc = dayCountColor(colors, it.days);
              const dstr = new Date(it.dateISO + 'T00:00:00').toLocaleDateString('en-US',
                { weekday:'short', month:'short', day:'numeric' });
              return (
                <SwipeableRow key={`${it.memId}:${it.index}`} onDelete={() => deleteLogEntry(it.memId, it.index)}
                  confirmTitle={`Delete "${it.label}"?`}
                  confirmMessage="This removes it from Countdowns and its life log.">
                <TouchableOpacity activeOpacity={0.8}
                  onPress={() => openLogEntryDetail(it.memId, it.index)}
                  style={{ backgroundColor:colors.surf, borderRadius:18,
                  borderWidth:1, borderColor:colors.border, padding:14,
                  marginBottom:8, flexDirection:'row', alignItems:'center', gap:12,
                  ...(colors.isDark ? null : lightCardShadow) }}>
                  <Text style={{ fontSize:22 }}>{it.emoji}</Text>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:14, fontWeight:'600', color:colors.text1 }}>{it.label}</Text>
                    <Text style={{ fontSize:13, color:colors.text2, marginTop:2 }}>{it.logName} · {dstr}</Text>
                  </View>
                  <View style={{ alignItems:'flex-end', gap:4 }}>
                    <Text style={{ fontSize:20, fontWeight:'800', color:uc }}>{it.days}</Text>
                    <Text style={{ fontSize:9, color:colors.text3, textTransform:'uppercase' }}>{it.days===1?'day':'days'}</Text>
                    <TouchableOpacity hitSlop={{ top:8, bottom:8, left:8, right:8 }}
                      onPress={(ev) => { ev.stopPropagation(); toggleLogEntryFav(it.memId, it.index); }}>
                      <Text style={{ fontSize:16 }}>⭐</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
                </SwipeableRow>
              );
            })}
          </View>
        )}
        {favMemories.length > 0 && (
          <View style={{ marginTop: (favEvents.length || favHolidays.length || favGoals.length || favLogEntries.length) ? 16 : 0 }}>
            <Text style={{ fontSize:16, fontWeight:'700', color:colors.text1, marginBottom:10 }}>Memories</Text>
            {favMemories.map(m => <MemoryCard key={m.id} memory={m} />)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
