import { ScrollView, View, Text, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useStore } from '../../store/useStore';
import { Toggle } from '../../components/FormControls';
import { catColor } from '../../constants/colors';
import { HOLIDAYS, HOLIDAY_GROUPS, holidayNextISO } from '../../constants/holidays';
import { daysUntil } from '../../utils/dates';

export default function HolidaysSettingsModal() {
  const { colors } = useTheme();
  const holidays          = useStore(s => s.prefs.holidays);
  const setHolidaysEnabled = useStore(s => s.setHolidaysEnabled);
  const setHolidayShown    = useStore(s => s.setHolidayShown);

  const accent = catColor(colors, 'holidays');
  const enabled = holidays.enabled;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2 }} edges={['bottom']}>
      <View style={{ width:40, height:4, backgroundColor:colors.border,
        borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
      <View style={{ flexDirection:'row', justifyContent:'space-between',
        alignItems:'center', paddingHorizontal:20, paddingVertical:12 }}>
        <Text style={{ fontSize:18, fontWeight:'700', color:colors.text1 }}>Holidays 🎄</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize:16, color:colors.text3 }}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding:20, paddingBottom:60 }}
        showsVerticalScrollIndicator={false}>
        {/* Global on/off */}
        <Toggle label="Show holidays in countdown" value={enabled} onChange={setHolidaysEnabled} />
        <Text style={{ fontSize:12, color:colors.text3, marginTop:-4, marginBottom:18, marginLeft:2 }}>
          A curated set of US holidays as an optional countdown layer. Show or hide any of them — they’re never stored as events and can’t be deleted.
        </Text>

        {enabled && HOLIDAY_GROUPS.map(group => {
          const groupHolidays = HOLIDAYS.filter(h => h.group === group.id);

          if (group.comingSoon) {
            return (
              <View key={group.id} style={{ marginBottom:18, opacity:0.6 }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:8, marginLeft:2 }}>
                  <Text style={{ fontSize:13, fontWeight:'700', color:colors.text2, textTransform:'uppercase', letterSpacing:0.5 }}>
                    {group.label}
                  </Text>
                  <View style={{ backgroundColor:colors.tile, borderRadius:8, paddingVertical:2, paddingHorizontal:7 }}>
                    <Text style={{ fontSize:9, fontWeight:'700', color:colors.text3, textTransform:'uppercase' }}>Coming soon</Text>
                  </View>
                </View>
              </View>
            );
          }

          if (!groupHolidays.length) return null;
          return (
            <View key={group.id} style={{ marginBottom:20 }}>
              <Text style={{ fontSize:13, fontWeight:'700', color:accent, textTransform:'uppercase',
                letterSpacing:0.5, marginBottom:8, marginLeft:2 }}>
                {group.label}
              </Text>
              <View style={{ backgroundColor:colors.surf, borderRadius:16, borderWidth:1, borderColor:colors.border, overflow:'hidden' }}>
                {groupHolidays.map((h, i) => {
                  const shown = !!holidays.shown?.[h.id];
                  const days  = daysUntil(holidayNextISO(h));
                  return (
                    <View key={h.id}
                      style={{ flexDirection:'row', alignItems:'center', gap:12, padding:14,
                        borderTopWidth: i === 0 ? 0 : 1, borderTopColor:colors.border }}>
                      <Text style={{ fontSize:22 }}>{h.emoji}</Text>
                      <View style={{ flex:1 }}>
                        <Text style={{ fontSize:14, fontWeight:'600', color:colors.text1 }} numberOfLines={1}>{h.name}</Text>
                        <Text style={{ fontSize:11, color:colors.text3, marginTop:1 }}>{days} days away</Text>
                      </View>
                      <TouchableOpacity onPress={() => setHolidayShown(h.id, !shown)}
                        style={{ borderRadius:20, borderWidth:1, paddingVertical:6, paddingHorizontal:14,
                          borderColor: shown ? accent : colors.border,
                          backgroundColor: shown ? (colors.isDark ? colors.glass : accent) : (colors.isDark ? colors.glass : colors.surf) }}>
                        <Text style={{ fontSize:12, fontWeight:'700',
                          color: shown ? (colors.isDark ? accent : '#FFFFFF') : colors.text2 }}>
                          {shown ? 'Shown' : 'Hidden'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
