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
import { Toggle } from '../../components/FormControls';
import { useConfirm } from '../../components/ConfirmDialog';

export default function EditMemoryModal() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memories     = useStore(s => s.memories);
  const updateMemory = useStore(s => s.updateMemory);
  const deleteMemory = useStore(s => s.deleteMemory);
  const convertMemoryToEvent = useStore(s => s.convertMemoryToEvent);
  const convertMemoryType    = useStore(s => s.convertMemoryType);
  const confirm      = useConfirm();
  const { showToast } = useToast();
  const m = memories.find(x => x.id === id);

  const [name,  setName]  = useState(m?.name       || '');
  const [date,  setDate]  = useState(m?.originDate  || '');
  const [emoji, setEmoji] = useState(m?.emoji       || '⭐');
  const [note,  setNote]  = useState(m?.note        || '');
  const [yearUnknown, setYearUnknown] = useState(m?.yearUnknown ?? false);
  const [alerts, setAlerts] = useState<AlertType[]>(m?.alerts ?? []);
  const [links,  setLinks]  = useState<Link[]>(m?.links ?? []);

  const fi = { backgroundColor:colors.glass, borderWidth:1,
    borderColor:colors.border, borderRadius:12, padding:12,
    color:colors.text1, fontSize:15, marginBottom:14 };

  const DATE_LABELS: Record<string,string> = {
    birthday:'Date of Birth', anniversary:'Anniversary Date',
    memorial:'Date to Remember', lifelog:'First Occurrence'
  };

  // Guard against double-invocation while a confirm is already in flight. MUST be
  // above the not-found guard so hook count stays constant (Rules of Hooks / #300).
  const deleting = useRef(false);
  // Never navigate during render (illegal side effect → ErrorBoundary). Delete/
  // save own dismissal; this only covers a stale id at mount.
  useEffect(() => { if (!m) router.back(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m) return null;

  function save() {
    const lifelog = m!.type === 'lifelog';
    if (!name.trim() || (!lifelog && !date)) { showToast('⚠️', 'Missing info', 'Please fill in all fields.'); return; }
    updateMemory(id, lifelog
      ? { name:name.trim(), emoji }   // life-log container: name + emoji only
      : { name:name.trim(), originDate:date, emoji, note:note.trim(), yearUnknown, alerts, links });
    router.back();
  }

  async function del() {
    if (deleting.current) return;
    deleting.current = true;
    try {
    const ok = await confirm({ title:`Delete "${m!.name}"?`, message:'All entries will be lost.', confirmLabel:'Delete', destructive:true });
    if (ok) {
      const wasLifelog = m!.type === 'lifelog';
      deleteMemory(id);
      // Return to the tab this memory lives on — life logs → Life Log tab,
      // birthdays/anniversaries/memorials → Countdowns. dismissTo pops the whole
      // modal stack deterministically (the plain back() landed on Countdowns).
      router.dismissTo(wasLifelog ? '/tabs/lifelog' : '/tabs');
    }
    } finally { deleting.current = false; }
  }

  // Convert to an Event, or to another memory type. Options exclude the current type.
  const MEM_TYPES: { type: 'birthday'|'anniversary'|'memorial'|'lifelog'; label: string; emoji: string }[] = [
    { type:'birthday',    label:'Birthday',    emoji:'🎂' },
    { type:'anniversary', label:'Anniversary', emoji:'💑' },
    { type:'memorial',    label:'Memorial',    emoji:'🕊️' },
    { type:'lifelog',     label:'Life Log',    emoji:'📓' },
  ];
  const convertTargets = MEM_TYPES.filter(t => t.type !== m.type);
  async function toEvent() {
    const ok = await confirm({ title:'Convert to Event?',
      message:`"${m!.name}" will move to your Countdowns as an event. Its date, note, reminders, and star are kept.`,
      confirmLabel:'Convert' });
    if (ok) { convertMemoryToEvent(id); router.back(); }
  }
  async function toMemType(t: typeof MEM_TYPES[number]) {
    const ok = await confirm({ title:`Convert to ${t.label}?`,
      message:`"${m!.name}" will become a ${t.label}. Its date, note, and entries are kept.`,
      confirmLabel:'Convert' });
    if (ok) { convertMemoryType(id, t.type); router.back(); }
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2 }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ width:40, height:4, backgroundColor:colors.border,
          borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between',
          alignItems:'center', paddingHorizontal:20, paddingVertical:12 }}>
          <Text style={{ fontSize:18, fontWeight:'700', color:colors.text1 }}>Edit Memory</Text>
          <CloseButton />
        </View>
        <ScrollView contentContainerStyle={{ padding:20 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <FL label="Name" />
          <TextInput value={name} onChangeText={setName} placeholderTextColor={colors.text3} style={fi} />
          {/* A life log is a container — its dates live on entries, not here. */}
          {m.type !== 'lifelog' && (
            <>
              <DateTimeField mode="date" label={DATE_LABELS[m.type]||'Date'} value={date} onChange={setDate} />
              <Toggle label="I don't know the year" value={yearUnknown} onChange={setYearUnknown} />
              {yearUnknown && (
                <Text style={{ fontSize:12, color:colors.text3, marginTop:-6, marginBottom:14, marginLeft:2 }}>
                  Only the month and day are used — the year won't be shown.
                </Text>
              )}
            </>
          )}
          <FL label="Icon" />
          <IconPicker value={emoji} onChange={setEmoji} accent={colors.rose} />
          {m.type !== 'lifelog' && (
            <>
              <FL label="Note (optional)" />
              <TextInput value={note} onChangeText={setNote} placeholderTextColor={colors.text3} style={fi} />
              <LinksEditor value={links} onChange={setLinks} />
            </>
          )}
          {(m.type === 'birthday' || m.type === 'anniversary' || m.type === 'memorial') && (
            <AlertsEditor value={alerts} onChange={setAlerts} />
          )}
          <TouchableOpacity onPress={save}
            style={{ backgroundColor:colors.rose, borderRadius:14, padding:15, alignItems:'center', marginBottom:12 }}>
            <Text style={{ color:'#fff', fontSize:15, fontWeight:'700' }}>Save Changes →</Text>
          </TouchableOpacity>

          <FL label="Change type" />
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:7, marginBottom:16 }}>
            <TouchableOpacity onPress={toEvent}
              style={{ flexDirection:'row', alignItems:'center', gap:6, paddingVertical:9, paddingHorizontal:12,
                borderRadius:11, borderWidth:1, borderColor:colors.border, backgroundColor:colors.glass }}>
              <Text style={{ fontSize:15 }}>🎉</Text>
              <Text style={{ fontSize:13, fontWeight:'600', color:colors.text2 }}>Event</Text>
            </TouchableOpacity>
            {convertTargets.map(t => (
              <TouchableOpacity key={t.type} onPress={() => toMemType(t)}
                style={{ flexDirection:'row', alignItems:'center', gap:6, paddingVertical:9, paddingHorizontal:12,
                  borderRadius:11, borderWidth:1, borderColor:colors.border, backgroundColor:colors.glass }}>
                <Text style={{ fontSize:15 }}>{t.emoji}</Text>
                <Text style={{ fontSize:13, fontWeight:'600', color:colors.text2 }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={del}
            style={{ backgroundColor:(colors.isDark ? 'rgba(232,80,122,0.15)' : 'rgba(197,0,26,0.10)'), borderWidth:1,
              borderColor:(colors.isDark ? 'rgba(232,80,122,0.3)' : 'rgba(197,0,26,0.30)'), borderRadius:14, padding:15, alignItems:'center' }}>
            <Text style={{ color:colors.rose, fontSize:15, fontWeight:'700' }}>Delete Memory</Text>
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
