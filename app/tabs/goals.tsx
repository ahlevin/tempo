import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useStore } from '../../store/useStore';
import { GoalCard } from '../../components/GoalCard';
import { isTopLevelGoal } from '../../utils/goals';
import { SectionHeader, EmptyPrompt, ScreenTitle } from '../../components/SectionUI';
import { SearchBar } from '../../components/ListControls';

// The Goals tab — ONLY goals, moved out of the Countdowns screen. Header shows
// headline metrics; a search box filters the list by name.
export default function GoalsScreen() {
  const { colors } = useTheme();
  const allGoals = useStore(s => s.goals);
  const goals = allGoals.filter(isTopLevelGoal);   // quest children live inside their parent, not here
  const add = () => router.push('/modals/add-goal');

  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const shown = query ? goals.filter(g => g.name.toLowerCase().includes(query)) : goals;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.bg }} edges={['top']}>
      <ScreenTitle title="Goals" />
      <ScrollView contentContainerStyle={{ paddingHorizontal:16, paddingBottom:120 }}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {goals.length === 0 ? (
          <>
            <SectionHeader title="Goals" onAdd={add} />
            <EmptyPrompt icon="🎯" text="No goals yet — tap to set something you're working toward."
              onPress={add} />
          </>
        ) : (
          <>
            <SearchBar value={q} onChange={setQ} placeholder="Search goals…" />
            <SectionHeader title="Your goals" onAdd={add} />
            {shown.length === 0
              ? <Text style={{ color:colors.text3, fontSize:14, textAlign:'center', paddingVertical:24 }}>
                  No goals match “{q.trim()}”.
                </Text>
              : shown.map(g => <GoalCard key={g.id} goal={g} />)}
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
