import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useStore } from '../../store/useStore';
import { MemoryCard } from '../../components/MemoryCard';
import { SectionHeader, EmptyPrompt, ScreenTitle } from '../../components/SectionUI';

// The Life Log tab — ONLY life logs (memory type 'lifelog'), count + collection,
// with their collapsible cards. Creation routes to add-memory preselected to
// Life Log.
export default function LifeLogScreen() {
  const { colors } = useTheme();
  const memories = useStore(s => s.memories);
  const logs = memories.filter(m => m.type === 'lifelog');
  const add = () => router.push({ pathname: '/modals/add-memory', params: { type: 'lifelog' } });

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.bg }} edges={['top']}>
      <ScreenTitle title="Life Log" />
      <ScrollView contentContainerStyle={{ paddingHorizontal:16, paddingBottom:120 }}
        showsVerticalScrollIndicator={false}>
        <SectionHeader title={logs.length ? 'Your logs' : 'Life Log'} onAdd={add} />
        {logs.length === 0
          ? <EmptyPrompt icon="📓"
              text="No life logs yet — track counts (hikes, concerts) or collections (countries, parks) you're working through."
              onPress={add} />
          : logs.map(m => <MemoryCard key={m.id} memory={m} />)}
      </ScrollView>

      <TouchableOpacity onPress={add}
        style={{ position:'absolute', bottom:90, right:20, width:54, height:54,
          borderRadius:27, backgroundColor: colors.isDark ? colors.accent : colors.rose,
          alignItems:'center', justifyContent:'center',
          shadowColor: colors.isDark ? colors.accent : colors.rose, shadowOffset:{width:0,height:8},
          shadowOpacity:0.45, shadowRadius:16, elevation:8 }}>
        <Text style={{ fontSize:28, color:'#fff', lineHeight:32 }}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
