import { useRef, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useToast } from '../../components/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { format, addHours } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { CloseButton } from '../../components/CloseButton';
import { EMOJIS, CATEGORIES } from '../../constants/data';
import { useStore } from '../../store/useStore';
import { Recurrence, Alert as AlertType, Link } from '../../store/types';
import { DateTimeField } from '../../components/DateTimeField';
import { RecurrenceEditor } from '../../components/RecurrenceEditor';
import { AlertsEditor } from '../../components/AlertsEditor';
import { LinksEditor } from '../../components/LinksEditor';
import { LifelogAttachSection, AttachHandle } from '../../components/LifelogAttachSection';
import { useConfirm } from '../../components/ConfirmDialog';
import { canonItem } from '../../utils/lifelog';
import { toDate } from '../../utils/dates';

export default function EditEventModal() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const events      = useStore(s => s.events);
  const updateEvent = useStore(s => s.updateEvent);
  const deleteEvent = useStore(s => s.deleteEvent);
  const attachEventToLog     = useStore(s => s.attachEventToLog);
  const confirm     = useConfirm();
  const { showToast } = useToast();
  const event = events.find(e => e.id === id);
  const [attachOpen, setAttachOpen] = useState(false);
  const attachRef = useRef<AttachHandle>(null);

  const initStart = event?.start || `${event?.date || format(new Date(), 'yyyy-MM-dd')}T00:00:00`;
  const initEnd   = event?.end   || format(addHours(toDate(initStart), 1), "yyyy-MM-dd'T'HH:mm:ss");

  const [name,   setName]   = useState(event?.name   || '');
  const [allDay, setAllDay] = useState(event?.allDay ?? true);
  const [start,  setStart]  = useState(initStart);
  const [end,    setEnd]    = useState(initEnd);
  const [emoji,  setEmoji]  = useState(event?.emoji  || '🎉');
  const [cat,    setCat]    = useState<string>(event?.cat || 'parties');
  const [note,   setNote]   = useState(event?.note   || '');
  const [recur,  setRecur]  = useState<Recurrence | null>(event?.recur ?? null);
  const [alerts, setAlerts] = useState<AlertType[]>(event?.alerts ?? []);
  const [links,  setLinks]  = useState<Link[]>(event?.links ?? []);

  const fi = { backgroundColor:colors.glass, borderWidth:1,
    borderColor:colors.border, borderRadius:12, padding:12,
    color:colors.text1, fontSize:15, marginBottom:14 };

  if (!event) { router.back(); return null; }

  function save() {
    if (!name.trim()) { showToast('⚠️', 'Missing info', 'Please enter a name.'); return; }
    const startIso = allDay ? `${start.slice(0, 10)}T00:00:00` : start;
    updateEvent(id, { name:name.trim(), emoji, cat:cat as any,
      allDay, start:startIso, end: allDay ? null : end, date: startIso.slice(0, 10),
      note: note.trim(), recur, alerts, links });
    router.back();
  }

  async function del() {
    const ok = await confirm({ title:`Delete "${event!.name}"?`, message:'This cannot be undone.', confirmLabel:'Delete', destructive:true });
    if (ok) { deleteEvent(id); router.back(); }
  }

  // Move this standalone event INTO a life log as a single future-dated entry
  // (single source of truth — the event row is removed).
  async function moveIntoLog() {
    if (!name.trim()) { showToast('⚠️', 'Missing info', 'Please enter a name.'); return; }
    const d = attachRef.current?.describe();
    if (!d) return; // the picker surfaced the reason
    const ok = await confirm({ title:`Move into “${d.name}”?`,
      message:`"${name.trim()}" becomes an entry in ${d.willCreate ? `a new “${d.name}”` : `“${d.name}”`} and stops being a standalone event. It counts down until its date, then completes.`,
      confirmLabel:'Move' });
    if (!ok) return;
    const r = attachRef.current?.resolve();
    if (!r) return;
    const startIso = allDay ? `${start.slice(0, 10)}T00:00:00` : start;
    attachEventToLog(id, r.targetId, { date: startIso.slice(0, 10), note: note.trim(), item: canonItem(r.universe, name.trim()), datePrecision: 'full' });
    router.back();
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2 }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ width:40, height:4, backgroundColor:colors.border,
          borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between',
          alignItems:'center', paddingHorizontal:20, paddingVertical:12 }}>
          <Text style={{ fontSize:18, fontWeight:'700', color:colors.text1 }}>Edit Event</Text>
          <CloseButton />
        </View>
        <ScrollView contentContainerStyle={{ padding:20 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <FL label="Event Name" />
          <TextInput value={name} onChangeText={setName} placeholderTextColor={colors.text3} style={fi} />
          <Toggle label="📅 All-day" value={allDay} onChange={setAllDay} />
          {allDay ? (
            <DateTimeField mode="date" label="Date" value={start}
              onChange={d => setStart(`${d}T00:00:00`)} />
          ) : (
            <>
              <DateTimeField mode="datetime" label="Starts" value={start} onChange={setStart} />
              <DateTimeField mode="datetime" label="Ends"   value={end}   onChange={setEnd} />
            </>
          )}
          <FL label="Icon" />
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:14 }}>
            {EMOJIS.map(em => (
              <TouchableOpacity key={em} onPress={() => setEmoji(em)}
                style={{ width:44, height:44, borderRadius:10, borderWidth:2,
                  borderColor: em===emoji ? colors.accent : 'transparent',
                  backgroundColor: em===emoji ? (colors.isDark ? 'rgba(124,106,245,0.15)' : colors.tint) : colors.glass,
                  alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:20 }}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <FL label="Category" />
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:7, marginBottom:20 }}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c.id} onPress={() => setCat(c.id)}
                style={{ paddingVertical:9, paddingHorizontal:12, borderRadius:11, borderWidth:1,
                  borderColor: cat===c.id ? colors.accent : colors.border,
                  backgroundColor: cat===c.id ? (colors.isDark ? 'rgba(124,106,245,0.12)' : colors.tint) : colors.glass }}>
                <Text style={{ fontSize:13, fontWeight:'600',
                  color: cat===c.id ? colors.accent : colors.text2 }}>{c.emoji} {c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <FL label="Note (optional)" />
          <TextInput value={note} onChangeText={setNote} multiline
            placeholder="Add a note…" placeholderTextColor={colors.text3}
            style={{ ...fi, minHeight:64, textAlignVertical:'top' }} />

          <LinksEditor value={links} onChange={setLinks} />

          <RecurrenceEditor value={recur} onChange={setRecur} />

          <AlertsEditor value={alerts} onChange={setAlerts} />

          <TouchableOpacity onPress={save}
            style={{ backgroundColor:colors.accent, borderRadius:14, padding:15, alignItems:'center', marginBottom:12 }}>
            <Text style={{ color:'#fff', fontSize:15, fontWeight:'700' }}>Save Changes →</Text>
          </TouchableOpacity>

          {/* Move this event into a life log (becomes a future-dated entry;
              single source of truth — the event row is removed). */}
          <Toggle label="📓 Move into a life log" value={attachOpen} onChange={setAttachOpen} />
          {attachOpen && (
            <>
              <LifelogAttachSection ref={attachRef} emoji={emoji} />
              <TouchableOpacity onPress={moveIntoLog}
                style={{ backgroundColor:colors.teal, borderRadius:14, padding:15, alignItems:'center', marginBottom:16 }}>
                <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontSize:15, fontWeight:'700' }}>Move into life log →</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={del}
            style={{ backgroundColor:(colors.isDark ? 'rgba(232,80,122,0.15)' : 'rgba(197,0,26,0.10)'), borderWidth:1,
              borderColor:(colors.isDark ? 'rgba(232,80,122,0.3)' : 'rgba(197,0,26,0.30)'), borderRadius:14, padding:15, alignItems:'center' }}>
            <Text style={{ color:colors.rose, fontSize:15, fontWeight:'700' }}>Delete Event</Text>
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

function Toggle({ label, value, onChange }: { label:string; value:boolean; onChange:(v:boolean)=>void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={() => onChange(!value)}
      style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between',
        backgroundColor:colors.tile, borderWidth:1,
        borderColor:colors.border, borderRadius:11, padding:12, marginBottom:12 }}>
      <Text style={{ fontSize:14, fontWeight:'600', color:colors.text1 }}>{label}</Text>
      <View style={{ width:40, height:22, borderRadius:11,
        backgroundColor: value ? colors.accent : colors.border,
        justifyContent:'center', paddingHorizontal:2 }}>
        <View style={{ width:18, height:18, borderRadius:9, backgroundColor:'#fff',
          alignSelf: value ? 'flex-end' : 'flex-start' }} />
      </View>
    </TouchableOpacity>
  );
}
