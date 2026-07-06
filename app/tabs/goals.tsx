import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useStore } from '../../store/useStore';
import { GoalCard } from '../../components/GoalCard';
import { SectionHeader, EmptyPrompt, ScreenTitle } from '../../components/SectionUI';

// The Goals tab — ONLY goals, moved out of the Countdowns screen.
export default function GoalsScreen() {
  const { colors } = useTheme();
  const goals = useStore(s => s.goals);
  const add = () => router.push('/modals/add-goal');

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.bg }} edges={['top']}>
      <ScreenTitle title="Goals" />
      <ScrollView contentContainerStyle={{ paddingHorizontal:16, paddingBottom:120 }}
        showsVerticalScrollIndicator={false}>
        <SectionHeader title={goals.length ? 'Your goals' : 'Goals'} onAdd={add} />
        {goals.length === 0
          ? <EmptyPrompt icon="🎯" text="No goals yet — tap to set something you're working toward."
              onPress={add} />
          : goals.map(g => <GoalCard key={g.id} goal={g} />)}
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
