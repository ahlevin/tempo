import { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useToast } from '../../components/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/colors';
import { MEM_EMOJIS } from '../../constants/data';
import { useStore } from '../../store/useStore';
import { DateTimeField } from '../../components/DateTimeField';
import { useConfirm } from '../../components/ConfirmDialog';

export default function EditMemoryModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const memories     = useStore(s => s.memories);
  const updateMemory = useStore(s => s.updateMemory);
  const deleteMemory = useStore(s => s.deleteMemory);
  const confirm      = useConfirm();
  const { showToast } = useToast();
  const m = memories.find(x => x.id === id);

  const [name,  setName]  = useState(m?.name       || '');
  const [date,  setDate]  = useState(m?.originDate  || '');
  const [emoji, setEmoji] = useState(m?.emoji       || '⭐');
  const [note,  setNote]  = useState(m?.note        || '');

  const fi = { backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1,
    borderColor:'rgba(255,255,255,0.1)', borderRadius:12, padding:12,
    color:Colors.text1, fontSize:15, marginBottom:14 };

  const DATE_LABELS: Record<string,string> = {
    birthday:'Date of Birth', anniversary:'Anniversary Date',
    lifelog:'First Occurrence', milestone:'Date of Milestone'
  };

  if (!m) { router.back(); return null; }

  function save() {
    if (!name.trim()||!date) { showToast('⚠️', 'Missing info', 'Please fill in all fields.'); return; }
    updateMemory(id, { name:name.trim(), originDate:date, emoji, note:note.trim() });
    router.back();
  }

  async function del() {
    const ok = await confirm({ title:`Delete "${m!.name}"?`, message:'All entries will be lost.', confirmLabel:'Delete', destructive:true });
    if (ok) { deleteMemory(id); router.back(); }
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#18182A' }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ width:40, height:4, backgroundColor:'rgba(255,255,255,0.14)',
          borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between',
          alignItems:'center', paddingHorizontal:20, paddingVertical:12 }}>
          <Text style={{ fontSize:18, fontWeight:'700', color:Colors.text1 }}>Edit Memory</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize:16, color:Colors.text3 }}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding:20 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <FL label="Name" />
          <TextInput value={name} onChangeText={setName} placeholderTextColor={Colors.text3} style={fi} />
          <DateTimeField mode="date" label={DATE_LABELS[m.type]||'Date'} value={date} onChange={setDate} />
          <FL label="Icon" />
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:14 }}>
            {MEM_EMOJIS.map(em => (
              <TouchableOpacity key={em} onPress={() => setEmoji(em)}
                style={{ width:44, height:44, borderRadius:10, borderWidth:2,
                  borderColor: em===emoji ? Colors.rose : 'transparent',
                  backgroundColor: em===emoji ? 'rgba(232,80,122,0.15)' : 'rgba(255,255,255,0.055)',
                  alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:20 }}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <FL label="Note (optional)" />
          <TextInput value={note} onChangeText={setNote} placeholderTextColor={Colors.text3} style={fi} />
          <TouchableOpacity onPress={save}
            style={{ backgroundColor:Colors.rose, borderRadius:14, padding:15, alignItems:'center', marginBottom:12 }}>
            <Text style={{ color:'#fff', fontSize:15, fontWeight:'700' }}>Save Changes →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={del}
            style={{ backgroundColor:'rgba(232,80,122,0.15)', borderWidth:1,
              borderColor:'rgba(232,80,122,0.3)', borderRadius:14, padding:15, alignItems:'center' }}>
            <Text style={{ color:Colors.rose, fontSize:15, fontWeight:'700' }}>Delete Memory</Text>
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
