import { forwardRef, useImperativeHandle, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from './Toast';
import { useStore } from '../store/useStore';
import { COLLECTION_PRESETS, COUNT_PRESETS, PRESET_BY_ID, presetUniverse } from '../constants/lifelogs';

// Shared "Add to a life log" picker used by BOTH add-event and edit-event.
// Three paths: From a type (preset + optional qualifier), Existing log, Custom.
// Parents drive submission via the imperative handle:
//   describe() → { name, willCreate } (no side effects; for a confirm dialog)
//   resolve()  → { targetId, universe } (creates the log if needed) or null
// The parent then builds the entry and attaches it (single source of truth).

export interface AttachHandle {
  describe: () => { name: string; willCreate: boolean } | null;
  resolve: () => { targetId: string; universe?: string[] } | null;
}

type PathMode = 'preset' | 'existing' | 'custom';

export const LifelogAttachSection = forwardRef<AttachHandle, { emoji: string }>(({ emoji }, ref) => {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const lifelogs  = useStore(s => s.memories).filter(m => m.type === 'lifelog');
  const addMemory = useStore(s => s.addMemory);

  const [pathMode, setPathMode] = useState<PathMode>(lifelogs.length ? 'existing' : 'preset');
  const [selectedPreset,    setSelectedPreset]    = useState<string>('');
  const [presetQualifier,   setPresetQualifier]   = useState<string>('');
  const [presetTargetLogId, setPresetTargetLogId] = useState<string>(''); // '' = create-new
  const [selectedLogId, setSelectedLogId] = useState<string>(lifelogs[0]?.id ?? '');
  const [newLogName,  setNewLogName]  = useState('');
  const [newLogTarget,setNewLogTarget]= useState('');

  const fi = { backgroundColor:colors.glass, borderWidth:1,
    borderColor:colors.border, borderRadius:12, padding:12,
    color:colors.text1, fontSize:15, marginBottom:14 };

  const resolvedPresetName = (pid: string, qualifier: string) => {
    const p = PRESET_BY_ID[pid];
    const q = qualifier.trim();
    return q ? `${p.name} - ${q}` : p.name;
  };
  // Match existing logs on the FULL resolved NAME (the name already encodes the
  // preset via its prefix). Matching on name — not requiring logPreset === pid —
  // is robust to logs whose logPreset is missing/differs (e.g. created via the
  // custom tab, an older build, or lost on a round-trip), so a detached-then-
  // re-attached log is still found.
  const matchesFor = (pid: string, qualifier: string) =>
    pid ? lifelogs.filter(l => l.name === resolvedPresetName(pid, qualifier)) : [];

  function pickPreset(pid: string) {
    setSelectedPreset(pid);
    setPresetQualifier('');
    setPresetTargetLogId(matchesFor(pid, '')[0]?.id ?? '');
  }
  function changeQualifier(q: string) {
    setPresetQualifier(q);
    setPresetTargetLogId(matchesFor(selectedPreset, q)[0]?.id ?? '');
  }

  // Validate the current selection; describe the target WITHOUT side effects.
  type Plan = { name: string; universe?: string[]; existingId?: string; createSpec?: any };
  function plan(): Plan | { error: string } {
    if (pathMode === 'preset') {
      if (!selectedPreset) return { error: 'Pick a life-log type.' };
      const p = PRESET_BY_ID[selectedPreset];
      if (presetTargetLogId) {
        const l = lifelogs.find(x => x.id === presetTargetLogId);
        return { name: l?.name ?? p.name, universe: presetUniverse(l?.logPreset), existingId: presetTargetLogId };
      }
      const finalName = resolvedPresetName(selectedPreset, presetQualifier);
      return { name: finalName, universe: p.universe, createSpec: {
        type: 'lifelog', name: finalName, emoji: p.emoji, originDate: '', yearUnknown: false,
        entries: [], logKind: p.kind, logPreset: p.id, logTarget: p.target, note: '', fav: false, alerts: [],
      } };
    }
    if (pathMode === 'existing') {
      if (!selectedLogId) return { error: 'Pick a life log.' };
      const l = lifelogs.find(x => x.id === selectedLogId);
      return { name: l?.name ?? '', universe: presetUniverse(l?.logPreset), existingId: selectedLogId };
    }
    if (!newLogName.trim()) return { error: 'Name the new life log.' };
    const t = parseInt(newLogTarget, 10);
    return { name: newLogName.trim(), universe: undefined, createSpec: {
      type: 'lifelog', name: newLogName.trim(), emoji, originDate: '', yearUnknown: false,
      entries: [], logKind: t > 0 ? 'collection' : 'count', logTarget: t > 0 ? t : undefined, note: '', fav: false, alerts: [],
    } };
  }

  useImperativeHandle(ref, () => ({
    describe() {
      const p = plan();
      if ('error' in p) { showToast('⚠️', 'Missing info', p.error); return null; }
      return { name: p.name, willCreate: !!p.createSpec };
    },
    resolve() {
      const p = plan();
      if ('error' in p) { showToast('⚠️', 'Missing info', p.error); return null; }
      const targetId = p.existingId ?? addMemory(p.createSpec);
      return { targetId, universe: p.universe };
    },
  }), [pathMode, selectedPreset, presetQualifier, presetTargetLogId, selectedLogId, newLogName, newLogTarget, lifelogs, emoji]);

  // Segments — "Existing log" only when the user has any.
  const segments: { id: PathMode; label: string }[] = [
    { id: 'preset', label: 'From a type' },
    ...(lifelogs.length ? [{ id: 'existing' as PathMode, label: 'Existing log' }] : []),
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <View style={{ marginBottom:14 }}>
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

      {/* PATH 2 — existing log */}
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

      {/* PATH 3 — custom */}
      {pathMode === 'custom' && (
        <>
          <FL label="New life log name" />
          <TextInput value={newLogName} onChangeText={setNewLogName}
            placeholder="e.g. Coffee shops tried" placeholderTextColor={colors.text3} style={fi} />
          <FL label="Target (optional)" />
          <TextInput value={newLogTarget} onChangeText={setNewLogTarget} keyboardType="numeric"
            placeholder="e.g. 50 — leave blank for a simple count" placeholderTextColor={colors.text3} style={fi} />
          <Text style={{ fontSize:11, color:colors.text3, marginTop:-8, marginBottom:8, marginLeft:2 }}>Uses the icon {emoji} as its emoji.</Text>
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
