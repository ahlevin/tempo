import { ScrollView, View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useStore } from '../../store/useStore';
import { Alert as AlertType } from '../../store/types';
import { AlertsEditor } from '../../components/AlertsEditor';
import { Toggle } from '../../components/FormControls';
import { catColor, catBg } from '../../constants/colors';
import { HOLIDAY_BY_ID, holidayNextISO } from '../../constants/holidays';
import { daysUntil } from '../../utils/dates';

export default function HolidayDetailModal() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const holidays          = useStore(s => s.prefs.holidays);
  const setHolidayShown   = useStore(s => s.setHolidayShown);
  const setHolidayFav     = useStore(s => s.setHolidayFav);
  const setHolidayReminder = useStore(s => s.setHolidayReminder);

  const h = id ? HOLIDAY_BY_ID[id] : undefined;
  if (!h) { router.back(); return null; }

  const color = catColor(colors, 'holidays');
  const bg    = catBg(colors, 'holidays');
  const iso   = holidayNextISO(h);
  const days  = daysUntil(iso);
  const dateStr = new Date(iso + 'T00:00:00').toLocaleDateString('en-US',
    { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const fav = !!holidays.fav?.[h.id];
  const reminders: AlertType[] = holidays.reminders?.[h.id] ?? [];

  function hide() {
    setHolidayShown(h!.id, false);
    router.back();
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2 }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ width:40, height:4, backgroundColor:colors.border,
          borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between',
          alignItems:'center', paddingHorizontal:20, paddingVertical:12 }}>
          <Text style={{ fontSize:18, fontWeight:'700', color:colors.text1 }}>Holiday</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize:16, color:colors.text3 }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding:20 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Header: emoji + name */}
          <View style={{ flexDirection:'row', alignItems:'center', gap:14, marginBottom:14 }}>
            <View style={{ width:56, height:56, borderRadius:16, backgroundColor:bg, alignItems:'center', justifyContent:'center' }}>
              <Text style={{ fontSize:28 }}>{h.emoji}</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:20, fontWeight:'800', color:colors.text1 }} numberOfLines={2}>{h.name}</Text>
              <Text style={{ fontSize:12, fontWeight:'600', color, marginTop:2 }}>Holiday · Repeats yearly</Text>
            </View>
          </View>

          {/* Next occurrence */}
          <View style={{ backgroundColor:colors.surf, borderRadius:16, borderWidth:1, borderColor:colors.border,
            padding:16, marginBottom:16, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:10, fontWeight:'700', color:colors.text3, textTransform:'uppercase', letterSpacing:0.6 }}>Next</Text>
              <Text style={{ fontSize:14, fontWeight:'600', color:colors.text1, marginTop:3 }}>{dateStr}</Text>
            </View>
            <View style={{ alignItems:'flex-end' }}>
              <Text style={{ fontSize:26, fontWeight:'800', color }}>{days}</Text>
              <Text style={{ fontSize:9, color:colors.text3, textTransform:'uppercase' }}>{days === 1 ? 'day away' : 'days away'}</Text>
            </View>
          </View>

          <Toggle label="⭐ Pin to top (hero)" value={fav} onChange={(v) => setHolidayFav(h.id, v)} />

          <AlertsEditor value={reminders} onChange={(a) => setHolidayReminder(h.id, a)} />

          {/* Hide (NOT delete) — holidays are a layer, not a stored event. */}
          <TouchableOpacity onPress={hide}
            style={{ marginTop:8, backgroundColor:colors.glass, borderWidth:1, borderColor:colors.border,
              borderRadius:14, padding:15, alignItems:'center' }}>
            <Text style={{ color:colors.text1, fontSize:15, fontWeight:'700' }}>Hide from countdown</Text>
          </TouchableOpacity>
          <Text style={{ fontSize:11, color:colors.text3, textAlign:'center', marginTop:8 }}>
            Holidays are never deleted — you can show this again anytime from Profile → Holidays.
          </Text>
          <View style={{ height:40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
