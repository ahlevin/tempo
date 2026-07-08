import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { CloseButton } from '../../components/CloseButton';
import { useStore } from '../../store/useStore';
import { DatePrecision, Link, Alert as AlertType } from '../../store/types';
import { DateTimeField } from '../../components/DateTimeField';
import { LinksEditor } from '../../components/LinksEditor';
import { AlertsEditor } from '../../components/AlertsEditor';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { logUniverse, isCollectionLog, isUpcomingEntry } from '../../utils/lifelog';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PRECISIONS: { id: DatePrecision; label: string }[] = [
  { id:'full',  label:'Full date' },
  { id:'month', label:'Month + year' },
  { id:'year',  label:'Year only' },
  { id:'none',  label:'No date' },
];

export default function LogEntryModal() {
  const { colors } = useTheme();
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const memories       = useStore(s => s.memories);
  const addLogEntry    = useStore(s => s.addLogEntry);
  const updateLogEntry = useStore(s => s.updateLogEntry);
  const detachEntryToEvent = useStore(s => s.detachEntryToEvent);
  const deleteLogEntry = useStore(s => s.deleteLogEntry);
  const confirm = useConfirm();
  const { showToast } = useToast();
  const m = memories.find(x => x.id === id);

  const editIndex = edit != null && edit !== '' ? parseInt(edit, 10) : -1;
  const isEdit = editIndex >= 0;
  const editing = m && isEdit ? m.entries[editIndex] : undefined;

  const universe = m ? logUniverse(m) : undefined;
  const isPicker = !!m && isCollectionLog(m) && !!universe;

  const now = new Date();
  const initPrec = editing?.datePrecision ?? 'full';
  const [precision, setPrecision] = useState<DatePrecision>(initPrec);
  const [usePast, setUsePast] = useState(isEdit ? (initPrec === 'full' && !!editing?.date) : false);
  const [date,  setDate]  = useState(editing?.date && initPrec === 'full' ? editing.date : format(now, 'yyyy-MM-dd'));
  const [year,  setYear]  = useState(editing?.date ? editing.date.slice(0, 4) : String(now.getFullYear()));
  const [month, setMonth] = useState(editing?.date && editing.date.length >= 7 ? parseInt(editing.date.slice(5, 7), 10) - 1 : now.getMonth());
  const [note,  setNote]  = useState(editing?.note ?? '');
  const [links, setLinks] = useState<Link[]>(editing?.links ?? []);
  const [alerts, setAlerts] = useState<AlertType[]>(editing?.alerts ?? []);
  // Reminders only make sense for an UPCOMING (future-dated) entry being edited.
  const showAlerts = isEdit && !!editing && isUpcomingEntry(editing);
  const [label, setLabel] = useState(!isPicker ? (editing?.item ?? '') : ''); // count/custom label
  const [item,  setItem]  = useState(isPicker ? (editing?.item ?? '') : '');  // collection item
  const [query, setQuery] = useState('');
  const [addedCount, setAddedCount] = useState(0);

  // Remaining = universe minus already-logged, but the entry being edited keeps its own item.
  const remaining = useMemo(() => {
    if (!isPicker || !universe || !m) return [];
    const logged = new Set(m.entries.map(e => e.item).filter(Boolean));
    if (editing?.item) logged.delete(editing.item);
    const q = query.trim().toLowerCase();
    return universe.filter(x => !logged.has(x) && (!q || x.toLowerCase().includes(q)));
  }, [isPicker, universe, m, query, editing]);

  const fi = { backgroundColor:colors.glass, borderWidth:1,
    borderColor:colors.border, borderRadius:12, padding:12,
    color:colors.text1, fontSize:15, marginBottom:14 };

  if (!m) { router.back(); return null; }

  const loggedCount = isPicker ? new Set(m.entries.map(e => e.item).filter(Boolean)).size : m.entries.length;
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const y4 = /^\d{4}$/.test(year) ? year : String(now.getFullYear());

  // Build the stored date at the chosen precision (unknown parts default to 01).
  function buildDate(): string {
    if (precision === 'none')  return '';
    if (precision === 'year')  return `${y4}-01-01`;
    if (precision === 'month') return `${y4}-${pad2(month + 1)}-01`;
    return usePast ? date : format(new Date(), 'yyyy-MM-dd');
  }

  function entryPayload() {
    const chosenItem = isPicker ? item : label.trim();
    return { date: buildDate(), note: note.trim(), datePrecision: precision,
      item: chosenItem || undefined, links, alerts };
  }

  // Add (count / custom collection): create then close.
  function logCount() {
    addLogEntry(id, entryPayload());
    router.back();
  }
  // Add (collection w/ universe): log the item and STAY (multi-add); the list
  // recomputes from the store so the item drops off (no duplicates).
  function addOne() {
    if (!item) return;
    addLogEntry(id, entryPayload());
    setAddedCount(c => c + 1);
    setItem(''); setNote(''); setQuery(''); setLinks([]); setAlerts([]);
  }
  // Edit an existing entry.
  function saveEdit() {
    if (isPicker && !item) return;
    updateLogEntry(id, editIndex, entryPayload());
    router.back();
  }
  // Detach an upcoming (attached) entry back into a standalone event.
  async function detach() {
    const ok = await confirm({ title: 'Remove from life log?',
      message: `"${editing?.item || m!.name}" becomes a standalone countdown event again. Its date and note are kept; nothing is deleted.`,
      confirmLabel: 'Remove' });
    if (ok) {
      const newId = detachEntryToEvent(id, editIndex);
      if (newId) showToast('📅', 'Back on Countdowns', `"${editing?.item || m!.name}" is a standalone countdown again.`);
      router.back();
    }
  }
  // Delete an attached upcoming item outright — one confirm, gone from BOTH
  // Countdowns and the life log (they're the same underlying entry). No detach
  // step: there is no standalone event to clean up, only this entry.
  async function deleteEntry() {
    const ok = await confirm({ title: `Delete "${editing?.item || m!.name}"?`,
      message: 'This removes it from Countdowns and its life log. This cannot be undone.',
      confirmLabel: 'Delete', destructive: true });
    if (ok) { deleteLogEntry(id, editIndex); router.back(); }
  }
  // Only upcoming (future-dated) entries can be detached back to an event.
  const canDetach = isEdit && !!editing && isUpcomingEntry(editing);

  const headerTitle = isEdit ? 'Edit entry' : (isPicker ? 'Add to' : 'Log') + `: ${m.emoji} ${m.name}`;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2 }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ width:40, height:4, backgroundColor:colors.border,
          borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between',
          alignItems:'center', paddingHorizontal:20, paddingVertical:12 }}>
          <Text style={{ fontSize:18, fontWeight:'700', color:colors.text1 }} numberOfLines={1}>
            {headerTitle}
          </Text>
          <CloseButton />
        </View>

        <ScrollView contentContainerStyle={{ padding:20 }} keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {isPicker && universe && (
            <>
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <Text style={{ fontSize:11, fontWeight:'600', color:colors.text3,
                  textTransform:'uppercase', letterSpacing:0.5 }}>
                  {isEdit ? 'Change item' : 'Pick one'} · {loggedCount} of {universe.length} logged
                </Text>
                {addedCount > 0 && (
                  <View style={{ backgroundColor: colors.isDark ? 'rgba(62,207,178,0.16)' : colors.tint, borderRadius:10, paddingVertical:3, paddingHorizontal:9 }}>
                    <Text style={{ fontSize:11, fontWeight:'700', color:colors.teal }}>{addedCount} added</Text>
                  </View>
                )}
              </View>
              <TextInput value={query} onChangeText={setQuery}
                placeholder="Search…" placeholderTextColor={colors.text3} style={fi} />
              <View style={{ maxHeight:240, borderWidth:1, borderColor:colors.border, borderRadius:12,
                overflow:'hidden', marginBottom:14 }}>
                <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                  {remaining.length === 0 ? (
                    <Text style={{ fontSize:13, color:colors.text3, padding:14 }}>
                      {query ? 'No matches.' : 'All logged — nothing left! 🎉'}
                    </Text>
                  ) : remaining.map((x, i) => {
                    const sel = item === x;
                    return (
                      <TouchableOpacity key={x} onPress={() => setItem(x)}
                        style={{ padding:12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor:colors.border,
                          backgroundColor: sel ? (colors.isDark ? 'rgba(62,207,178,0.14)' : colors.tint) : 'transparent' }}>
                        <Text style={{ fontSize:14, fontWeight: sel ? '700' : '500',
                          color: sel ? colors.teal : colors.text1 }}>
                          {sel ? '✓ ' : ''}{x}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </>
          )}

          {/* Count / custom-collection: optional Name / Label (e.g. "Mission Peak"). */}
          {!isPicker && (
            <>
              <Text style={{ fontSize:11, fontWeight:'600', color:colors.text3,
                textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Name / label (optional)</Text>
              <TextInput value={label} onChangeText={setLabel}
                placeholder="e.g. Mission Peak" placeholderTextColor={colors.text3} style={fi} />
            </>
          )}

          <Text style={{ fontSize:11, fontWeight:'600', color:colors.text3,
            textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Date</Text>
          {/* Precision chooser — supports back-filling partial or unknown dates. */}
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:7, marginBottom:12 }}>
            {PRECISIONS.map(p => {
              const sel = precision === p.id;
              return (
                <TouchableOpacity key={p.id} onPress={() => setPrecision(p.id)}
                  style={{ paddingVertical:8, paddingHorizontal:12, borderRadius:10, borderWidth:1.5,
                    borderColor: sel ? colors.teal : colors.border,
                    backgroundColor: sel ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.glass }}>
                  <Text style={{ fontSize:12, fontWeight:'600', color: sel ? colors.teal : colors.text2 }}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {precision === 'full' && (
            <>
              <View style={{ flexDirection:'row', gap:8, marginBottom:14 }}>
                {[{l:'Today',v:false},{l:'Past date',v:true}].map(opt => (
                  <TouchableOpacity key={String(opt.v)} onPress={() => setUsePast(opt.v)}
                    style={{ flex:1, padding:10, borderRadius:9, borderWidth:1.5,
                      borderColor: usePast===opt.v ? colors.teal : colors.border,
                      backgroundColor: usePast===opt.v ? (colors.isDark ? 'rgba(62,207,178,0.1)' : colors.tint) : colors.glass,
                      alignItems:'center' }}>
                    <Text style={{ fontSize:13, fontWeight:'600',
                      color: usePast===opt.v ? colors.teal : colors.text2 }}>{opt.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {usePast && <DateTimeField mode="date" value={date} onChange={setDate} />}
            </>
          )}

          {precision === 'month' && (
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:14 }}>
              {MONTHS.map((mo, i) => {
                const sel = month === i;
                return (
                  <TouchableOpacity key={mo} onPress={() => setMonth(i)}
                    style={{ width:'22%', paddingVertical:9, borderRadius:9, borderWidth:1, alignItems:'center',
                      borderColor: sel ? colors.teal : colors.border,
                      backgroundColor: sel ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.glass }}>
                    <Text style={{ fontSize:12, fontWeight:'600', color: sel ? colors.teal : colors.text2 }}>{mo}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {(precision === 'month' || precision === 'year') && (
            <TextInput value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4}
              placeholder="Year (e.g. 2019)" placeholderTextColor={colors.text3} style={fi} />
          )}

          <Text style={{ fontSize:11, fontWeight:'600', color:colors.text3,
            textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>
            Note (optional)
          </Text>
          <TextInput value={note} onChangeText={setNote}
            placeholder="How was it?…" placeholderTextColor={colors.text3} style={fi} />

          <LinksEditor key={addedCount} value={links} onChange={setLinks} />

          {showAlerts && <AlertsEditor value={alerts} onChange={setAlerts} />}

          {isEdit ? (
            <>
              <TouchableOpacity onPress={saveEdit} disabled={isPicker && !item}
                style={{ backgroundColor:colors.teal, borderRadius:14, padding:15, alignItems:'center', opacity: (isPicker && !item) ? 0.5 : 1, marginBottom: canDetach ? 10 : 0 }}>
                <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontSize:15, fontWeight:'700' }}>Save changes</Text>
              </TouchableOpacity>
              {canDetach && (
                <TouchableOpacity onPress={detach}
                  style={{ backgroundColor:colors.glass, borderWidth:1, borderColor:colors.border,
                    borderRadius:14, padding:15, alignItems:'center', marginBottom:10 }}>
                  <Text style={{ color:colors.text1, fontSize:15, fontWeight:'700' }}>Remove from life log</Text>
                </TouchableOpacity>
              )}
              {canDetach && (
                <TouchableOpacity onPress={deleteEntry}
                  style={{ backgroundColor:(colors.isDark ? 'rgba(232,80,122,0.15)' : 'rgba(197,0,26,0.10)'),
                    borderWidth:1, borderColor:(colors.isDark ? 'rgba(232,80,122,0.4)' : 'rgba(197,0,26,0.25)'),
                    borderRadius:14, padding:15, alignItems:'center' }}>
                  <Text style={{ color:colors.rose, fontSize:15, fontWeight:'700' }}>Delete</Text>
                </TouchableOpacity>
              )}
            </>
          ) : isPicker ? (
            <>
              {/* Add-another loop: logs the selected item and stays in the picker. */}
              <TouchableOpacity onPress={addOne} disabled={!item}
                style={{ backgroundColor:colors.teal, borderRadius:14, padding:15, alignItems:'center',
                  opacity: item ? 1 : 0.5, marginBottom:10 }}>
                <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontSize:15, fontWeight:'700' }}>
                  {item ? `Add ${item} · add another` : 'Pick an item above'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.back()}
                style={{ backgroundColor:colors.glass, borderWidth:1, borderColor:colors.border,
                  borderRadius:14, padding:15, alignItems:'center' }}>
                <Text style={{ color:colors.text1, fontSize:15, fontWeight:'700' }}>
                  {addedCount > 0 ? `Done · ${addedCount} added` : 'Done'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={logCount}
              style={{ backgroundColor:colors.teal, borderRadius:14, padding:15, alignItems:'center' }}>
              <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontSize:15, fontWeight:'700' }}>Log It →</Text>
            </TouchableOpacity>
          )}
          <View style={{ height:40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
