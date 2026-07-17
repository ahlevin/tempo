import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useToast } from '../../components/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { CloseButton } from '../../components/CloseButton';
import { IconPicker } from '../../components/IconPicker';
import { useStore } from '../../store/useStore';
import { Alert as AlertType, Link, GoalKind, GoalDirection, GoalAgg } from '../../store/types';
import { DateTimeField } from '../../components/DateTimeField';
import { AlertsEditor } from '../../components/AlertsEditor';
import { LinksEditor } from '../../components/LinksEditor';
import { GoalWindowPicker, GoalLogLink, GoalRepeatSection, GoalKindPicker, GoalValueSection, GoalLink } from '../../components/GoalLinkSection';
import { Toggle } from '../../components/FormControls';
import { useConfirm } from '../../components/ConfirmDialog';
import { goalKind, questChildren, isGoalComplete } from '../../utils/goals';
import { parseValue, formatValue } from '../../utils/values';
import type { GoalPeriodKind } from '../../store/types';

export default function EditGoalModal() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goals      = useStore(s => s.goals);
  const memories   = useStore(s => s.memories);
  const attempts   = useStore(s => s.goalAttempts);
  const updateGoal = useStore(s => s.updateGoal);
  const deleteGoal = useStore(s => s.deleteGoal);
  const addGoal    = useStore(s => s.addGoal);
  const setMilestoneDone = useStore(s => s.setMilestoneDone);
  const confirm    = useConfirm();
  const { showToast } = useToast();
  const g = goals.find(x => x.id === id);

  const [kind,   setKind]   = useState<GoalKind>(g ? goalKind(g) : 'count');
  const [name,   setName]   = useState(g?.name   || '');
  const [target, setTarget] = useState(String(g?.target || ''));
  const [unit,   setUnit]   = useState(g?.unit   || '');
  const [step,   setStep]   = useState(String(g?.step   || 1));
  const [date,   setDate]   = useState(g?.date   || '');
  const [emoji,  setEmoji]  = useState(g?.emoji  || '🎯');
  const [note,   setNote]   = useState(g?.note   || '');
  const [alerts, setAlerts] = useState<AlertType[]>(g?.alerts ?? []);
  const [links,  setLinks]  = useState<Link[]>(g?.links ?? []);
  const [link,   setLink]   = useState<GoalLink>({
    linkedLogId: g?.linkedLogId ?? null, linkedPreset: g?.linkedPreset ?? null,
    windowKind: g?.windowKind ?? null, windowYear: g?.windowYear ?? null, windowStart: g?.windowStart ?? null,
  });
  const [showOnCountdown, setShowOnCountdown] = useState(g?.showOnCountdown ?? false);
  const [periodKind, setPeriodKind] = useState<GoalPeriodKind>(g?.periodKind ?? 'week');
  const [periodTarget, setPeriodTarget] = useState(g?.periodTarget ? String(g.periodTarget) : '');
  const [direction, setDirection] = useState<GoalDirection>(g?.direction ?? 'lower');
  const [agg, setAgg] = useState<GoalAgg>(g?.agg ?? 'best');
  const [targetValue, setTargetValue] = useState(g?.targetValue != null ? formatValue(g.targetValue, g.unit) : '');
  const [childName, setChildName] = useState('');

  const fi = { backgroundColor:colors.glass, borderWidth:1,
    borderColor:colors.border, borderRadius:12, padding:12,
    color:colors.text1, fontSize:15, marginBottom:14 };
  const linked = !!(link.linkedLogId || link.linkedPreset);

  const deleting = useRef(false);
  useEffect(() => { if (!g) router.back(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!g) return null;

  // Reset fragments so switching kind never leaves stale fields behind.
  const clearLink = { linkedLogId: null, linkedPreset: null };
  const clearWindow = { windowKind: null, windowYear: null, windowStart: null };
  const clearRepeat = { repeats: false, periodKind: null, periodTarget: null };
  const clearValue = { direction: null, agg: null, targetValue: null };

  function save() {
    if (!name.trim()) { showToast('⚠️', 'Missing info', 'Give the goal a name.'); return; }
    const base = { name: name.trim(), emoji, note: note.trim(), alerts, links, showOnCountdown };
    if (kind === 'milestone') {
      updateGoal(id, { ...base, kind, target: 0, unit: '', step: 1, date, ...clearLink, ...clearWindow, ...clearRepeat, ...clearValue });
    } else if (kind === 'count') {
      if (!target) { showToast('⚠️', 'Missing info', 'Enter a target.'); return; }
      updateGoal(id, { ...base, kind, target: parseFloat(target), unit: unit.trim() || 'units', step: parseFloat(step) || 1, date,
        ...clearLink, windowKind: link.windowKind ?? null, windowYear: link.windowYear ?? null, windowStart: link.windowStart ?? null, ...clearRepeat, ...clearValue });
    } else if (kind === 'collection') {
      if (!linked) { showToast('⚠️', 'Link a life log', 'Collection goals track a linked log.'); return; }
      if (!target) { showToast('⚠️', 'Missing info', 'Enter a target.'); return; }
      updateGoal(id, { ...base, kind, target: parseFloat(target), unit: '', step: 1, date, ...link, ...clearRepeat, ...clearValue });
    } else if (kind === 'streak') {
      const pt = parseFloat(periodTarget);
      if (!pt) { showToast('⚠️', 'Missing info', 'Enter a target per period.'); return; }
      updateGoal(id, { ...base, kind, target: pt, unit: '', step: 1, date: '', repeats: true, periodKind, periodTarget: pt, manualPeriods: g!.manualPeriods ?? [], ...link, ...clearValue });
    } else if (kind === 'value') {
      const tv = parseValue(targetValue, unit);
      if (tv == null) { showToast('⚠️', 'Missing info', 'Enter a target value.'); return; }
      updateGoal(id, { ...base, kind, target: 0, unit: unit.trim(), step: 1, date, ...clearLink, ...clearWindow, ...clearRepeat, direction, agg, targetValue: tv });
    } else { // quest
      updateGoal(id, { ...base, kind, target: 0, unit: '', step: 1, date: '', ...clearLink, ...clearWindow, ...clearRepeat, ...clearValue });
    }
    router.back();
  }

  async function del() {
    if (deleting.current) return;
    deleting.current = true;
    try {
      const ok = await confirm({ title:`Delete "${g!.name}"?`, message:'This cannot be undone.', confirmLabel:'Delete', destructive:true });
      if (ok) { deleteGoal(id); router.dismissTo('/tabs/goals'); }
    } finally { deleting.current = false; }
  }

  function addMilestone() {
    const n = childName.trim();
    if (!n) return;
    addGoal({ name: n, emoji: '🏁', fav: false, note: '', alerts: [], links: [],
      kind: 'milestone', target: 0, unit: '', step: 1, date: '', repeats: false, parentGoalId: id });
    setChildName('');
  }

  const children = questChildren(g, goals);

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2 }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ width:40, height:4, backgroundColor:colors.border,
          borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between',
          alignItems:'center', paddingHorizontal:20, paddingVertical:12 }}>
          <Text style={{ fontSize:18, fontWeight:'700', color:colors.text1 }}>Edit Goal</Text>
          <CloseButton />
        </View>
        <ScrollView contentContainerStyle={{ padding:20 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <GoalKindPicker value={kind} onChange={setKind} />

          <FL label="Goal Name" />
          <TextInput value={name} onChangeText={setName} placeholderTextColor={colors.text3} style={fi} />

          {kind === 'value' && (
            <>
              <GoalValueSection direction={direction} agg={agg} unit={unit} targetValue={targetValue}
                onPick={(d, a, u) => { setDirection(d); setAgg(a); if (u || !unit) setUnit(u); }}
                onUnit={setUnit} onTargetValue={setTargetValue} />
              <DateTimeField mode="date" label="Deadline (optional)" value={date || ''} onChange={setDate} />
            </>
          )}

          {kind === 'milestone' && (
            <>
              <Text style={{ fontSize:12, color:colors.text3, marginBottom:14 }}>Binary — done or not. Toggle it complete from the goal.</Text>
              <DateTimeField mode="date" label="Deadline (optional)" value={date || ''} onChange={setDate} />
            </>
          )}

          {kind === 'quest' && (
            <>
              <SH label={`Milestones · ${children.length}`} />
              {children.length === 0 && <Text style={{ fontSize:12, color:colors.text3, marginBottom:10 }}>No milestones yet.</Text>}
              {children.map(c => {
                const done = isGoalComplete(c, goals, memories, attempts);
                const isMs = goalKind(c) === 'milestone';
                return (
                  <View key={c.id} style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:8 }}>
                    <TouchableOpacity disabled={!isMs} onPress={() => setMilestoneDone(c.id, !done)}
                      style={{ width:24, height:24, borderRadius:6, borderWidth:2,
                        borderColor: done ? colors.teal : colors.border, backgroundColor: done ? colors.teal : 'transparent',
                        alignItems:'center', justifyContent:'center' }}>
                      {done && <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontSize:13, fontWeight:'800' }}>✓</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex:1 }} onPress={() => router.push({ pathname:'/modals/edit-goal', params:{ id: c.id } })}>
                      <Text style={{ fontSize:14, fontWeight:'600', color:colors.text1 }} numberOfLines={1}>{c.emoji} {c.name}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
              <View style={{ flexDirection:'row', gap:8, marginTop:4, marginBottom:14 }}>
                <TextInput value={childName} onChangeText={setChildName} placeholder="New milestone…"
                  placeholderTextColor={colors.text3} style={{ ...fi, flex:1, marginBottom:0 }} onSubmitEditing={addMilestone} />
                <TouchableOpacity onPress={addMilestone}
                  style={{ paddingHorizontal:16, borderRadius:12, backgroundColor:colors.teal, alignItems:'center', justifyContent:'center' }}>
                  <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontWeight:'700' }}>Add</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {kind === 'streak' && (
            <>
              <GoalRepeatSection showToggle={false} repeats onRepeats={() => {}}
                periodKind={periodKind} onPeriodKind={setPeriodKind}
                periodTarget={periodTarget} onPeriodTarget={setPeriodTarget} />
              <GoalLogLink value={link} onChange={setLink} />
            </>
          )}

          {kind === 'collection' && (
            <>
              <GoalLogLink value={link} onChange={setLink} />
              <GoalWindowPicker value={link} onChange={setLink} createdDate={g.created} />
              <DateTimeField mode="date" label="Deadline" value={date || ''} onChange={setDate} />
              <FL label="Target" />
              <TextInput value={target} onChangeText={setTarget} keyboardType="numeric" placeholderTextColor={colors.text3} style={fi} />
            </>
          )}

          {kind === 'count' && (
            <>
              <GoalWindowPicker value={link} onChange={setLink} createdDate={g.created} />
              <DateTimeField mode="date" label="Deadline" value={date || ''} onChange={setDate} />
              <FL label="Target" />
              <TextInput value={target} onChangeText={setTarget} keyboardType="numeric" placeholderTextColor={colors.text3} style={fi} />
              <FL label="Unit" />
              <TextInput value={unit} onChangeText={setUnit} placeholderTextColor={colors.text3} style={fi} />
              <FL label="Increment Step" />
              <TextInput value={step} onChangeText={setStep} keyboardType="numeric" placeholderTextColor={colors.text3} style={fi} />
            </>
          )}

          <SH label="Display & Reminders" />
          <Toggle label="⏳ Show on Countdowns" value={showOnCountdown} onChange={setShowOnCountdown} />
          <Text style={{ fontSize:11, color:colors.text3, marginTop:-6, marginBottom:14, marginLeft:2 }}>
            Also display this goal on your Countdowns tab.
          </Text>
          <AlertsEditor value={alerts} onChange={setAlerts} />

          <SH label="Appearance" />
          <FL label="Icon" />
          <IconPicker value={emoji} onChange={setEmoji} accent={colors.teal} />
          <FL label="Note (optional)" />
          <TextInput value={note} onChangeText={setNote} multiline
            placeholder="Add a note…" placeholderTextColor={colors.text3}
            style={{ ...fi, minHeight:64, textAlignVertical:'top' }} />
          <LinksEditor value={links} onChange={setLinks} />

          <TouchableOpacity onPress={save}
            style={{ backgroundColor:colors.teal, borderRadius:14, padding:15, alignItems:'center', marginTop:8, marginBottom:12 }}>
            <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontSize:15, fontWeight:'700' }}>Save Changes →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={del}
            style={{ backgroundColor:(colors.isDark ? 'rgba(232,80,122,0.15)' : 'rgba(197,0,26,0.10)'), borderWidth:1,
              borderColor:(colors.isDark ? 'rgba(232,80,122,0.3)' : 'rgba(197,0,26,0.30)'), borderRadius:14, padding:15, alignItems:'center' }}>
            <Text style={{ color:colors.rose, fontSize:15, fontWeight:'700' }}>Delete Goal</Text>
          </TouchableOpacity>
          <View style={{ height:40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FL({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize:11, fontWeight:'600', color:colors.text3,
    textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>{label}</Text>;
}
function SH({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize:12, fontWeight:'800', color:colors.text1, letterSpacing:0.4,
    textTransform:'uppercase', marginTop:22, marginBottom:12,
    borderBottomWidth:1, borderBottomColor:colors.border, paddingBottom:8 }}>{label}</Text>;
}
