import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useToast } from '../../components/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useStore } from '../../store/useStore';

export default function ExactEditModal() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goals           = useStore(s => s.goals);
  const setGoalProgress = useStore(s => s.setGoalProgress);
  const { showToast } = useToast();
  const g = goals.find(x => x.id === id);
  const [value, setValue] = useState(String(g?.current || 0));

  useEffect(() => { if (!g) router.back(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!g) return null;

  function submit() {
    const v = parseFloat(value);
    if (isNaN(v)||v<0) { showToast('⚠️', 'Missing info', 'Please enter a valid number.'); return; }
    setGoalProgress(id, v);
    router.back();
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2, justifyContent:'flex-end' }} edges={['bottom']}>
      <View style={{ padding:24, paddingBottom:40 }}>
        <View style={{ width:40, height:4, backgroundColor:colors.border,
          borderRadius:2, alignSelf:'center', marginBottom:24 }} />
        <View style={{ alignItems:'center', marginBottom:24 }}>
          <Text style={{ fontSize:26, fontWeight:'800', color:colors.teal, marginBottom:4 }}>
            {g.emoji} {g.name}
          </Text>
          <Text style={{ fontSize:14, color:colors.text3 }}>
            Current: {g.current.toLocaleString()} / {g.target.toLocaleString()} {g.unit}
          </Text>
        </View>
        <TextInput value={value} onChangeText={setValue} keyboardType="numeric" autoFocus
          style={{ fontSize:36, fontWeight:'800', textAlign:'center',
            backgroundColor: colors.isDark ? 'rgba(62,207,178,0.08)' : colors.tint, borderWidth:2,
            borderColor: colors.isDark ? 'rgba(62,207,178,0.3)' : colors.accent, borderRadius:14,
            padding:16, color:colors.teal, marginBottom:16 }} />
        <TouchableOpacity onPress={submit}
          style={{ backgroundColor:colors.teal, borderRadius:14, padding:15, alignItems:'center' }}>
          <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontSize:16, fontWeight:'800' }}>Save Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop:12, alignItems:'center' }}>
          <Text style={{ color:colors.text3, fontSize:14 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
