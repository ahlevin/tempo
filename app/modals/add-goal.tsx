import { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useToast } from '../../components/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format, addDays } from 'date-fns';
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
import { parseValue } from '../../utils/values';
import type { GoalPeriodKind } from '../../store/types';

export default function AddGoalModal() {
  const { colors } = useTheme();
  const addGoal = useStore(s => s.addGoal);
  const { showToast } = useToast();
  const [kind,   setKind]   = useState<GoalKind>('count');
  const [name,   setName]   = useState('');
  const [target, setTarget] = useState('');
  const [unit,   setUnit]   = useState('');
  const [step,   setStep]   = useState('1');
  const [date,   setDate]   = useState(format(addDays(new Date(), 90), 'yyyy-MM-dd'));
  const [emoji,  setEmoji]  = useState('🎯');
  const [note,   setNote]   = useState('');
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [links,  setLinks]  = useState<Link[]>([]);
  const [link,   setLink]   = useState<GoalLink>({});
  const [showOnCountdown, setShowOnCountdown] = useState(false);
  const [periodKind, setPeriodKind] = useState<GoalPeriodKind>('week');
  const [periodTarget, setPeriodTarget] = useState('');
  // Value goal fields
  const [direction, setDirection] = useState<GoalDirection>('lower');
  const [agg, setAgg] = useState<GoalAgg>('best');
  const [targetValue, setTargetValue] = useState('');

  const fi = { backgroundColor:colors.glass, borderWidth:1,
    borderColor:colors.border, borderRadius:12, padding:12,
    color:colors.text1, fontSize:15, marginBottom:14 };
  const linked = !!(link.linkedLogId || link.linkedPreset);

  function submit() {
    if (!name.trim()) { showToast('⚠️', 'Missing info', 'Give the goal a name.'); return; }
    const base = { name: name.trim(), emoji, fav: false, note: note.trim(), alerts, links, showOnCountdown };
    if (kind === 'milestone') {
      addGoal({ ...base, kind, target: 0, unit: '', step: 1, date, repeats: false });
    } else if (kind === 'count') {
      if (!target) { showToast('⚠️', 'Missing info', 'Enter a target.'); return; }
      addGoal({ ...base, kind, target: parseFloat(target), unit: unit.trim() || 'units', step: parseFloat(step) || 1, date, repeats: false, ...link });
    } else if (kind === 'collection') {
      if (!linked) { showToast('⚠️', 'Link a life log', 'Collection goals track a linked log.'); return; }
      if (!target) { showToast('⚠️', 'Missing info', 'Enter a target.'); return; }
      addGoal({ ...base, kind, target: parseFloat(target), unit: '', step: 1, date, repeats: false, ...link });
    } else if (kind === 'streak') {
      const pt = parseFloat(periodTarget);
      if (!pt) { showToast('⚠️', 'Missing info', 'Enter a target per period.'); return; }
      addGoal({ ...base, kind, target: pt, unit: '', step: 1, date: '', repeats: true, periodKind, periodTarget: pt, manualPeriods: [], ...link });
    } else if (kind === 'value') {
      const tv = parseValue(targetValue, unit);
      if (tv == null) { showToast('⚠️', 'Missing info', 'Enter a target value.'); return; }
      addGoal({ ...base, kind, target: 0, unit: unit.trim(), step: 1, date, repeats: false, direction, agg, targetValue: tv });
    } else { // quest
      addGoal({ ...base, kind, target: 0, unit: '', step: 1, date: '', repeats: false });
    }
    router.back();
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2 }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ width:40, height:4, backgroundColor:colors.border,
          borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between',
          alignItems:'center', paddingHorizontal:20, paddingVertical:12 }}>
          <Text style={{ fontSize:18, fontWeight:'700', color:colors.text1 }}>New Goal 🎯</Text>
          <CloseButton />
        </View>
        <ScrollView contentContainerStyle={{ padding:20 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <GoalKindPicker value={kind} onChange={setKind} />

          <FL label="Goal Name" />
          <TextInput value={name} onChangeText={setName}
            placeholder="e.g. Run a 6:00 mile…" placeholderTextColor={colors.text3} style={fi} />

          {kind === 'value' && (
            <>
              <GoalValueSection direction={direction} agg={agg} unit={unit} targetValue={targetValue}
                onPick={(d, a, u) => { setDirection(d); setAgg(a); if (u || !unit) setUnit(u); }}
                onUnit={setUnit} onTargetValue={setTargetValue} />
              <DateTimeField mode="date" label="Deadline (optional)" value={date} onChange={setDate} />
            </>
          )}

          {kind === 'milestone' && (
            <Text style={{ fontSize:12, color:colors.text3, marginBottom:14 }}>
              Binary — done or not. Mark it complete from the goal. No target or unit.
            </Text>
          )}

          {kind === 'quest' && (
            <Text style={{ fontSize:12, color:colors.text3, marginBottom:14 }}>
              A quest completes as its milestones do. Create it, then add milestones from the goal.
            </Text>
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
              <GoalWindowPicker value={link} onChange={setLink} createdDate={format(new Date(), 'yyyy-MM-dd')} />
              <DateTimeField mode="date" label="Deadline" value={date} onChange={setDate} />
              <FL label="Target" />
              <TextInput value={target} onChangeText={setTarget}
                placeholder="e.g. 50" placeholderTextColor={colors.text3} keyboardType="numeric" style={fi} />
            </>
          )}

          {kind === 'count' && (
            <>
              <GoalWindowPicker value={link} onChange={setLink} createdDate={format(new Date(), 'yyyy-MM-dd')} />
              <DateTimeField mode="date" label="Deadline" value={date} onChange={setDate} />
              <FL label="Target" />
              <TextInput value={target} onChangeText={setTarget}
                placeholder="100" placeholderTextColor={colors.text3} keyboardType="numeric" style={fi} />
              <FL label="Unit" />
              <TextInput value={unit} onChangeText={setUnit}
                placeholder="miles, books, $…" placeholderTextColor={colors.text3} style={fi} />
              <FL label="Increment Step" />
              <TextInput value={step} onChangeText={setStep}
                placeholder="1" placeholderTextColor={colors.text3} keyboardType="numeric" style={fi} />
            </>
          )}

          {kind === 'milestone' && (
            <DateTimeField mode="date" label="Deadline (optional)" value={date} onChange={setDate} />
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

          <TouchableOpacity onPress={submit}
            style={{ backgroundColor:colors.teal, borderRadius:14, padding:15, alignItems:'center', marginTop:8 }}>
            <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontSize:15, fontWeight:'700' }}>Set Goal →</Text>
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
