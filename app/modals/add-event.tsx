import { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useToast } from '../../components/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format, addDays } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { EMOJIS, CATEGORIES } from '../../constants/data';
import { COLLECTION_PRESETS, COUNT_PRESETS, PRESET_BY_ID, presetUniverse } from '../../constants/lifelogs';
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
  // life-log ENTRY (the single source of truth; no separate event row). Three
  // paths: pick a PRESET type, an EXISTING log, or a CUSTOM new one.
  const [attachLog, setAttachLog] = useState(false);
  const [pathMode, setPathMode]   = useState<'preset' | 'existing' | 'custom'>(lifelogs.length ? 'existing' : 'preset');
  const [selectedPreset,    setSelectedPreset]    = useState<string>(''); // preset path
  const [presetQualifier,   setPresetQualifier]   = useState<string>(''); // optional "sub-log" qualifier
  const [presetTargetLogId, setPresetTargetLogId] = useState<string>(''); // '' = new of that preset, else an existing match
  const [selectedLogId, setSelectedLogId] = useState<string>(lifelogs[0]?.id ?? '');
  const [newLogName,  setNewLogName]  = useState('');
  const [newLogTarget,setNewLogTarget]= useState('');

  // The resolved life-log name: preset name, or "<preset> - <qualifier>" when
  // a qualifier is given (e.g. "Hikes Completed - Half Dome").
  const resolvedPresetName = (pid: string, qualifier: string) => {
    const p = PRESET_BY_ID[pid];
    const q = qualifier.trim();
    return q ? `${p.name} - ${q}` : p.name;
  };
  // Existing logs matching the FULL resolved name (so general vs qualified logs
  // are distinct: "Hikes Completed" ≠ "Hikes Completed - Half Dome").
  const matchesFor = (pid: string, qualifier: string) =>
    pid ? lifelogs.filter(l => l.logPreset === pid && l.name === resolvedPresetName(pid, qualifier)) : [];

  function pickPreset(pid: string) {
    setSelectedPreset(pid);
    setPresetQualifier('');
    // If a general log of this preset already exists, default to adding to it.
    setPresetTargetLogId(matchesFor(pid, '')[0]?.id ?? '');
  }
  function changeQualifier(q: string) {
    setPresetQualifier(q);
    // Re-resolve matches for the new name; default to the match (or create-new).
    setPresetTargetLogId(matchesFor(selectedPreset, q)[0]?.id ?? '');
  }
  // For a collection, snap the entry name to the universe's canonical spelling
  // (e.g. "france" → "France") when it matches; otherwise keep it as a label.
  function canonItem(universe: string[] | undefined, label: string): string {
    if (!universe) return label;
    return universe.find(u => u.toLowerCase() === label.toLowerCase()) ?? label;
  }

  function submit() {
    if (!name.trim()) { showToast('⚠️', 'Missing info', 'Please enter a name.'); return; }
    const startIso = allDay ? `${start.slice(0, 10)}T00:00:00` : start;

    if (attachLog) {
      // ONE source of truth: add a future-dated entry to the chosen life log.
      // No standalone event is created — the entry graduates automatically once
      // its date passes (it stops being "future").
      let targetId: string;
      let universe: string[] | undefined;

      if (pathMode === 'preset') {
        if (!selectedPreset) { showToast('⚠️', 'Missing info', 'Pick a life-log type.'); return; }
        const p = PRESET_BY_ID[selectedPreset];
        if (presetTargetLogId) {
          // Attach to an existing (general or qualified) log of this preset.
          targetId = presetTargetLogId;
          universe = presetUniverse(lifelogs.find(l => l.id === presetTargetLogId)?.logPreset);
        } else {
          // Create a fresh log from the preset, applying the optional qualifier.
          // A qualified log keeps the preset's kind/universe/target/emoji.
          targetId = addMemory({
            type: 'lifelog', name: resolvedPresetName(selectedPreset, presetQualifier), emoji: p.emoji, originDate: '',
            yearUnknown: false, entries: [],
            logKind: p.kind, logPreset: p.id, logTarget: p.target,
            note: '', fav: false, alerts: [],
          });
          universe = p.universe;
        }
      } else if (pathMode === 'existing') {
        if (!selectedLogId) { showToast('⚠️', 'Missing info', 'Pick a life log.'); return; }
        targetId = selectedLogId;
        universe = presetUniverse(lifelogs.find(l => l.id === selectedLogId)?.logPreset);
      } else {
        if (!newLogName.trim()) { showToast('⚠️', 'Missing info', 'Name the new life log.'); return; }
        const t = parseInt(newLogTarget, 10);
        targetId = addMemory({
          type: 'lifelog', name: newLogName.trim(), emoji, originDate: '',
          yearUnknown: false, entries: [],
          logKind: t > 0 ? 'collection' : 'count',
          logTarget: t > 0 ? t : undefined,
          note: '', fav: false, alerts: [],
        });
        universe = undefined;
      }

      addLogEntry(targetId, { date: startIso.slice(0, 10), note: note.trim(), item: canonItem(universe, name.trim()), datePrecision: 'full' });
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
              {/* Segmented control: three ways to choose the target log. */}
              <View style={{ flexDirection:'row', gap:6, marginBottom:12 }}>
                {([
                  { id:'preset',   label:'From a type' },
                  ...(lifelogs.length ? [{ id:'existing', label:'Existing log' }] : []),
                  { id:'custom',   label:'Custom' },
                ] as { id: typeof pathMode; label: string }[]).map(seg => {
                  const sel = pathMode === seg.id;
                  return (
                    <TouchableOpacity key={seg.id} onPress={() => setPathMode(seg.id)}
                      style={{ flex:1, paddingVertical:9, borderRadius:10, borderWidth:1.5, alignItems:'center',
                        borderColor: sel ? colors.teal : colors.border,
                        backgroundColor: sel ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.glass }}>
                      <Text style={{ fontSize:12, fontWeight:'700', color: sel ? colors.teal : colors.text2 }}>{seg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* PATH 1 — from a preset type */}
              {pathMode === 'preset' && (
                <>
                  <FL label="Collections" />
                  <View style={{ flexDirection:'row', flexWrap:'wrap', gap:7, marginBottom:12 }}>
                    {COLLECTION_PRESETS.map(p => (
                      <PresetChip key={p.id} p={p} selected={selectedPreset===p.id} onPress={() => pickPreset(p.id)} />
                    ))}
                  </View>
                  <FL label="Counts" />
                  <View style={{ flexDirection:'row', flexWrap:'wrap', gap:7, marginBottom:12 }}>
                    {COUNT_PRESETS.map(p => (
                      <PresetChip key={p.id} p={p} selected={selectedPreset===p.id} onPress={() => pickPreset(p.id)} />
                    ))}
                  </View>

                  {/* Optional qualifier → a specific sub-log of the same type. */}
                  {selectedPreset !== '' && (() => {
                    const matches = matchesFor(selectedPreset, presetQualifier);
                    const finalName = resolvedPresetName(selectedPreset, presetQualifier);
                    return (
                      <>
                        <FL label="Qualifier (optional)" />
                        <TextInput value={presetQualifier} onChangeText={changeQualifier}
                          placeholder="e.g. Half Dome" placeholderTextColor={colors.text3} style={fi} />
                        <Text style={{ fontSize:11, color:colors.text3, marginTop:-8, marginBottom:10, marginLeft:2 }}>
                          Leave blank for a general log, or name a specific one. Creates “{finalName}”.
                        </Text>

                        {/* Existing-vs-new prompt when a log with this exact name exists. */}
                        {matches.length > 0 && (
                          <View style={{ backgroundColor:colors.glass, borderWidth:1, borderColor:colors.border, borderRadius:12, padding:12, marginBottom:6 }}>
                            <Text style={{ fontSize:12, color:colors.text2, marginBottom:8 }}>
                              You already have this one — add to it, or start a new one?
                            </Text>
                            {matches.map(l => {
                              const sel = presetTargetLogId === l.id;
                              return (
                                <TouchableOpacity key={l.id} onPress={() => setPresetTargetLogId(l.id)}
                                  style={{ flexDirection:'row', alignItems:'center', gap:10, padding:10, borderRadius:10, borderWidth:1.5, marginBottom:6,
                                    borderColor: sel ? colors.teal : colors.border,
                                    backgroundColor: sel ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.surf }}>
                                  <Text style={{ fontSize:16 }}>{l.emoji}</Text>
                                  <Text style={{ flex:1, fontSize:13, fontWeight:'600', color: sel ? colors.teal : colors.text1 }} numberOfLines={1}>Add to “{l.name}”</Text>
                                  {sel && <Text style={{ fontSize:15, color:colors.teal }}>✓</Text>}
                                </TouchableOpacity>
                              );
                            })}
                            <TouchableOpacity onPress={() => setPresetTargetLogId('')}
                              style={{ flexDirection:'row', alignItems:'center', gap:10, padding:10, borderRadius:10, borderWidth:1.5, borderStyle:'dashed',
                                borderColor: presetTargetLogId === '' ? colors.teal : colors.border,
                                backgroundColor: presetTargetLogId === '' ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.surf }}>
                              <Text style={{ fontSize:16 }}>＋</Text>
                              <Text style={{ flex:1, fontSize:13, fontWeight:'600', color: presetTargetLogId === '' ? colors.teal : colors.text2 }}>Create a new “{finalName}”</Text>
                              {presetTargetLogId === '' && <Text style={{ fontSize:15, color:colors.teal }}>✓</Text>}
                            </TouchableOpacity>
                          </View>
                        )}
                      </>
                    );
                  })()}
                </>
              )}

              {/* PATH 2 — an existing life log */}
              {pathMode === 'existing' && (
                <View style={{ gap:8 }}>
                  {lifelogs.map(l => {
                    const sel = selectedLogId === l.id;
                    return (
                      <TouchableOpacity key={l.id} onPress={() => setSelectedLogId(l.id)}
                        style={{ flexDirection:'row', alignItems:'center', gap:12, padding:12, borderRadius:12, borderWidth:1.5,
                          borderColor: sel ? colors.teal : colors.border,
                          backgroundColor: sel ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.glass }}>
                        <Text style={{ fontSize:20 }}>{l.emoji}</Text>
                        <Text style={{ flex:1, fontSize:14, fontWeight:'600', color: sel ? colors.teal : colors.text1 }} numberOfLines={1}>{l.name}</Text>
                        {sel && <Text style={{ fontSize:16, color:colors.teal }}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* PATH 3 — custom new log */}
              {pathMode === 'custom' && (
                <>
                  <FL label="New life log name" />
                  <TextInput value={newLogName} onChangeText={setNewLogName}
                    placeholder="e.g. Coffee shops tried" placeholderTextColor={colors.text3} style={fi} />
                  <FL label="Target (optional)" />
                  <TextInput value={newLogTarget} onChangeText={setNewLogTarget} keyboardType="numeric"
                    placeholder="e.g. 50 — leave blank for a simple count" placeholderTextColor={colors.text3} style={fi} />
                  <Text style={{ fontSize:11, color:colors.text3, marginTop:-8, marginBottom:8, marginLeft:2 }}>Uses the event icon {emoji} as its emoji.</Text>
                </>
              )}

              <Text style={{ fontSize:12, color:colors.text3, marginTop:6, marginLeft:2 }}>
                Logs “{name.trim() || '…'}” on {start.slice(0,10)}. It counts down until then, then reads as completed.
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

function PresetChip({ p, selected, onPress }:
  { p: { id: string; name: string; emoji: string }; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress}
      style={{ flexDirection:'row', alignItems:'center', gap:6, paddingVertical:8, paddingHorizontal:11,
        borderRadius:11, borderWidth:1.5,
        borderColor: selected ? colors.teal : colors.border,
        backgroundColor: selected ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.glass }}>
      <Text style={{ fontSize:15 }}>{p.emoji}</Text>
      <Text style={{ fontSize:12, fontWeight:'600', color: selected ? colors.teal : colors.text2 }}>{p.name}</Text>
    </TouchableOpacity>
  );
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
