import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useIsFocused } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useStore } from '../../store/useStore';
import { ScreenTitle, EmptyPrompt } from '../../components/SectionUI';
import { rpcStandings } from '../../lib/db';
import { Goal, Standing } from '../../store/types';
import { challengeGoals, myStanding, myRank, ordinalRank, challengeLeader } from '../../utils/challenge';
import { formatValue } from '../../utils/values';

// The CHALLENGES tab — a filtered view of SHARED goals (those with a join_code,
// owned or joined). Solo goals stay in the Goals tab and never appear here.
export default function ChallengesScreen() {
  const { colors } = useTheme();
  const goals     = useStore(s => s.goals);
  const profileId = useStore(s => s.profileId);
  const focused   = useIsFocused();

  const challenges = useMemo(() => challengeGoals(goals), [goals]);
  const [standings, setStandings] = useState<Record<string, Standing[]>>({});
  const [loading, setLoading] = useState(true);
  const ids = challenges.map(c => c.id).join(',');

  // Standings are DERIVED server-side (goal_standings) — fetch per challenge, and
  // refetch whenever the tab regains focus (e.g. after logging an attempt).
  useEffect(() => {
    if (!focused) return;
    let alive = true;
    (async () => {
      const list = challenges;
      const entries = await Promise.all(list.map(async c => [c.id, await rpcStandings(c.id)] as const));
      if (alive) { setStandings(Object.fromEntries(entries)); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [ids, focused]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenTitle title="Challenges" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {challenges.length === 0 ? (
          <EmptyPrompt icon="🏆"
            text="No challenges yet — open a goal and tap “Make it a challenge” to invite friends, or join one with a code from your Profile."
            onPress={() => router.push('/tabs/goals')} />
        ) : (
          <>
            {loading && Object.keys(standings).length === 0 && (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}><ActivityIndicator color={colors.accent} /></View>
            )}
            {challenges.map(c => (
              <ChallengeRow key={c.id} goal={c} standings={standings[c.id] ?? []} profileId={profileId} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ChallengeRow({ goal, standings, profileId }: { goal: Goal; standings: Standing[]; profileId: string | null }) {
  const { colors } = useTheme();
  const mine = myStanding(standings, profileId);
  const rank = myRank(standings, profileId);
  const total = standings.length;
  const scoreStr = mine?.score != null ? formatValue(mine.score, goal.unit) : '—';
  const targetStr = mine?.target != null ? formatValue(mine.target, goal.unit) : (goal.targetValue != null ? formatValue(goal.targetValue, goal.unit) : '—');
  // Who's actually winning (rank 1 with an attempt), and whether that's me.
  const leader = challengeLeader(standings);
  const iLead = !!leader && leader.profileId === profileId;
  const leaderScore = leader?.score != null ? formatValue(leader.score, goal.unit) : null;

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => router.push({ pathname: '/modals/challenge-detail', params: { id: goal.id } })}
      style={{ backgroundColor: colors.surf, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10,
        ...(colors.isDark ? null : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.isDark ? 'rgba(62,207,178,0.11)' : colors.tint, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20 }}>{goal.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text1 }} numberOfLines={1}>{goal.name}</Text>
          {/* Participant avatars */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
            {standings.slice(0, 6).map(s => (
              <View key={s.profileId} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center',
                borderWidth: s.profileId === profileId ? 1.5 : 0, borderColor: colors.teal }}>
                <Text style={{ fontSize: 12 }}>{s.avatarEmoji}</Text>
              </View>
            ))}
            {total > 6 && <Text style={{ fontSize: 11, color: colors.text3, marginLeft: 2 }}>+{total - 6}</Text>}
            {total === 0 && <Text style={{ fontSize: 12, color: colors.text3 }}>Just you so far</Text>}
          </View>
          {/* Who's leading — affirming when it's me, "who to beat" when it isn't. */}
          {leader ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              {!iLead && <Text style={{ fontSize: 12 }}>{leader.avatarEmoji}</Text>}
              <Text style={{ fontSize: 12, fontWeight: '700', color: iLead ? colors.teal : colors.text2 }} numberOfLines={1}>
                {iLead ? '🏆 You’re leading' : `${leader.displayName || 'Player'} leading`}{leaderScore ? ` · ${leaderScore}` : ''}
              </Text>
            </View>
          ) : (
            <Text style={{ fontSize: 12, color: colors.text3, marginTop: 4 }}>No attempts yet</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: mine?.reached ? colors.teal : colors.text1, fontVariant: ['tabular-nums'] }}>
            {scoreStr}{mine?.reached ? ' 🏆' : ''}
          </Text>
          <Text style={{ fontSize: 11, color: colors.text3 }}>of {targetStr}</Text>
          {rank > 0 && total > 1 && (
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.teal, marginTop: 2 }}>{ordinalRank(rank)} of {total}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
