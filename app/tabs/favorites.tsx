import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useStore } from '../../store/useStore';
import { SwipeableRow } from '../../components/SwipeableRow';
import { nextOccurrence, daysUntil, urgencyColor, fmtDateTime } from '../../utils/dates';

export default function FavoritesScreen() {
  const events = useStore(s => s.events);
  const goals  = useStore(s => s.goals);
  const toggleEventFav = useStore(s => s.toggleEventFav);
  const toggleGoalFav  = useStore(s => s.toggleGoalFav);
  const deleteEvent    = useStore(s => s.deleteEvent);
  const deleteGoal     = useStore(s => s.deleteGoal);

  const favEvents = events.filter(e => e.fav)
    .sort((a,b) => daysUntil(nextOccurrence(a)) - daysUntil(nextOccurrence(b)));
  const favGoals = goals.filter(g => g.fav);
  const empty = !favEvents.length && !favGoals.length;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:Colors.bg }} edges={['top']}>
      <View style={{ paddingHorizontal:20, paddingBottom:12 }}>
        <Text style={{ fontSize:24, fontWeight:'700', color:Colors.text1 }}>Favorites</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal:16, paddingBottom:120 }}
        showsVerticalScrollIndicator={false}>
        {empty && (
          <View style={{ alignItems:'center', paddingVertical:60 }}>
            <Text style={{ fontSize:40, marginBottom:12 }}>⭐</Text>
            <Text style={{ color:Colors.text3, fontSize:15, textAlign:'center' }}>
              No favorites yet.{'\n'}Tap ☆ on any event or goal.
            </Text>
          </View>
        )}
        {favEvents.length > 0 && (
          <View>
            <Text style={{ fontSize:16, fontWeight:'700', color:Colors.text1, marginBottom:10, marginTop:4 }}>Events</Text>
            {favEvents.map(e => {
              const nd = nextOccurrence(e);
              const d  = daysUntil(nd);
              const uc = urgencyColor(d);
              return (
                <SwipeableRow key={e.id} onDelete={() => deleteEvent(e.id)}
                  confirmTitle="Delete Event" confirmMessage={`Delete "${e.name}"? This can't be undone.`}>
                <TouchableOpacity activeOpacity={0.8}
                  onPress={() => router.push({ pathname:'/modals/edit-event', params:{ id:e.id } })}
                  style={{ backgroundColor:Colors.surf, borderRadius:18,
                  borderWidth:1, borderColor:Colors.border, padding:14,
                  marginBottom:8, flexDirection:'row', alignItems:'center', gap:12 }}>
                  <Text style={{ fontSize:22 }}>{e.emoji}</Text>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:14, fontWeight:'600', color:Colors.text1 }}>{e.name}</Text>
                    <Text style={{ fontSize:11, color:Colors.text3, marginTop:2 }}>
                      {fmtDateTime(nd, e.allDay)}
                    </Text>
                  </View>
                  <View style={{ alignItems:'flex-end', gap:4 }}>
                    <Text style={{ fontSize:20, fontWeight:'800', color:uc }}>{d}</Text>
                    <Text style={{ fontSize:9, color:Colors.text3, textTransform:'uppercase' }}>
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
        {favGoals.length > 0 && (
          <View style={{ marginTop: favEvents.length ? 16 : 0 }}>
            <Text style={{ fontSize:16, fontWeight:'700', color:Colors.text1, marginBottom:10 }}>Goals</Text>
            {favGoals.map(g => {
              const pct = Math.round(Math.min(100,(g.current/g.target)*100));
              return (
                <SwipeableRow key={g.id} onDelete={() => deleteGoal(g.id)}
                  confirmTitle="Delete Goal" confirmMessage={`Delete "${g.name}"? This can't be undone.`}>
                <TouchableOpacity activeOpacity={0.8}
                  onPress={() => router.push({ pathname:'/modals/edit-goal', params:{ id:g.id } })}
                  style={{ backgroundColor:Colors.surf, borderRadius:18,
                  borderWidth:1, borderColor:'rgba(62,207,178,0.2)',
                  padding:14, marginBottom:8 }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:12, marginBottom:8 }}>
                    <Text style={{ fontSize:22 }}>{g.emoji}</Text>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:14, fontWeight:'600', color:Colors.text1 }}>{g.name}</Text>
                    </View>
                    <TouchableOpacity hitSlop={{ top:8, bottom:8, left:8, right:8 }}
                      onPress={(ev) => { ev.stopPropagation(); toggleGoalFav(g.id); }}>
                      <Text style={{ fontSize:16 }}>⭐</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ height:6, backgroundColor:'rgba(255,255,255,0.07)',
                    borderRadius:3, overflow:'hidden' }}>
                    <View style={{ height:'100%', width:`${pct}%`,
                      backgroundColor:Colors.teal, borderRadius:3 }} />
                  </View>
                  <Text style={{ fontSize:12, color:Colors.teal, marginTop:5, fontWeight:'600' }}>
                    {g.current.toLocaleString()} / {g.target.toLocaleString()} {g.unit} · {pct}%
                  </Text>
                </TouchableOpacity>
                </SwipeableRow>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
