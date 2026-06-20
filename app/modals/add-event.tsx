import { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format, addDays } from 'date-fns';
import { Colors } from '../../constants/colors';
import { EMOJIS, CATEGORIES } from '../../constants/data';
import { useStore } from '../../store/useStore';

export default function AddEventModal() {
  const addEvent = useStore(s => s.addEvent);
  const [name,    setName]    = useState('');
  const [date,    setDate]    = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [emoji,   setEmoji]   = useState('🎉');
  const [cat,     setCat]     = useState('celebration');
  const [recurOn, setRecurOn] = useState(false);
  const [freq,    setFreq]    = useState('weekly');
  const [dow,     setDow]     = useState([1]);
  const [alertOn, setAlertOn] = useState(false);
  const [alerts,  setAlerts]  = useState([{ value: '1', unit: 'days' }]);

  const DOW = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const UNITS = ['minutes','hours','days','weeks','months'];

  function toggleDow(i: number) {
    setDow(prev => prev.includes(i)
      ? prev.length > 1 ? prev.filter(d => d !== i) : prev
      : [...prev, i].sort());
  }

  function submit() {
    if (!name.trim() || !date) { Alert.alert('Please enter a name and date.'); return; }
    addEvent({
      name: name.trim(), emoji, cat: cat as any, date, fav: true,
      recur: recurOn ? { freq: freq as any, dow: freq === 'weekly' ? dow : [], endType: 'never' } : null,
      alerts: alertOn ? alerts.map(a => ({ value: parseInt(a.value) || 1, unit: a.unit as any })) : [],
    });
    router.back();
  }

  const fi = { backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1,
    borderColor:'rgba(255,255,255,0.1)', borderRadius:12, padding:12,
    color:Colors.text1, fontSize:15, marginBottom:14 };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#18182A' }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ width:40, height:4, backgroundColor:'rgba(255,255,255,0.14)',
          borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between',
          alignItems:'center', paddingHorizontal:20, paddingVertical:12 }}>
          <Text style={{ fontSize:18, fontWeight:'700', color:Colors.text1 }}>New Countdown</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize:16, color:Colors.text3 }}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding:20 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <FL label="Event Name" />
          <TextInput value={name} onChangeText={setName}
            placeholder="e.g. Summer vacation…" placeholderTextColor={Colors.text3} style={fi} />

          <FL label="Date (YYYY-MM-DD)" />
          <TextInput value={date} onChangeText={setDate}
            placeholder="YYYY-MM-DD" placeholderTextColor={Colors.text3}
            keyboardType="numbers-and-punctuation" style={fi} />

          <FL label="Icon" />
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:14 }}>
            {EMOJIS.map(em => (
              <TouchableOpacity key={em} onPress={() => setEmoji(em)}
                style={{ width:44, height:44, borderRadius:10, borderWidth:2,
                  borderColor: em === emoji ? Colors.accent : 'transparent',
                  backgroundColor: em === emoji ? 'rgba(124,106,245,0.15)' : 'rgba(255,255,255,0.055)',
                  alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:20 }}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <FL label="Category" />
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:7, marginBottom:14 }}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c.id} onPress={() => setCat(c.id)}
                style={{ paddingVertical:9, paddingHorizontal:12, borderRadius:11, borderWidth:1,
                  borderColor: cat === c.id ? Colors.accent : Colors.border,
                  backgroundColor: cat === c.id ? 'rgba(124,106,245,0.12)' : Colors.glass }}>
                <Text style={{ fontSize:13, fontWeight:'600',
                  color: cat === c.id ? Colors.accent : Colors.text2 }}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Toggle label="🔁 Repeating Event" value={recurOn} onChange={setRecurOn} />
          {recurOn && (
            <View style={{ marginBottom:14 }}>
              <FL label="Repeat" />
              <View style={{ flexDirection:'row', gap:6, marginBottom:10 }}>
                {['daily','weekly','monthly','yearly'].map(f => (
                  <TouchableOpacity key={f} onPress={() => setFreq(f)}
                    style={{ flex:1, padding:8, borderRadius:9, borderWidth:1.5, alignItems:'center',
                      borderColor: freq===f ? Colors.accent : Colors.border,
                      backgroundColor: freq===f ? 'rgba(124,106,245,0.15)' : Colors.glass }}>
                    <Text style={{ fontSize:11, fontWeight:'600',
                      color: freq===f ? Colors.accent : Colors.text2 }}>
                      {f.charAt(0).toUpperCase()+f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {freq === 'weekly' && (
                <View>
                  <FL label="On days" />
                  <View style={{ flexDirection:'row', gap:4, marginBottom:10 }}>
                    {DOW.map((d,i) => (
                      <TouchableOpacity key={i} onPress={() => toggleDow(i)}
                        style={{ flex:1, aspectRatio:1, borderRadius:7, borderWidth:1.5,
                          alignItems:'center', justifyContent:'center',
                          borderColor: dow.includes(i) ? Colors.accent : Colors.border,
                          backgroundColor: dow.includes(i) ? 'rgba(124,106,245,0.15)' : Colors.glass }}>
                        <Text style={{ fontSize:10, fontWeight:'700',
                          color: dow.includes(i) ? Colors.accent : Colors.text3 }}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          <Toggle label="🔔 Alerts & Reminders" value={alertOn} onChange={setAlertOn} />
          {alertOn && (
            <View style={{ marginBottom:14 }}>
              {alerts.map((a,i) => (
                <View key={i} style={{ flexDirection:'row', alignItems:'center', gap:7,
                  backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1,
                  borderColor:'rgba(255,255,255,0.07)', borderRadius:10,
                  padding:9, marginBottom:7 }}>
                  <Text>🔔</Text>
                  <TextInput value={a.value}
                    onChangeText={v => setAlerts(prev => prev.map((x,j) => j===i?{...x,value:v}:x))}
                    keyboardType="number-pad"
                    style={{ width:48, backgroundColor:'rgba(255,255,255,0.07)',
                      borderRadius:7, padding:5, color:Colors.text1, fontSize:13,
                      fontWeight:'700', textAlign:'center', borderWidth:1,
                      borderColor:'rgba(255,255,255,0.12)' }} />
                  <View style={{ flex:1 }}>
                    {UNITS.map(u => (
                      <TouchableOpacity key={u}
                        onPress={() => setAlerts(prev => prev.map((x,j) => j===i?{...x,unit:u}:x))}
                        style={{ padding:5, borderRadius:6,
                          backgroundColor: a.unit===u ? 'rgba(124,106,245,0.2)' : 'transparent' }}>
                        <Text style={{ fontSize:12,
                          color: a.unit===u ? Colors.accent : Colors.text2 }}>{u} before</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={() => setAlerts(prev => prev.filter((_,j) => j!==i))}
                    style={{ width:24, height:24, borderRadius:12,
                      backgroundColor:'rgba(232,80,122,0.12)',
                      alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ color:Colors.rose, fontSize:13 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                onPress={() => setAlerts(prev => [...prev, { value:'1', unit:'hours' }])}
                style={{ padding:8, borderRadius:9, borderWidth:1.5,
                  borderColor:'rgba(124,106,245,0.3)', borderStyle:'dashed', alignItems:'center' }}>
                <Text style={{ fontSize:12, fontWeight:'600', color:Colors.accent }}>+ Add Alert</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={submit}
            style={{ backgroundColor:Colors.accent, borderRadius:14,
              padding:15, alignItems:'center', marginTop:8 }}>
            <Text style={{ color:'#fff', fontSize:15, fontWeight:'700' }}>Add Countdown →</Text>
          </TouchableOpacity>
          <View style={{ height:40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FL({ label }: { label: string }) {
  return <Text style={{ fontSize:11, fontWeight:'600', color:Colors.text3,
    textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>{label}</Text>;
}

function Toggle({ label, value, onChange }: { label:string; value:boolean; onChange:(v:boolean)=>void }) {
  return (
    <TouchableOpacity onPress={() => onChange(!value)}
      style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between',
        backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1,
        borderColor:'rgba(255,255,255,0.08)', borderRadius:11, padding:12, marginBottom:12 }}>
      <Text style={{ fontSize:14, fontWeight:'600', color:Colors.text1 }}>{label}</Text>
      <View style={{ width:40, height:22, borderRadius:11,
        backgroundColor: value ? Colors.accent : 'rgba(255,255,255,0.1)',
        justifyContent:'center', paddingHorizontal:2 }}>
        <View style={{ width:18, height:18, borderRadius:9, backgroundColor:'#fff',
          alignSelf: value ? 'flex-end' : 'flex-start' }} />
      </View>
    </TouchableOpacity>
  );
}
