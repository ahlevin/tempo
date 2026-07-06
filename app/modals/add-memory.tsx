import { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useToast } from '../../components/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { format, subDays } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { MEM_EMOJIS, MEMORY_TYPES } from '../../constants/data';
import { useStore } from '../../store/useStore';
import { Alert as AlertType } from '../../store/types';
import { DateTimeField } from '../../components/DateTimeField';
import { AlertsEditor } from '../../components/AlertsEditor';

const DATE_LABELS: Record<string,string> = {
  birthday:'Date of Birth', anniversary:'Anniversary Date',
  lifelog:'First Occurrence'
};
const DEF_EMOJIS: Record<string,string> = {
  birthday:'🎂', anniversary:'💑', lifelog:'🏔️'
};
const MEM_TYPE_IDS = ['birthday', 'anniversary', 'lifelog'];

export default function AddMemoryModal() {
  const { colors } = useTheme();
  const addMemory = useStore(s => s.addMemory);
  const { showToast } = useToast();
  // Preselect the type when the add-chooser routes here with ?type=birthday etc.
  const { type: typeParam } = useLocalSearchParams<{ type?: string }>();
  const initialType = typeParam && MEM_TYPE_IDS.includes(typeParam) ? typeParam : 'birthday';
  const [type,  setType]  = useState(initialType);
  const [name,  setName]  = useState('');
  const [date,  setDate]  = useState(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
  const [emoji, setEmoji] = useState(DEF_EMOJIS[initialType] || '⭐');
  const [note,  setNote]  = useState('');
  const [alerts, setAlerts] = useState<AlertType[]>([]);

  const fi = { backgroundColor:colors.glass, borderWidth:1,
    borderColor:colors.border, borderRadius:12, padding:12,
    color:colors.text1, fontSize:15, marginBottom:14 };

  function pickType(t: string) { setType(t); setEmoji(DEF_EMOJIS[t]||'⭐'); }

  function submit() {
    if (!name.trim()||!date) { showToast('⚠️', 'Missing info', 'Please enter a name and date.'); return; }
    addMemory({
      type:type as any, name:name.trim(), emoji, originDate:date,
      entries: type==='lifelog' ? [{date,note:note.trim()}] : [],
      note: type!=='lifelog' ? note.trim() : '',
      // Reminders only apply to the recurring types (birthday/anniversary).
      fav: false, alerts: type==='lifelog' ? [] : alerts,
    });
    router.back();
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2 }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ width:40, height:4, backgroundColor:colors.border,
          borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between',
          alignItems:'center', paddingHorizontal:20, paddingVertical:12 }}>
          <Text style={{ fontSize:18, fontWeight:'700', color:colors.text1 }}>New Memory 🕰️</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize:16, color:colors.text3 }}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding:20 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <FL label="Type" />
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:7, marginBottom:14 }}>
            {MEMORY_TYPES.map(t => (
              <TouchableOpacity key={t.id} onPress={() => pickType(t.id)}
                style={{ flexDirection:'row', alignItems:'center', gap:7,
                  paddingVertical:10, paddingHorizontal:12, borderRadius:11, borderWidth:1.5,
                  borderColor: type===t.id ? colors.accent : colors.border,
                  backgroundColor: type===t.id ? (colors.isDark ? 'rgba(124,106,245,0.1)' : colors.tint) : colors.glass }}>
                <Text style={{ fontSize:18 }}>{t.icon}</Text>
                <View>
                  <Text style={{ fontSize:12, fontWeight:'600',
                    color: type===t.id ? colors.accent : colors.text2 }}>{t.label}</Text>
                  <Text style={{ fontSize:10, color:colors.text3 }}>{t.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <FL label="Name" />
          <TextInput value={name} onChangeText={setName}
            placeholder="e.g. First Half Dome Hike…" placeholderTextColor={colors.text3} style={fi} />
          <DateTimeField mode="date" label={DATE_LABELS[type]||'Date'} value={date} onChange={setDate} />
          <FL label="Icon" />
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:14 }}>
            {MEM_EMOJIS.map(em => (
              <TouchableOpacity key={em} onPress={() => setEmoji(em)}
                style={{ width:44, height:44, borderRadius:10, borderWidth:2,
                  borderColor: em===emoji ? colors.rose : 'transparent',
                  backgroundColor: em===emoji ? (colors.isDark ? 'rgba(232,80,122,0.15)' : colors.tint) : colors.glass,
                  alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:20 }}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <FL label="Note (optional)" />
          <TextInput value={note} onChangeText={setNote}
            placeholder="Add a note…" placeholderTextColor={colors.text3} style={fi} />
          {(type === 'birthday' || type === 'anniversary') && (
            <AlertsEditor value={alerts} onChange={setAlerts} />
          )}
          <TouchableOpacity onPress={submit}
            style={{ backgroundColor:colors.rose, borderRadius:14, padding:15, alignItems:'center' }}>
            <Text style={{ color:'#fff', fontSize:15, fontWeight:'700' }}>Save Memory →</Text>
          </TouchableOpacity>
          <View style={{ height:40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FL({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize:11, fontWeight:'600', color:colors.text3,
    textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>{label}</Text>;
}
