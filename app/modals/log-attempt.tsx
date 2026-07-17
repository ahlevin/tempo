import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { CloseButton } from '../../components/CloseButton';
import { useStore } from '../../store/useStore';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';
import { DateTimeField } from '../../components/DateTimeField';
import { LinksEditor } from '../../components/LinksEditor';
import { ValueInput } from '../../components/ValueInput';
import { Link } from '../../store/types';

// Log (or edit) a single attempt for a VALUE goal. Params: id (goal id) and
// optional attempt (attempt id) to edit an existing one.
export default function LogAttemptModal() {
  const { colors } = useTheme();
  const { id, attempt } = useLocalSearchParams<{ id: string; attempt?: string }>();
  const goals    = useStore(s => s.goals);
  const attempts = useStore(s => s.goalAttempts);
  const profileId = useStore(s => s.profileId);
  const addGoalAttempt    = useStore(s => s.addGoalAttempt);
  const updateGoalAttempt = useStore(s => s.updateGoalAttempt);
  const deleteGoalAttempt = useStore(s => s.deleteGoalAttempt);
  const { showToast } = useToast();
  const confirm = useConfirm();

  const g = goals.find(x => x.id === id);
  const editing = attempt ? attempts.find(a => a.id === attempt) : undefined;
  const unit = g?.unit ?? '';

  const [value, setValue]   = useState<number | null>(editing ? editing.value : null);
  const [date,  setDate]    = useState(editing?.occurredAt || format(new Date(), 'yyyy-MM-dd'));
  const [note,  setNote]    = useState(editing?.note || '');
  const [links, setLinks]   = useState<Link[]>(editing?.links ?? []);
  const saving = useRef(false);

  useEffect(() => { if (!g) router.back(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!g) return null;

  const fi = { backgroundColor:colors.glass, borderWidth:1, borderColor:colors.border,
    borderRadius:12, padding:12, color:colors.text1, fontSize:15, marginBottom:14 };

  function save() {
    if (saving.current) return;
    const v = value;
    if (v == null) { showToast('⚠️', 'Enter a value', 'Add a number to log this attempt.'); return; }
    if (editing) {
      updateGoalAttempt(editing.id, { value: v, occurredAt: date, note: note.trim(), links });
    } else {
      if (!profileId) { showToast('⚠️', 'Not ready', 'Still signing in — try again in a moment.'); return; }
      saving.current = true;
      const newId = addGoalAttempt({ goalId: id, value: v, occurredAt: date, note: note.trim(), links });
      if (!newId) { saving.current = false; showToast('⚠️', 'Not saved', 'Try again in a moment.'); return; }
    }
    router.back();
  }

  async function del() {
    if (!editing) return;
    const ok = await confirm({ title: 'Delete attempt?', message: 'This removes it from your timeline.', confirmLabel: 'Delete', destructive: true });
    if (ok) { deleteGoalAttempt(editing.id); router.back(); }
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2 }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ width:40, height:4, backgroundColor:colors.border, borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingVertical:12 }}>
          <Text style={{ fontSize:18, fontWeight:'700', color:colors.text1 }} numberOfLines={1}>
            {editing ? 'Edit attempt' : 'Log attempt'}: {g.emoji} {g.name}
          </Text>
          <View style={{ flexShrink:0 }}><CloseButton /></View>
        </View>
        <ScrollView contentContainerStyle={{ padding:20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <ValueInput unit={unit} value={value} onChange={setValue} />

          <DateTimeField mode="date" label="Date" value={date} onChange={setDate} />

          <FL label="Note (optional)" />
          <TextInput value={note} onChangeText={setNote} multiline placeholder="How did it go?…"
            placeholderTextColor={colors.text3} style={{ ...fi, minHeight:56, textAlignVertical:'top' }} />

          <LinksEditor value={links} onChange={setLinks} />

          <TouchableOpacity onPress={save}
            style={{ backgroundColor:colors.teal, borderRadius:14, padding:15, alignItems:'center', marginTop:8, marginBottom: editing ? 10 : 0 }}>
            <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontSize:15, fontWeight:'700' }}>{editing ? 'Save' : 'Log It →'}</Text>
          </TouchableOpacity>
          {editing && (
            <TouchableOpacity onPress={del}
              style={{ backgroundColor:(colors.isDark ? 'rgba(232,80,122,0.15)' : 'rgba(197,0,26,0.10)'), borderWidth:1,
                borderColor:(colors.isDark ? 'rgba(232,80,122,0.3)' : 'rgba(197,0,26,0.25)'), borderRadius:14, padding:15, alignItems:'center' }}>
              <Text style={{ color:colors.rose, fontSize:15, fontWeight:'700' }}>Delete attempt</Text>
            </TouchableOpacity>
          )}
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
