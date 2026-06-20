import { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/colors';
import { EMOJIS, CATEGORIES } from '../../constants/data';
import { useStore } from '../../store/useStore';

export default function EditEventModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const events      = useStore(s => s.events);
  const updateEvent = useStore(s => s.updateEvent);
  const deleteEvent = useStore(s => s.deleteEvent);
  const event = events.find(e => e.id === id);

  const [name,  setName]  = useState(event?.name  || '');
  const [date,  setDate]  = useState(event?.date  || '');
  const [emoji, setEmoji] = useState(event?.emoji || '🎉');
  const [cat,   setCat]   = useState(event?.cat   || 'celebration');

  const fi = { backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1,
    borderColor:'rgba(255,255,255,0.1)', borderRadius:12, padding:12,
    color:Colors.text1, fontSize:15, marginBottom:14 };

  if (!event) { router.back(); return null; }

  function save() {
    if (!name.trim()||!date) { Alert.alert('Please fill in all fields.'); return; }
    updateEvent(id, { name:name.trim(), date, emoji, cat:cat as any });
    router.back();
  }

  function del() {
    Alert.alert('Delete "'+event!.name+'"?','This cannot be undone.',[
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress:() => { deleteEvent(id); router.back(); } },
    ]);
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#18182A' }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ width:40, height:4, backgroundColor:'rgba(255,255,255,0.14)',
          borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between',
          alignItems:'center', paddingHorizontal:20, paddingVertical:12 }}>
          <Text style={{ fontSize:18, fontWeight:'700', color:Colors.text1 }}>Edit Event</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize:16, color:Colors.text3 }}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding:20 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <FL label="Event Name" />
          <TextInput value={name} onChangeText={setName} placeholderTextColor={Colors.text3} style={fi} />
          <FL label="Date (YYYY-MM-DD)" />
          <TextInput value={date} onChangeText={setDate}
            keyboardType="numbers-and-punctuation" placeholderTextColor={Colors.text3} style={fi} />
          <FL label="Icon" />
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:14 }}>
            {EMOJIS.map(em => (
              <TouchableOpacity key={em} onPress={() => setEmoji(em)}
                style={{ width:44, height:44, borderRadius:10, borderWidth:2,
                  borderColor: em===emoji ? Colors.accent : 'transparent',
                  backgroundColor: em===emoji ? 'rgba(124,106,245,0.15)' : 'rgba(255,255,255,0.055)',
                  alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:20 }}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <FL label="Category" />
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:7, marginBottom:20 }}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c.id} onPress={() => setCat(c.id)}
                style={{ paddingVertical:9, paddingHorizontal:12, borderRadius:11, borderWidth:1,
                  borderColor: cat===c.id ? Colors.accent : Colors.border,
                  backgroundColor: cat===c.id ? 'rgba(124,106,245,0.12)' : Colors.glass }}>
                <Text style={{ fontSize:13, fontWeight:'600',
                  color: cat===c.id ? Colors.accent : Colors.text2 }}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={save}
            style={{ backgroundColor:Colors.accent, borderRadius:14, padding:15, alignItems:'center', marginBottom:12 }}>
            <Text style={{ color:'#fff', fontSize:15, fontWeight:'700' }}>Save Changes →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={del}
            style={{ backgroundColor:'rgba(232,80,122,0.15)', borderWidth:1,
              borderColor:'rgba(232,80,122,0.3)', borderRadius:14, padding:15, alignItems:'center' }}>
            <Text style={{ color:Colors.rose, fontSize:15, fontWeight:'700' }}>Delete Event</Text>
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
