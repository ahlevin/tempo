import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useStore } from '../../store/useStore';
import { MemoryCard } from '../../components/MemoryCard';
import { SectionHeader, EmptyPrompt, ScreenTitle } from '../../components/SectionUI';
import { StatCard, StatRow, SearchBar } from '../../components/ListControls';
import { isCollectionLog, logCount } from '../../utils/lifelog';
import { getPreset } from '../../constants/lifelogs';

// The Life Log tab — ONLY life logs (memory type 'lifelog'), count + collection,
// with their collapsible cards. Creation routes to add-memory preselected to
// Life Log. Header shows headline metrics; a search box filters the list.
export default function LifeLogScreen() {
  const { colors } = useTheme();
  const memories = useStore(s => s.memories);
  const logs = memories.filter(m => m.type === 'lifelog');
  const add = () => router.push({ pathname: '/modals/add-memory', params: { type: 'lifelog' } });

  const collections = logs.filter(isCollectionLog).length;
  const counts = logs.length - collections;
  const totalLogged = logs.reduce((n, m) => n + logCount(m), 0);

  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  // Match on the log name OR its preset/group name (so "baseball" finds a
  // ballparks log). Filters the LIST only — not entries within a log.
  const shown = query
    ? logs.filter(m =>
        m.name.toLowerCase().includes(query) ||
        (getPreset(m.logPreset)?.name.toLowerCase().includes(query) ?? false))
    : logs;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.bg }} edges={['top']}>
      <ScreenTitle title="Life Log" />
      <ScrollView contentContainerStyle={{ paddingHorizontal:16, paddingBottom:120 }}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {logs.length === 0 ? (
          <>
            <SectionHeader title="Life Log" onAdd={add} />
            <EmptyPrompt icon="📓"
              text="No life logs yet — track counts (hikes, concerts) or collections (countries, parks) you're working through."
              onPress={add} />
          </>
        ) : (
          <>
            <StatRow>
              <StatCard value={logs.length} label={logs.length === 1 ? 'Log' : 'Logs'}
                sub={`${collections} collections · ${counts} counts`} />
              <StatCard value={totalLogged} label="Logged" />
            </StatRow>
            <SearchBar value={q} onChange={setQ} placeholder="Search logs…" />
            <SectionHeader title="Your logs" onAdd={add} />
            {shown.length === 0
              ? <Text style={{ color:colors.text3, fontSize:14, textAlign:'center', paddingVertical:24 }}>
                  No logs match “{q.trim()}”.
                </Text>
              : shown.map(m => <MemoryCard key={m.id} memory={m} />)}
          </>
        )}
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
