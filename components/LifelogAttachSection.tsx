import { forwardRef, useImperativeHandle, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from './Toast';
import { useStore } from '../store/useStore';
import { getPreset, presetUniverse } from '../constants/lifelogs';
import { canonItem } from '../utils/lifelog';
import { itemName, itemCityState, locationForName, UniverseItem } from '../lib/universes';
import { PresetBrowser } from './PresetBrowser';

// Shared "Also log this in a Life Log" picker used by BOTH add-event and
// edit-event. Now supports MULTI-SELECT: the user builds a SET of target logs
// (from a type, existing logs, and/or custom-new), and on save the parent
// creates ONE INDEPENDENT entry per selected log. There is no cross-linkage —
// each entry is a normal life-log entry (single source of truth) after creation.
//
// Per-log item resolution lives here:
//   - a log with a bounded universe (collection preset) → the user picks/confirms
//     the universe item for that log (prefilled if the event name matches).
//   - a count log (or custom collection w/o a universe) → item = the event name,
//     editable.
//
// Parents drive submission via the imperative handle:
//   count()    → number of selected logs (gate the button)
//   describe() → { names, createCount } (validated, no side effects; for confirm)
//   resolve()  → [{ targetId, item }] (creates any new logs) or null
// The parent then builds each entry (shared date/note/links/alerts + per-log
// item) and attaches it.

export interface AttachTarget { targetId: string; item: string; city?: string; state?: string; address?: string; }
export interface AttachHandle {
  count: () => number;
  describe: () => { names: string[]; createCount: number } | null;
  resolve: () => AttachTarget[] | null;
}

type PathMode = 'preset' | 'existing' | 'custom';

// One chosen target in the selection set.
interface Sel {
  key: string;               // stable unique key
  targetId?: string;         // existing log id (mutually exclusive with createSpec)
  createSpec?: any;          // spec passed to addMemory() at resolve time
  name: string;
  emoji: string;
  universe?: UniverseItem[]; // bounded set → show the universe item picker
  item: string;              // chosen/typed item
  itemTouched: boolean;      // free-text logs follow the event name until edited
}

// Canonical universe match for a label, or '' when none (forces an explicit pick).
const canonMatch = (universe: UniverseItem[] | undefined, label: string): string => {
  if (!universe) return '';
  const hit = universe.find(u => itemName(u).toLowerCase() === label.trim().toLowerCase());
  return hit ? itemName(hit) : '';
};

export const LifelogAttachSection = forwardRef<AttachHandle, { emoji: string; eventName: string }>(
  ({ emoji, eventName }, ref) => {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const lifelogs  = useStore(s => s.memories).filter(m => m.type === 'lifelog');
  const addMemory = useStore(s => s.addMemory);

  const fi = { backgroundColor:colors.glass, borderWidth:1,
    borderColor:colors.border, borderRadius:12, padding:12,
    color:colors.text1, fontSize:15, marginBottom:14 };

  // Build a Sel for an existing log (prefill its item from the event name).
  const selFromLog = (l: typeof lifelogs[number]): Sel => {
    const universe = presetUniverse(l.logPreset);
    const hasU = !!universe && universe.length > 0;
    return { key: `log:${l.id}`, targetId: l.id, name: l.name, emoji: l.emoji,
      universe: hasU ? universe : undefined,
      item: hasU ? canonMatch(universe, eventName) : eventName.trim(),
      itemTouched: false };
  };

  // Common case stays one-tap: preselect the first existing log.
  const [selected, setSelected] = useState<Sel[]>(() => lifelogs[0] ? [selFromLog(lifelogs[0])] : []);
  const [expandedKey, setExpandedKey] = useState<string>('');   // which universe picker is open
  const [itemQuery, setItemQuery] = useState('');

  const [pathMode, setPathMode] = useState<PathMode>(lifelogs.length ? 'existing' : 'preset');
  const [selectedPreset,    setSelectedPreset]    = useState<string>('');
  const [presetQualifier,   setPresetQualifier]   = useState<string>('');
  const [newLogName,  setNewLogName]  = useState('');
  const [newLogTarget,setNewLogTarget]= useState('');

  const isSelected = (key: string) => selected.some(s => s.key === key);
  const removeSel  = (key: string) => setSelected(prev => prev.filter(s => s.key !== key));
  const addSel     = (s: Sel) => setSelected(prev => prev.some(x => x.key === s.key) ? prev : [...prev, s]);
  const toggleLog  = (l: typeof lifelogs[number]) =>
    isSelected(`log:${l.id}`) ? removeSel(`log:${l.id}`) : addSel(selFromLog(l));

  const setItem = (key: string, item: string, touched = true) =>
    setSelected(prev => prev.map(s => s.key === key ? { ...s, item, itemTouched: touched } : s));

  const resolvedPresetName = (pid: string, qualifier: string) => {
    const nm = getPreset(pid)?.name ?? pid;
    const q = qualifier.trim();
    return q ? `${nm} - ${q}` : nm;
  };
  const matchesFor = (pid: string, qualifier: string) =>
    pid ? lifelogs.filter(l => l.name === resolvedPresetName(pid, qualifier)) : [];

  // Add a brand-new preset log (create-spec) to the selection.
  const addPresetNew = () => {
    const p = getPreset(selectedPreset);
    if (!p) return;
    const finalName = resolvedPresetName(selectedPreset, presetQualifier);
    const universe = p.universe;
    addSel({
      key: `new-preset:${finalName}`, name: finalName, emoji: p.emoji,
      universe: universe && universe.length ? universe : undefined,
      item: universe && universe.length ? canonMatch(universe, eventName) : eventName.trim(),
      itemTouched: false,
      createSpec: { type:'lifelog', name: finalName, emoji: p.emoji, originDate:'', yearUnknown:false,
        entries:[], logKind: p.kind, logPreset: p.id, logTarget: p.target, note:'', fav:false, alerts:[] },
    });
  };

  const addCustomNew = () => {
    if (!newLogName.trim()) { showToast('⚠️', 'Missing info', 'Name the new life log.'); return; }
    const t = parseInt(newLogTarget, 10);
    const nm = newLogName.trim();
    addSel({
      key: `new-custom:${nm}:${Date.now()}`, name: nm, emoji, universe: undefined,
      item: eventName.trim(), itemTouched: false,
      createSpec: { type:'lifelog', name: nm, emoji, originDate:'', yearUnknown:false, entries:[],
        logKind: t > 0 ? 'collection' : 'count', logTarget: t > 0 ? t : undefined, note:'', fav:false, alerts:[] },
    });
    setNewLogName(''); setNewLogTarget('');
  };

  // The value shown/used for a free-text (non-universe) log: follows the event
  // name until the user edits it.
  const freeValue = (s: Sel) => s.itemTouched ? s.item : eventName.trim();

  // Validate the whole selection without side effects.
  function validate(): { error: string } | null {
    if (!selected.length) return { error: 'Pick at least one life log.' };
    for (const s of selected) {
      if (s.universe) { if (!s.item.trim()) return { error: `Pick an item for “${s.name}”.` }; }
      else if (!freeValue(s)) return { error: `Name the entry for “${s.name}”.` };
    }
    return null;
  }

  useImperativeHandle(ref, () => ({
    count: () => selected.length,
    describe() {
      const err = validate();
      if (err) { showToast('⚠️', 'Missing info', err.error); return null; }
      return { names: selected.map(s => s.name), createCount: selected.filter(s => s.createSpec).length };
    },
    resolve() {
      const err = validate();
      if (err) { showToast('⚠️', 'Missing info', err.error); return null; }
      return selected.map(s => {
        const targetId = s.targetId ?? addMemory(s.createSpec);
        const item = s.universe ? canonItem(s.universe, s.item) : freeValue(s);
        // Snapshot the universe item's current location onto the entry.
        const loc = s.universe ? locationForName(s.universe, item) : undefined;
        return { targetId, item, city: loc?.city, state: loc?.state, address: loc?.address };
      });
    },
  }), [selected, eventName, lifelogs]);

  const segments: { id: PathMode; label: string }[] = [
    { id: 'preset', label: 'From a type' },
    ...(lifelogs.length ? [{ id: 'existing' as PathMode, label: 'Existing log' }] : []),
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <View style={{ marginBottom:14 }}>
      {/* ---- Selected set (what will be created) ---- */}
      {selected.length > 0 && (
        <View style={{ marginBottom:14 }}>
          <FL label={`Selected logs · ${selected.length}`} />
          {selected.map(s => (
            <View key={s.key} style={{ backgroundColor:colors.surf, borderWidth:1, borderColor:colors.teal,
              borderRadius:12, padding:10, marginBottom:8 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                <Text style={{ fontSize:18 }}>{s.emoji}</Text>
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:13, fontWeight:'700', color:colors.text1 }} numberOfLines={1}>
                    {s.name}{s.createSpec ? '  ·  new' : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeSel(s.key)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                  <Text style={{ fontSize:15, color:colors.text3 }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Per-log item resolution */}
              {s.universe ? (
                <>
                  <TouchableOpacity
                    onPress={() => { setExpandedKey(expandedKey === s.key ? '' : s.key); setItemQuery(''); }}
                    style={{ marginTop:8, flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                      backgroundColor:colors.glass, borderWidth:1, borderColor:colors.border, borderRadius:10, padding:10 }}>
                    <Text style={{ fontSize:13, fontWeight:'600', color: s.item ? colors.text1 : colors.text3 }}>
                      {s.item || 'Pick an item…'}
                    </Text>
                    <Text style={{ fontSize:13, color:colors.teal, fontWeight:'700' }}>
                      {expandedKey === s.key ? 'Close' : 'Choose ›'}
                    </Text>
                  </TouchableOpacity>
                  {expandedKey === s.key && (
                    <View style={{ marginTop:8 }}>
                      <TextInput value={itemQuery} onChangeText={setItemQuery} placeholder={`Search ${s.name}…`}
                        placeholderTextColor={colors.text3} autoCapitalize="none" autoCorrect={false}
                        style={{ ...fi, marginBottom:8 }} />
                      <ScrollView style={{ maxHeight:200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                        {s.universe
                          .filter(u => {
                            const q = itemQuery.trim().toLowerCase();
                            if (!q) return true;
                            const cs = itemCityState(u).toLowerCase();
                            return itemName(u).toLowerCase().includes(q) || cs.includes(q);
                          })
                          .map(u => {
                            const nm = itemName(u);
                            const cs = itemCityState(u);
                            const sel = s.item === nm;
                            return (
                              <TouchableOpacity key={nm} onPress={() => { setItem(s.key, nm); setExpandedKey(''); }}
                                style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                                  paddingVertical:9, paddingHorizontal:10, borderRadius:8,
                                  backgroundColor: sel ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : 'transparent' }}>
                                <Text style={{ fontSize:13, color: sel ? colors.teal : colors.text1 }}>
                                  {nm}{cs ? <Text style={{ color: colors.text3 }}>{`  ·  ${cs}`}</Text> : null}
                                </Text>
                                {sel && <Text style={{ fontSize:14, color:colors.teal }}>✓</Text>}
                              </TouchableOpacity>
                            );
                          })}
                      </ScrollView>
                    </View>
                  )}
                </>
              ) : (
                <TextInput value={freeValue(s)} onChangeText={t => setItem(s.key, t)}
                  placeholder="Entry name" placeholderTextColor={colors.text3}
                  style={{ ...fi, marginTop:8, marginBottom:0 }} />
              )}
            </View>
          ))}
        </View>
      )}

      {/* ---- Add another log ---- */}
      <FL label={selected.length ? 'Add another log' : 'Choose a log'} />
      <View style={{ flexDirection:'row', gap:6, marginBottom:12 }}>
        {segments.map(seg => {
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

      {/* PATH 1 — preset type + optional qualifier */}
      {pathMode === 'preset' && (
        <>
          <PresetBrowser selectedId={selectedPreset} onSelect={p => { setSelectedPreset(p ? p.id : ''); setPresetQualifier(''); }} />
          {selectedPreset !== '' && (() => {
            const matches = matchesFor(selectedPreset, presetQualifier);
            const finalName = resolvedPresetName(selectedPreset, presetQualifier);
            return (
              <>
                <FL label="Qualifier (optional)" />
                <TextInput value={presetQualifier} onChangeText={setPresetQualifier}
                  placeholder="e.g. Half Dome" placeholderTextColor={colors.text3} style={fi} />
                {matches.map(l => {
                  const on = isSelected(`log:${l.id}`);
                  return (
                    <TouchableOpacity key={l.id} onPress={() => toggleLog(l)}
                      style={{ flexDirection:'row', alignItems:'center', gap:10, padding:10, borderRadius:10, borderWidth:1.5, marginBottom:6,
                        borderColor: on ? colors.teal : colors.border,
                        backgroundColor: on ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.surf }}>
                      <Text style={{ fontSize:16 }}>{l.emoji}</Text>
                      <Text style={{ flex:1, fontSize:13, fontWeight:'600', color: on ? colors.teal : colors.text1 }} numberOfLines={1}>{l.name}</Text>
                      <Text style={{ fontSize:15, color: on ? colors.teal : colors.text3 }}>{on ? '✓' : '+'}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity onPress={addPresetNew}
                  disabled={isSelected(`new-preset:${finalName}`)}
                  style={{ flexDirection:'row', alignItems:'center', gap:10, padding:10, borderRadius:10, borderWidth:1.5, borderStyle:'dashed',
                    borderColor: colors.border, backgroundColor: colors.surf,
                    opacity: isSelected(`new-preset:${finalName}`) ? 0.5 : 1 }}>
                  <Text style={{ fontSize:16 }}>＋</Text>
                  <Text style={{ flex:1, fontSize:13, fontWeight:'600', color: colors.text2 }}>
                    {isSelected(`new-preset:${finalName}`) ? `Added “${finalName}”` : `Create & add “${finalName}”`}
                  </Text>
                </TouchableOpacity>
              </>
            );
          })()}
        </>
      )}

      {/* PATH 2 — existing logs (multi-select toggles) */}
      {pathMode === 'existing' && (
        <View style={{ gap:8 }}>
          {lifelogs.map(l => {
            const on = isSelected(`log:${l.id}`);
            return (
              <TouchableOpacity key={l.id} onPress={() => toggleLog(l)}
                style={{ flexDirection:'row', alignItems:'center', gap:12, padding:12, borderRadius:12, borderWidth:1.5,
                  borderColor: on ? colors.teal : colors.border,
                  backgroundColor: on ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.glass }}>
                <Text style={{ fontSize:20 }}>{l.emoji}</Text>
                <Text style={{ flex:1, fontSize:14, fontWeight:'600', color: on ? colors.teal : colors.text1 }} numberOfLines={1}>{l.name}</Text>
                <Text style={{ fontSize:16, color: on ? colors.teal : colors.text3 }}>{on ? '✓' : '+'}</Text>
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
          <Text style={{ fontSize:11, color:colors.text3, marginTop:-8, marginBottom:8, marginLeft:2 }}>Uses the icon {emoji} as its emoji.</Text>
          <TouchableOpacity onPress={addCustomNew}
            style={{ flexDirection:'row', alignItems:'center', gap:10, padding:11, borderRadius:10, borderWidth:1.5, borderStyle:'dashed',
              borderColor: colors.border, backgroundColor: colors.surf }}>
            <Text style={{ fontSize:16 }}>＋</Text>
            <Text style={{ flex:1, fontSize:13, fontWeight:'600', color: colors.text2 }}>Add new log to selection</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
});

function FL({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize:11, fontWeight:'600', color:colors.text3,
    textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>{label}</Text>;
}
