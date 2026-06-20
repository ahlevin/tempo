import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { useStore } from '../../store/useStore';
import { nextOccurrence, daysUntil, urgencyColor } from '../../utils/dates';

export default function FavoritesScreen() {
  const events = useStore(s => s.events);
  const goals  = useStore(s => s.goals);
  const toggleEventFav = useStore(s => s.toggleEventFav);
  const toggleGoalFav  = useStore(s => s.toggleGoalFav);

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
                <View key={e.id} style={{ backgroundColor:Colors.surf, borderRadius:18,
                  borderWidth:1, borderColor:Colors.border, padding:14,
                  marginBottom:8, flexDirection:'row', alignItems:'center', gap:12 }}>
                  <Text style={{ fontSize:22 }}>{e.emoji}</Text>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:14, fontWeight:'600', color:Colors.text1 }}>{e.name}</Text>
                    <Text style={{ fontSize:11, color:Colors.text3, marginTop:2 }}>
                      {new Date(nd+'T00:00:00').toLocaleDateString('en-US',
                        {weekday:'short',month:'short',day:'numeric',year:'numeric'})}
                    </Text>
                  </View>
                  <View style={{ alignItems:'flex-end', gap:4 }}>
                    <Text style={{ fontSize:20, fontWeight:'800', color:uc }}>{d}</Text>
                    <Text style={{ fontSize:9, color:Colors.text3, textTransform:'uppercase' }}>
                      {d===1?'day':'days'}
                    </Text>
                    <TouchableOpacity onPress={() => toggleEventFav(e.id)}>
                      <Text style={{ fontSize:16 }}>⭐</Text>
                    </TouchableOpacity>
                  </View>
                </View>
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
                <View key={g.id} style={{ backgroundColor:Colors.surf, borderRadius:18,
                  borderWidth:1, borderColor:'rgba(62,207,178,0.2)',
                  padding:14, marginBottom:8 }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:12, marginBottom:8 }}>
                    <Text style={{ fontSize:22 }}>{g.emoji}</Text>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:14, fontWeight:'600', color:Colors.text1 }}>{g.name}</Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleGoalFav(g.id)}>
                      <Text style={{ fontSize:16 }}>⭐</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ height:6, backgroundColor:'rgba(255,255,255,0.07)',
                    borderRadius:3, overflow:'hidden' }}>
                    <View style={{ height:'100%', width:pct+'%',
                      backgroundColor:Colors.teal, borderRadius:3 }} />
                  </View>
                  <Text style={{ fontSize:12, color:Colors.teal, marginTop:5, fontWeight:'600' }}>
                    {g.current.toLocaleString()} / {g.target.toLocaleString()} {g.unit} · {pct}%
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
