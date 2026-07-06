import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { useStore } from '../../store/useStore';
import { DateTimeField } from '../../components/DateTimeField';

export default function LogEntryModal() {
  const { colors } = useTheme();
  const { id, past } = useLocalSearchParams<{ id: string; past: string }>();
  const memories    = useStore(s => s.memories);
  const addLogEntry = useStore(s => s.addLogEntry);
  const m = memories.find(x => x.id === id);

  const [usePast, setUsePast] = useState(past === '1');
  const [date,    setDate]    = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note,    setNote]    = useState('');

  const fi = { backgroundColor:colors.glass, borderWidth:1,
    borderColor:colors.border, borderRadius:12, padding:12,
    color:colors.text1, fontSize:15, marginBottom:14 };

  if (!m) { router.back(); return null; }

  function submit() {
    const entryDate = usePast ? date : format(new Date(), 'yyyy-MM-dd');
    addLogEntry(id, { date:entryDate, note:note.trim() });
    router.back();
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2 }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ width:40, height:4, backgroundColor:colors.border,
          borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between',
          alignItems:'center', paddingHorizontal:20, paddingVertical:12 }}>
          <Text style={{ fontSize:18, fontWeight:'700', color:colors.text1 }}>
            Log: {m.emoji} {m.name}
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize:16, color:colors.text3 }}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding:20 }}>
          <Text style={{ fontSize:11, fontWeight:'600', color:colors.text3,
            textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Date</Text>
          <View style={{ flexDirection:'row', gap:8, marginBottom:14 }}>
            {[{l:'Today',v:false},{l:'Past date',v:true}].map(opt => (
              <TouchableOpacity key={String(opt.v)} onPress={() => setUsePast(opt.v)}
                style={{ flex:1, padding:10, borderRadius:9, borderWidth:1.5,
                  borderColor: usePast===opt.v ? colors.rose : colors.border,
                  backgroundColor: usePast===opt.v ? (colors.isDark ? 'rgba(232,80,122,0.1)' : colors.tint) : colors.glass,
                  alignItems:'center' }}>
                <Text style={{ fontSize:13, fontWeight:'600',
                  color: usePast===opt.v ? colors.rose : colors.text2 }}>{opt.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {usePast && (
            <DateTimeField mode="date" value={date} onChange={setDate} />
          )}
          <Text style={{ fontSize:11, fontWeight:'600', color:colors.text3,
            textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>
            Note (optional)
          </Text>
          <TextInput value={note} onChangeText={setNote}
            placeholder="How was it?…" placeholderTextColor={colors.text3} style={fi} />
          <TouchableOpacity onPress={submit}
            style={{ backgroundColor:colors.teal, borderRadius:14, padding:15, alignItems:'center' }}>
            <Text style={{ color:'#0A0A0F', fontSize:15, fontWeight:'700' }}>Log It →</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
