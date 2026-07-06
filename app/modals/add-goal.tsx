import { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useToast } from '../../components/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format, addDays } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { GOAL_EMOJIS } from '../../constants/data';
import { useStore } from '../../store/useStore';
import { Alert as AlertType } from '../../store/types';
import { DateTimeField } from '../../components/DateTimeField';
import { AlertsEditor } from '../../components/AlertsEditor';

export default function AddGoalModal() {
  const { colors } = useTheme();
  const addGoal = useStore(s => s.addGoal);
  const { showToast } = useToast();
  const [name,   setName]   = useState('');
  const [target, setTarget] = useState('');
  const [unit,   setUnit]   = useState('');
  const [step,   setStep]   = useState('1');
  const [date,   setDate]   = useState(format(addDays(new Date(), 90), 'yyyy-MM-dd'));
  const [emoji,  setEmoji]  = useState('🎯');
  const [alerts, setAlerts] = useState<AlertType[]>([]);

  const fi = { backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1,
    borderColor:'rgba(255,255,255,0.1)', borderRadius:12, padding:12,
    color:colors.text1, fontSize:15, marginBottom:14 };

  function submit() {
    if (!name.trim() || !target || !date) { showToast('⚠️', 'Missing info', 'Please fill in all fields.'); return; }
    addGoal({ name:name.trim(), emoji, target:parseFloat(target),
      unit:unit.trim()||'units', step:parseFloat(step)||1, date, fav:false, alerts });
    router.back();
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2 }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ width:40, height:4, backgroundColor:'rgba(255,255,255,0.14)',
          borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between',
          alignItems:'center', paddingHorizontal:20, paddingVertical:12 }}>
          <Text style={{ fontSize:18, fontWeight:'700', color:colors.text1 }}>New Goal 🎯</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize:16, color:colors.text3 }}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding:20 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <FL label="Goal Name" />
          <TextInput value={name} onChangeText={setName}
            placeholder="e.g. Run 100 miles…" placeholderTextColor={colors.text3} style={fi} />
          <FL label="Target" />
          <TextInput value={target} onChangeText={setTarget}
            placeholder="100" placeholderTextColor={colors.text3}
            keyboardType="numeric" style={fi} />
          <FL label="Unit" />
          <TextInput value={unit} onChangeText={setUnit}
            placeholder="miles, books, $…" placeholderTextColor={colors.text3} style={fi} />
          <FL label="Increment Step" />
          <TextInput value={step} onChangeText={setStep}
            placeholder="1" placeholderTextColor={colors.text3}
            keyboardType="numeric" style={fi} />
          <DateTimeField mode="date" label="Deadline" value={date} onChange={setDate} />
          <FL label="Icon" />
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:20 }}>
            {GOAL_EMOJIS.map(em => (
              <TouchableOpacity key={em} onPress={() => setEmoji(em)}
                style={{ width:44, height:44, borderRadius:10, borderWidth:2,
                  borderColor: em===emoji ? colors.teal : 'transparent',
                  backgroundColor: em===emoji ? 'rgba(62,207,178,0.15)' : 'rgba(255,255,255,0.055)',
                  alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:20 }}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <AlertsEditor value={alerts} onChange={setAlerts} />
          <TouchableOpacity onPress={submit}
            style={{ backgroundColor:colors.teal, borderRadius:14, padding:15, alignItems:'center' }}>
            <Text style={{ color:'#0A0A0F', fontSize:15, fontWeight:'700' }}>Set Goal →</Text>
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
