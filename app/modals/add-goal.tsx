import { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useToast } from '../../components/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format, addDays } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { CloseButton } from '../../components/CloseButton';
import { GOAL_EMOJIS } from '../../constants/data';
import { useStore } from '../../store/useStore';
import { Alert as AlertType, Link } from '../../store/types';
import { DateTimeField } from '../../components/DateTimeField';
import { AlertsEditor } from '../../components/AlertsEditor';
import { LinksEditor } from '../../components/LinksEditor';
import { GoalWindowPicker, GoalLogLink, GoalLink } from '../../components/GoalLinkSection';
import { Toggle } from '../../components/FormControls';

export default function AddGoalModal() {
  const { colors } = useTheme();
  const addGoal = useStore(s => s.addGoal);
  const { showToast } = useToast();
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

  const fi = { backgroundColor:colors.glass, borderWidth:1,
    borderColor:colors.border, borderRadius:12, padding:12,
    color:colors.text1, fontSize:15, marginBottom:14 };
  // Linked goals derive progress → Unit/Increment Step are meaningless, so hidden.
  const linked = !!(link.linkedLogId || link.linkedPreset);

  function submit() {
    if (!name.trim() || !target || !date) { showToast('⚠️', 'Missing info', 'Please fill in all fields.'); return; }
    addGoal({ name:name.trim(), emoji, target:parseFloat(target),
      unit:unit.trim()||'units', step:parseFloat(step)||1, date, fav:false, note:note.trim(), alerts, links, showOnCountdown, ...link });
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

          {/* 1 — Goal Name */}
          <FL label="Goal Name" />
          <TextInput value={name} onChangeText={setName}
            placeholder="e.g. Run 100 miles…" placeholderTextColor={colors.text3} style={fi} />

          {/* 2–3 — Progress Window (+ Count from when By target date) */}
          <GoalWindowPicker value={link} onChange={setLink} createdDate={format(new Date(), 'yyyy-MM-dd')} />

          {/* 4 — Deadline */}
          <DateTimeField mode="date" label="Deadline" value={date} onChange={setDate} />

          {/* 5–6 — Link to a life log + collapsed Life Log picker */}
          <GoalLogLink value={link} onChange={setLink} />

          {/* 7 — Target (Unit + Increment Step only when unlinked) */}
          <FL label="Target" />
          <TextInput value={target} onChangeText={setTarget}
            placeholder={linked ? 'e.g. 2' : '100'} placeholderTextColor={colors.text3}
            keyboardType="numeric" style={fi} />
          {!linked && (
            <>
              <FL label="Unit" />
              <TextInput value={unit} onChangeText={setUnit}
                placeholder="miles, books, $…" placeholderTextColor={colors.text3} style={fi} />
              <FL label="Increment Step" />
              <TextInput value={step} onChangeText={setStep}
                placeholder="1" placeholderTextColor={colors.text3}
                keyboardType="numeric" style={fi} />
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
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:14 }}>
            {GOAL_EMOJIS.map(em => (
              <TouchableOpacity key={em} onPress={() => setEmoji(em)}
                style={{ width:44, height:44, borderRadius:10, borderWidth:2,
                  borderColor: em===emoji ? colors.teal : 'transparent',
                  backgroundColor: em===emoji ? (colors.isDark ? 'rgba(62,207,178,0.15)' : colors.tint) : colors.glass,
                  alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:20 }}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <FL label="Note (optional)" />
          <TextInput value={note} onChangeText={setNote} multiline
            placeholder="Add a note…" placeholderTextColor={colors.text3}
            style={{ ...fi, minHeight:64, textAlignVertical:'top' }} />
          <LinksEditor value={links} onChange={setLinks} />

          {/* 15 — Save */}
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

// Grouped section header (underlined) — matches the app's grouped-form style.
function SH({ label, first }: { label: string; first?: boolean }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize:12, fontWeight:'800', color:colors.text1, letterSpacing:0.4,
    textTransform:'uppercase', marginTop: first ? 0 : 22, marginBottom:12,
    borderBottomWidth:1, borderBottomColor:colors.border, paddingBottom:8 }}>{label}</Text>;
}
