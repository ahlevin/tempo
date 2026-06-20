import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { Colors } from '../../constants/colors';
import { useStore } from '../../store/useStore';

export default function LogEntryModal() {
  const { id, past } = useLocalSearchParams<{ id: string; past: string }>();
  const memories    = useStore(s => s.memories);
  const addLogEntry = useStore(s => s.addLogEntry);
  const m = memories.find(x => x.id === id);

  const [usePast, setUsePast] = useState(past === '1');
  const [date,    setDate]    = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note,    setNote]    = useState('');

  const fi = { backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1,
    borderColor:'rgba(255,255,255,0.1)', borderRadius:12, padding:12,
    color:Colors.text1, fontSize:15, marginBottom:14 };

  if (!m) { router.back(); return null; }

  function submit() {
    const entryDate = usePast ? date : format(new Date(), 'yyyy-MM-dd');
    addLogEntry(id, { date:entryDate, note:note.trim() });
    router.back();
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#18182A' }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ width:40, height:4, backgroundColor:'rgba(255,255,255,0.14)',
          borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between',
          alignItems:'center', paddingHorizontal:20, paddingVertical:12 }}>
          <Text style={{ fontSize:18, fontWeight:'700', color:Colors.text1 }}>
            Log: {m.emoji} {m.name}
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize:16, color:Colors.text3 }}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding:20 }}>
          <Text style={{ fontSize:11, fontWeight:'600', color:Colors.text3,
            textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Date</Text>
          <View style={{ flexDirection:'row', gap:8, marginBottom:14 }}>
            {[{l:'Today',v:false},{l:'Past date',v:true}].map(opt => (
              <TouchableOpacity key={String(opt.v)} onPress={() => setUsePast(opt.v)}
                style={{ flex:1, padding:10, borderRadius:9, borderWidth:1.5,
                  borderColor: usePast===opt.v ? Colors.rose : Colors.border,
                  backgroundColor: usePast===opt.v ? 'rgba(232,80,122,0.1)' : Colors.glass,
                  alignItems:'center' }}>
                <Text style={{ fontSize:13, fontWeight:'600',
                  color: usePast===opt.v ? Colors.rose : Colors.text2 }}>{opt.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {usePast && (
            <TextInput value={date} onChangeText={setDate}
              placeholder="YYYY-MM-DD" placeholderTextColor={Colors.text3}
              keyboardType="numbers-and-punctuation" style={fi} />
          )}
          <Text style={{ fontSize:11, fontWeight:'600', color:Colors.text3,
            textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>
            Note (optional)
          </Text>
          <TextInput value={note} onChangeText={setNote}
            placeholder="How was it?…" placeholderTextColor={Colors.text3} style={fi} />
          <TouchableOpacity onPress={submit}
            style={{ backgroundColor:Colors.teal, borderRadius:14, padding:15, alignItems:'center' }}>
            <Text style={{ color:'#0A0A0F', fontSize:15, fontWeight:'700' }}>Log It →</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
