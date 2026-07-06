import { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useToast } from '../../components/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format, addDays } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { EMOJIS, CATEGORIES } from '../../constants/data';
import { useStore } from '../../store/useStore';
import { Recurrence, Alert as AlertType } from '../../store/types';
import { DateTimeField } from '../../components/DateTimeField';
import { RecurrenceEditor } from '../../components/RecurrenceEditor';
import { AlertsEditor } from '../../components/AlertsEditor';

export default function AddEventModal() {
  const { colors } = useTheme();
  const addEvent    = useStore(s => s.addEvent);
  const addMemory   = useStore(s => s.addMemory);
  const addLogEntry = useStore(s => s.addLogEntry);
  const lifelogs    = useStore(s => s.memories).filter(m => m.type === 'lifelog');
  const { showToast } = useToast();
  const defaultDay = format(addDays(new Date(), 30), 'yyyy-MM-dd');
  const [name,    setName]    = useState('');
  const [allDay,  setAllDay]  = useState(true);
  const [start,   setStart]   = useState(`${defaultDay}T09:00:00`);
  const [end,     setEnd]     = useState(`${defaultDay}T10:00:00`);
  const [emoji,   setEmoji]   = useState('🎉');
  const [cat,     setCat]     = useState('parties');
  const [note,   setNote]   = useState('');
  const [recur,  setRecur]  = useState<Recurrence | null>(null);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  // "Also log this in a Life Log" — turns the countdown into a future-dated
  // life-log ENTRY (the single source of truth; no separate event row).
  const [attachLog,   setAttachLog]   = useState(false);
  const [logId,       setLogId]       = useState<string>(''); // '' = create new
  const [newLogName,  setNewLogName]  = useState('');
  const [newLogTarget,setNewLogTarget]= useState('');

  function submit() {
    if (!name.trim()) { showToast('⚠️', 'Missing info', 'Please enter a name.'); return; }
    const startIso = allDay ? `${start.slice(0, 10)}T00:00:00` : start;

    if (attachLog) {
      // ONE source of truth: add a future-dated entry to the chosen life log.
      // No standalone event is created — the entry graduates automatically once
      // its date passes (it stops being "future").
      let targetId = logId;
      if (!targetId) {
        if (!newLogName.trim()) { showToast('⚠️', 'Missing info', 'Name the new life log.'); return; }
        const t = parseInt(newLogTarget, 10);
        targetId = addMemory({
          type: 'lifelog', name: newLogName.trim(), emoji, originDate: '',
          yearUnknown: false, entries: [],
          logKind: t > 0 ? 'collection' : 'count',
          logTarget: t > 0 ? t : undefined,
          note: '', fav: false, alerts: [],
        });
      }
      addLogEntry(targetId, { date: startIso.slice(0, 10), note: note.trim(), item: name.trim(), datePrecision: 'full' });
      router.back();
      return;
    }

    addEvent({
      name: name.trim(), emoji, cat: cat as any,
      allDay, start: startIso, end: allDay ? null : end, date: startIso.slice(0, 10), fav: false,
      note: note.trim(), recur, alerts,
    });
    router.back();
  }

  const fi = { backgroundColor:colors.glass, borderWidth:1,
    borderColor:colors.border, borderRadius:12, padding:12,
    color:colors.text1, fontSize:15, marginBottom:14 };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2 }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ width:40, height:4, backgroundColor:colors.border,
          borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between',
          alignItems:'center', paddingHorizontal:20, paddingVertical:12 }}>
          <Text style={{ fontSize:18, fontWeight:'700', color:colors.text1 }}>New Countdown</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize:16, color:colors.text3 }}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding:20 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <FL label="Event Name" />
          <TextInput value={name} onChangeText={setName}
            placeholder="e.g. Summer vacation…" placeholderTextColor={colors.text3} style={fi} />

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
                  borderColor: em === emoji ? colors.accent : 'transparent',
                  backgroundColor: em === emoji ? (colors.isDark ? 'rgba(124,106,245,0.15)' : colors.tint) : colors.glass,
                  alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:20 }}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!attachLog && (
            <>
              <FL label="Category" />
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:7, marginBottom:14 }}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity key={c.id} onPress={() => setCat(c.id)}
                    style={{ paddingVertical:9, paddingHorizontal:12, borderRadius:11, borderWidth:1,
                      borderColor: cat === c.id ? colors.accent : colors.border,
                      backgroundColor: cat === c.id ? (colors.isDark ? 'rgba(124,106,245,0.12)' : colors.tint) : colors.glass }}>
                    <Text style={{ fontSize:13, fontWeight:'600',
                      color: cat === c.id ? colors.accent : colors.text2 }}>{c.emoji} {c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <FL label="Note (optional)" />
          <TextInput value={note} onChangeText={setNote} multiline
            placeholder="Add a note…" placeholderTextColor={colors.text3}
            style={{ ...fi, minHeight:64, textAlignVertical:'top' }} />

          {/* Graduate into a life log: counts down now, becomes a completed
              entry once its date passes. When on, we create a life-log entry
              instead of a standalone event. */}
          <Toggle label="📓 Also log this in a Life Log" value={attachLog} onChange={setAttachLog} />
          {attachLog && (
            <View style={{ marginBottom:14 }}>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:7, marginBottom:10 }}>
                {lifelogs.map(l => {
                  const sel = logId === l.id;
                  return (
                    <TouchableOpacity key={l.id} onPress={() => setLogId(l.id)}
                      style={{ flexDirection:'row', alignItems:'center', gap:6, paddingVertical:8, paddingHorizontal:11,
                        borderRadius:11, borderWidth:1.5,
                        borderColor: sel ? colors.teal : colors.border,
                        backgroundColor: sel ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.glass }}>
                      <Text style={{ fontSize:15 }}>{l.emoji}</Text>
                      <Text style={{ fontSize:12, fontWeight:'600', color: sel ? colors.teal : colors.text2 }}>{l.name}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity onPress={() => setLogId('')}
                  style={{ flexDirection:'row', alignItems:'center', gap:6, paddingVertical:8, paddingHorizontal:11,
                    borderRadius:11, borderWidth:1.5,
                    borderColor: logId === '' ? colors.teal : colors.border,
                    backgroundColor: logId === '' ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.glass }}>
                  <Text style={{ fontSize:15 }}>＋</Text>
                  <Text style={{ fontSize:12, fontWeight:'600', color: logId === '' ? colors.teal : colors.text2 }}>New life log</Text>
                </TouchableOpacity>
              </View>
              {logId === '' && (
                <>
                  <FL label="New life log name" />
                  <TextInput value={newLogName} onChangeText={setNewLogName}
                    placeholder="e.g. Countries Visited" placeholderTextColor={colors.text3} style={fi} />
                  <FL label="Target (optional)" />
                  <TextInput value={newLogTarget} onChangeText={setNewLogTarget} keyboardType="numeric"
                    placeholder="e.g. 195 — leave blank for a simple count" placeholderTextColor={colors.text3} style={fi} />
                </>
              )}
              <Text style={{ fontSize:12, color:colors.text3, marginLeft:2 }}>
                Logs “{name.trim() || '…'}” on {allDay ? start.slice(0,10) : start.slice(0,10)}. It counts down until then, then reads as completed.
              </Text>
            </View>
          )}

          {/* Event-only fields hidden when graduating into a life log. */}
          {!attachLog && (
            <>
              <RecurrenceEditor value={recur} onChange={setRecur} />
              <AlertsEditor value={alerts} onChange={setAlerts} />
            </>
          )}

          <TouchableOpacity onPress={submit}
            style={{ backgroundColor:colors.accent, borderRadius:14,
              padding:15, alignItems:'center', marginTop:8 }}>
            <Text style={{ color:'#fff', fontSize:15, fontWeight:'700' }}>
              {attachLog ? 'Add to Life Log →' : 'Add Countdown →'}
            </Text>
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
