import { useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useIsFocused } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { CloseButton } from '../../components/CloseButton';
import { useStore } from '../../store/useStore';
import { useToast } from '../../components/Toast';
import { Standing } from '../../store/types';
import { rpcStandings, rpcSetParticipantTarget } from '../../lib/db';
import { attemptsByProfile } from '../../utils/challenge';
import { formatValue, parseValue } from '../../utils/values';
import { fmtShort } from '../../utils/dates';
import { copyToClipboard } from '../../utils/clipboard';

// Challenge detail: leaderboard (goal_standings), per-person attempt timeline
// (goal_attempts), log-an-attempt, and invite/share. Everything is DERIVED from
// the backend — no computed winner is stored.
export default function ChallengeDetailModal() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goals     = useStore(s => s.goals);
  const attempts  = useStore(s => s.goalAttempts);
  const profileId = useStore(s => s.profileId);
  const userId    = useStore(s => s.userId);
  const { showToast } = useToast();
  const focused   = useIsFocused();

  const g = goals.find(x => x.id === id);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTargets, setShowTargets] = useState(false);

  useEffect(() => { if (!g) router.back(); }, [g]);

  // Standings are server-derived — (re)fetch on focus (also after logging).
  useEffect(() => {
    if (!id || !focused) return;
    let alive = true;
    (async () => {
      const rows = await rpcStandings(id);
      if (alive) { setStandings(rows); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [id, focused]);

  if (!g) return null;

  const gid = g.id, gName = g.name, gCode = g.joinCode ?? '';
  const unit = g.unit;
  const isOwner = !!userId && g.ownerUserId === userId;
  const byProfile = attemptsByProfile(attempts, g.id);
  const teal = colors.teal;

  // Timeline participants = the UNION of leaderboard participants (standings, in rank
  // order) and everyone who has a logged attempt locally. goal_attempts is fetched
  // unfiltered so RLS returns co-participants' attempts — so even a rival not present
  // in `standings` (e.g. before the goal_standings definer fix propagates) still shows
  // their attempts here rather than being dropped.
  const timelinePids = [
    ...standings.map(s => s.profileId),
    ...[...byProfile.keys()].filter(pid => !standings.some(s => s.profileId === pid)),
  ];

  const refetch = async () => setStandings(await rpcStandings(gid));

  async function shareCode() {
    if (!gCode) return;
    try { await Share.share({ message: `Join my “${gName}” challenge on sayZay — code ${gCode}` }); } catch { /* dismissed */ }
  }
  async function copyCode() {
    if (!gCode) return;
    const ok = await copyToClipboard(gCode);
    showToast(ok ? '✅' : '⚠️', ok ? 'Code copied' : 'Copy failed', ok ? gCode : 'Select it to copy.');
  }
  async function setTarget(pid: string, text: string) {
    const v = parseValue(text, unit);
    const ok = await rpcSetParticipantTarget(gid, pid, v);
    if (ok) { showToast('✅', 'Target updated', ''); await refetch(); }
    else showToast('⚠️', 'Could not update', 'Only the owner can set targets.');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surf2 }} edges={['bottom']}>
      <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text1, flex: 1, minWidth: 0, marginRight: 12 }} numberOfLines={1}>
          {g.emoji} {g.name}
        </Text>
        <View style={{ flexShrink: 0 }}><CloseButton /></View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Invite */}
        {!!g.joinCode && (
          <View style={{ backgroundColor: colors.surf, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Join code</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <Text style={{ fontSize: 26, fontWeight: '800', color: teal, letterSpacing: 3, flex: 1 }}>{g.joinCode}</Text>
              <TouchableOpacity onPress={copyCode} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: teal }}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={shareCode} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: teal }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.isDark ? '#0A0A0F' : '#fff' }}>Share</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 11, color: colors.text3, marginTop: 8 }}>Anyone with this code can join and compete.</Text>
          </View>
        )}

        {/* Log an attempt (reuses the value-attempt sheet; RLS ga_insert_own) */}
        <TouchableOpacity onPress={() => router.push({ pathname: '/modals/log-attempt', params: { id: g.id } })}
          style={{ backgroundColor: teal, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontWeight: '700', fontSize: 15 }}>＋ Log an attempt</Text>
        </TouchableOpacity>

        {/* Leaderboard */}
        <SectionLabel text={`Leaderboard · ${standings.length}`} />
        {loading && standings.length === 0 ? (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}><ActivityIndicator color={colors.accent} /></View>
        ) : standings.length === 0 ? (
          <Text style={{ fontSize: 13, color: colors.text3, marginBottom: 16 }}>Just you so far — share the code to invite rivals.</Text>
        ) : (
          <View style={{ marginBottom: 16 }}>
            {standings.map((s, i) => {
              const me = s.profileId === profileId;
              return (
                <View key={s.profileId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 12, marginBottom: 6,
                  backgroundColor: me ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.surf,
                  borderWidth: 1, borderColor: me ? teal : colors.border }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text3, width: 22, textAlign: 'center' }}>{i + 1}</Text>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 16 }}>{s.avatarEmoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text1 }} numberOfLines={1}>
                      {s.displayName || 'Player'}{me ? ' (you)' : ''}{s.reached ? ' 🏆' : ''}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.text3 }}>
                      {s.attempts} attempt{s.attempts === 1 ? '' : 's'}{s.target != null ? ` · target ${formatValue(s.target, unit)}` : ''}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: s.reached ? teal : colors.text1, fontVariant: ['tabular-nums'] }}>
                    {s.score != null ? formatValue(s.score, unit) : '—'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Owner-only per-person handicap targets (optional/secondary) */}
        {isOwner && standings.length > 0 && (
          <>
            <TouchableOpacity onPress={() => setShowTargets(o => !o)} style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>
                {showTargets ? '▾ Hide per-person targets' : '⚙︎ Set per-person targets (optional)'}
              </Text>
            </TouchableOpacity>
            {showTargets && standings.map(s => (
              <View key={`t-${s.profileId}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Text style={{ fontSize: 16 }}>{s.avatarEmoji}</Text>
                <Text style={{ flex: 1, fontSize: 13, color: colors.text1 }} numberOfLines={1}>{s.displayName || 'Player'}</Text>
                <TextInput defaultValue={s.target != null ? formatValue(s.target, unit) : ''}
                  onSubmitEditing={e => setTarget(s.profileId, e.nativeEvent.text)} returnKeyType="done"
                  placeholder="target" placeholderTextColor={colors.text3}
                  style={{ width: 110, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 8, color: colors.text1, fontSize: 14, textAlign: 'center' }} />
              </View>
            ))}
          </>
        )}

        {/* Per-person attempt timeline — the emotional core */}
        <SectionLabel text="Attempt timeline" />
        {timelinePids.length === 0 ? (
          <Text style={{ fontSize: 13, color: colors.text3 }}>No attempts logged yet — be the first.</Text>
        ) : (
          timelinePids.map(pid => {
            const s = standings.find(x => x.profileId === pid);
            const rows = byProfile.get(pid) ?? [];
            const me = pid === profileId;
            return (
              <View key={`tl-${pid}`} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Text style={{ fontSize: 15 }}>{s?.avatarEmoji ?? '🙂'}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: me ? teal : colors.text1 }} numberOfLines={1}>
                    {s?.displayName || (me ? 'You' : 'Player')}{me ? ' (you)' : ''}
                  </Text>
                </View>
                {rows.length === 0 ? (
                  <Text style={{ fontSize: 12, color: colors.text3, marginLeft: 23 }}>No attempts yet.</Text>
                ) : (
                  <AttemptChips rows={rows} unit={unit} />
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// One participant's attempt chips (reverse-chron), capped so a player with many
// attempts stays scannable — "＋ N more" expands without ever hiding a PERSON.
const CHIP_LIMIT = 8;
function AttemptChips({ rows, unit }: { rows: { id: string; value: number; occurredAt: string }[]; unit?: string }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const teal = colors.teal;
  const shown = expanded ? rows : rows.slice(0, CHIP_LIMIT);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginLeft: 23, alignItems: 'center' }}>
      {shown.map((a, i) => (
        <View key={a.id} style={{ backgroundColor: colors.surf, borderWidth: 1, borderColor: i === 0 ? teal : colors.border, borderRadius: 10, paddingVertical: 5, paddingHorizontal: 9 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: i === 0 ? teal : colors.text1, fontVariant: ['tabular-nums'] }}>{formatValue(a.value, unit)}</Text>
          <Text style={{ fontSize: 9, color: colors.text3 }}>{fmtShort(a.occurredAt)}</Text>
        </View>
      ))}
      {rows.length > CHIP_LIMIT && (
        <TouchableOpacity onPress={() => setExpanded(e => !e)} style={{ paddingVertical: 6, paddingHorizontal: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: teal }}>{expanded ? 'Show less' : `＋ ${rows.length - CHIP_LIMIT} more`}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>{text}</Text>;
}
