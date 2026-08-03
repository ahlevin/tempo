import { useRef, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { CloseButton } from '../../components/CloseButton';
import { UniversePicker } from '../../components/UniversePicker';
import { useStore } from '../../store/useStore';
import { useToast } from '../../components/Toast';
import { getPreset, presetUniverse } from '../../constants/lifelogs';
import { locationForName } from '../../utils/lifelog';
import { collectionVisits, itemVisitCounts } from '../../utils/challenge';

// Log a COLLECTION-challenge visit: pick an item from the GOAL's preset universe →
// write a goal_attempt (item), and OPTIONALLY mirror it to the user's OWN preset
// life log. Multi-add loop (pick → add → pick again). Coverage counts DISTINCT items.
export default function LogVisitModal() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goals     = useStore(s => s.goals);
  const memories  = useStore(s => s.memories);
  const attempts  = useStore(s => s.goalAttempts);
  const profileId = useStore(s => s.profileId);
  const addGoalAttempt = useStore(s => s.addGoalAttempt);
  const addMemory = useStore(s => s.addMemory);
  const addLogEntry = useStore(s => s.addLogEntry);
  const { showToast } = useToast();

  const g = goals.find(x => x.id === id);
  const preset = getPreset(g?.linkedPreset ?? undefined);
  const universe = presetUniverse(g?.linkedPreset ?? undefined) ?? [];

  // The user's OWN life log for this preset (mirror target). Decision 1: NEVER silently
  // create one — default the toggle ON only if a log already exists; otherwise it's an
  // explicit off opt-in that creates the log only when the user turns it on + logs.
  const presetLog = memories.find(m => m.type === 'lifelog' && m.logPreset === g?.linkedPreset);
  const [mirror, setMirror] = useState(!!presetLog);
  const mirrorLogId = useRef<string | null>(presetLog?.id ?? null);

  const [item, setItem] = useState('');
  const [addedCount, setAddedCount] = useState(0);

  // Guard for a stale id (never navigate during render).
  if (!g) { setTimeout(() => router.back(), 0); return null; }

  const myVisitCounts = itemVisitCounts(attempts, id, profileId ?? '');
  const coverage = collectionVisits(attempts, id, profileId ?? '').size;
  const today = format(new Date(), 'yyyy-MM-dd');
  const teal = colors.teal;

  function addOne() {
    if (!item) return;
    if (!profileId) { showToast('⚠️', 'Not ready', 'Still signing in — try again in a moment.'); return; }
    const newId = addGoalAttempt({ goalId: id, value: 1, occurredAt: today, item }); // canonical universe name
    if (!newId) { showToast('⚠️', 'Not saved', 'Try again in a moment.'); return; }

    if (mirror) {
      // Resolve (or, only on explicit opt-in, create once) the user's own preset log.
      let logId = mirrorLogId.current;
      if (!logId) {
        logId = addMemory({
          type: 'lifelog', name: preset?.name ?? g!.name, emoji: preset?.emoji ?? g!.emoji,
          originDate: '', yearUnknown: false, entries: [],
          logKind: 'collection', logPreset: g!.linkedPreset ?? undefined, logTarget: universe.length,
          note: '', fav: false, alerts: [], links: [],
        });
        mirrorLogId.current = logId;
      }
      const loc = locationForName(universe, item);
      addLogEntry(logId, { date: today, note: '', item, datePrecision: 'full', city: loc?.city, state: loc?.state, address: loc?.address });
    }
    setAddedCount(c => c + 1);
    setItem('');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surf2 }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text1, flex: 1, minWidth: 0, marginRight: 12 }} numberOfLines={1}>
            Log a visit: {g.emoji} {g.name}
          </Text>
          <View style={{ flexShrink: 0 }}><CloseButton /></View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <UniversePicker key={addedCount} universe={universe} counts={myVisitCounts} selected={item} onSelect={setItem}
            headerLabel={`This challenge: ${coverage} of ${universe.length}`}
            rightBadge={addedCount > 0 ? (
              <View style={{ backgroundColor: colors.isDark ? 'rgba(62,207,178,0.16)' : colors.tint, borderRadius: 10, paddingVertical: 3, paddingHorizontal: 9 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: teal }}>{addedCount} added</Text>
              </View>
            ) : null} />

          {/* Life-log mirror (Decision 1: never silently create) */}
          <TouchableOpacity onPress={() => setMirror(v => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.tile, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: mirror ? teal : colors.border, backgroundColor: mirror ? teal : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {mirror && <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontSize: 13, fontWeight: '800' }}>✓</Text>}
            </View>
            <Text style={{ flex: 1, fontSize: 13, color: colors.text1 }}>
              {presetLog
                ? `Also add to my “${presetLog.name}” life log`
                : `Also start a “${preset?.name ?? 'life'}” life log & add my visits`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={addOne} disabled={!item}
            style={{ backgroundColor: teal, borderRadius: 14, padding: 15, alignItems: 'center', opacity: item ? 1 : 0.5, marginBottom: 10 }}>
            <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontSize: 15, fontWeight: '700' }}>
              {item ? `Add ${item} · add another` : 'Pick an item above'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}
            style={{ backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 15, alignItems: 'center' }}>
            <Text style={{ color: colors.text1, fontSize: 15, fontWeight: '700' }}>{addedCount > 0 ? `Done · ${addedCount} added` : 'Done'}</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
