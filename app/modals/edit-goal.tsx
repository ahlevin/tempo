import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useToast } from '../../components/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { CloseButton } from '../../components/CloseButton';
import { IconPicker } from '../../components/IconPicker';
import { useStore } from '../../store/useStore';
import { Alert as AlertType, Link } from '../../store/types';
import { DateTimeField } from '../../components/DateTimeField';
import { AlertsEditor } from '../../components/AlertsEditor';
import { LinksEditor } from '../../components/LinksEditor';
import { GoalWindowPicker, GoalLogLink, GoalRepeatSection, GoalLink } from '../../components/GoalLinkSection';
import { Toggle } from '../../components/FormControls';
import { useConfirm } from '../../components/ConfirmDialog';
import type { GoalPeriodKind } from '../../store/types';

export default function EditGoalModal() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goals      = useStore(s => s.goals);
  const updateGoal = useStore(s => s.updateGoal);
  const deleteGoal = useStore(s => s.deleteGoal);
  const confirm    = useConfirm();
  const { showToast } = useToast();
  const g = goals.find(x => x.id === id);

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
    windowKind: g?.windowKind ?? null, windowYear: g?.windowYear ?? null,
    windowStart: g?.windowStart ?? null,
  });
  const [showOnCountdown, setShowOnCountdown] = useState(g?.showOnCountdown ?? false);
  const [repeats, setRepeats] = useState(g?.repeats ?? false);
  const [periodKind, setPeriodKind] = useState<GoalPeriodKind>(g?.periodKind ?? 'week');
  const [periodTarget, setPeriodTarget] = useState(g?.periodTarget ? String(g.periodTarget) : '');

  const fi = { backgroundColor:colors.glass, borderWidth:1,
    borderColor:colors.border, borderRadius:12, padding:12,
    color:colors.text1, fontSize:15, marginBottom:14 };
  // Linked goals derive progress → Unit/Increment Step are meaningless, so hidden.
  const linked = !!(link.linkedLogId || link.linkedPreset);

  // Never navigate during render (illegal side effect → ErrorBoundary). Delete/
  // save own dismissal; this only covers a stale id at mount.
  useEffect(() => { if (!g) router.back(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!g) return null;

  function save() {
    if (repeats) {
      const pt = parseFloat(periodTarget);
      if (!name.trim() || !pt) { showToast('⚠️', 'Missing info', 'Name and a target per period are required.'); return; }
      // Switching one-shot → recurring drops the deadline; keep any manual history.
      updateGoal(id, { name:name.trim(), target:pt, unit:unit.trim()||'units', step:1, date:'', emoji,
        note:note.trim(), alerts, links, showOnCountdown,
        repeats:true, periodKind, periodTarget:pt, manualPeriods: g!.manualPeriods ?? [], ...link });
      router.back();
      return;
    }
    if (!name.trim()||!target||!date) { showToast('⚠️', 'Missing info', 'Please fill in all fields.'); return; }
    updateGoal(id, { name:name.trim(), target:parseFloat(target),
      unit:unit.trim()||'units', step:parseFloat(step)||1, date, emoji, note:note.trim(), alerts, links, showOnCountdown,
      repeats:false, ...link });
    router.back();
  }

  // Guard against double-invocation while a confirm is already in flight.
  const deleting = useRef(false);
  async function del() {
    if (deleting.current) return;
    deleting.current = true;
    try {
      const ok = await confirm({ title:`Delete "${g!.name}"?`, message:'This cannot be undone.', confirmLabel:'Delete', destructive:true });
      if (ok) {
        deleteGoal(id);
        // Return to the Goals tab (plain back() landed on Countdowns). dismissTo
        // pops the whole modal stack deterministically.
        router.dismissTo('/tabs/goals');
      }
    } finally { deleting.current = false; }
  }

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

          {/* 1 — Goal Name */}
          <FL label="Goal Name" />
          <TextInput value={name} onChangeText={setName} placeholderTextColor={colors.text3} style={fi} />

          {/* Repeats (streak) toggle + period/target when on */}
          <GoalRepeatSection repeats={repeats} onRepeats={setRepeats}
            periodKind={periodKind} onPeriodKind={setPeriodKind}
            periodTarget={periodTarget} onPeriodTarget={setPeriodTarget} />

          {/* One-shot fields — hidden for recurring goals */}
          {!repeats && (
            <>
              {/* 2–3 — Progress Window (+ Count from when By target date) */}
              <GoalWindowPicker value={link} onChange={setLink} createdDate={g.created} />
              {/* 4 — Deadline */}
              <DateTimeField mode="date" label="Deadline" value={date} onChange={setDate} />
            </>
          )}

          {/* 5–6 — Link to a life log + collapsed Life Log picker (both modes) */}
          <GoalLogLink value={link} onChange={setLink} />

          {/* 7 — Target (one-shot only; recurring uses Target per period above) */}
          {!repeats && (
            <>
              <FL label="Target" />
              <TextInput value={target} onChangeText={setTarget}
                keyboardType="numeric" placeholderTextColor={colors.text3} style={fi} />
              {!linked && (
                <>
                  <FL label="Unit" />
                  <TextInput value={unit} onChangeText={setUnit} placeholderTextColor={colors.text3} style={fi} />
                  <FL label="Increment Step" />
                  <TextInput value={step} onChangeText={setStep}
                    keyboardType="numeric" placeholderTextColor={colors.text3} style={fi} />
                </>
              )}
            </>
          )}

          {/* 8 — DISPLAY & REMINDERS */}
          <SH label="Display & Reminders" />
          <Toggle label="⏳ Show on Countdowns" value={showOnCountdown} onChange={setShowOnCountdown} />
          <Text style={{ fontSize:11, color:colors.text3, marginTop:-6, marginBottom:14, marginLeft:2 }}>
            Also display this goal on your Countdowns tab.
          </Text>
          <AlertsEditor value={alerts} onChange={setAlerts} />

          {/* 11 — APPEARANCE */}
          <SH label="Appearance" />
          <FL label="Icon" />
          <IconPicker value={emoji} onChange={setEmoji} accent={colors.teal} />
          <FL label="Note (optional)" />
          <TextInput value={note} onChangeText={setNote} multiline
            placeholder="Add a note…" placeholderTextColor={colors.text3}
            style={{ ...fi, minHeight:64, textAlignVertical:'top' }} />
          <LinksEditor value={links} onChange={setLinks} />

          {/* 15 — Save · 16 — Delete */}
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

// Grouped section header (underlined) — matches the app's grouped-form style.
function SH({ label, first }: { label: string; first?: boolean }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize:12, fontWeight:'800', color:colors.text1, letterSpacing:0.4,
    textTransform:'uppercase', marginTop: first ? 0 : 22, marginBottom:12,
    borderBottomWidth:1, borderBottomColor:colors.border, paddingBottom:8 }}>{label}</Text>;
}
