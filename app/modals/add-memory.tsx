import { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useToast } from '../../components/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { format, subDays } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { CloseButton } from '../../components/CloseButton';
import { MEM_EMOJIS, MEMORY_TYPES } from '../../constants/data';
import { useStore } from '../../store/useStore';
import { Alert as AlertType, Link } from '../../store/types';
import { DateTimeField } from '../../components/DateTimeField';
import { AlertsEditor } from '../../components/AlertsEditor';
import { LinksEditor } from '../../components/LinksEditor';
import { Toggle } from '../../components/FormControls';
import { COLLECTION_PRESETS, COUNT_PRESETS, PRESET_BY_ID } from '../../constants/lifelogs';

const DATE_LABELS: Record<string,string> = {
  birthday:'Date of Birth', anniversary:'Anniversary Date',
  memorial:'Date to Remember', lifelog:'First Occurrence'
};
const DEF_EMOJIS: Record<string,string> = {
  birthday:'🎂', anniversary:'💑', memorial:'🕊️', lifelog:'🏔️'
};
const MEM_TYPE_IDS = ['birthday', 'anniversary', 'memorial', 'lifelog'];

export default function AddMemoryModal() {
  const { colors } = useTheme();
  const addMemory = useStore(s => s.addMemory);
  const { showToast } = useToast();
  // Preselect the type when the add-chooser routes here with ?type=birthday etc.
  const { type: typeParam } = useLocalSearchParams<{ type?: string }>();
  const initialType = typeParam && MEM_TYPE_IDS.includes(typeParam) ? typeParam : 'birthday';
  const [type,  setType]  = useState(initialType);
  const [name,  setName]  = useState('');
  const [date,  setDate]  = useState(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
  const [emoji, setEmoji] = useState(DEF_EMOJIS[initialType] || '⭐');
  const [note,  setNote]  = useState('');
  const [yearUnknown, setYearUnknown] = useState(false);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [links,  setLinks]  = useState<Link[]>([]);
  // Life-log shaping. preset='' means Custom (name it yourself; optional target).
  const [preset, setPreset] = useState<string>('');
  const [customTarget, setCustomTarget] = useState('');

  function pickPreset(id: string) {
    setPreset(id);
    const p = PRESET_BY_ID[id];
    if (p) { setName(p.name); setEmoji(p.emoji); }
  }
  function pickCustom() { setPreset(''); }

  const fi = { backgroundColor:colors.glass, borderWidth:1,
    borderColor:colors.border, borderRadius:12, padding:12,
    color:colors.text1, fontSize:15, marginBottom:14 };

  function pickType(t: string) { setType(t); setEmoji(DEF_EMOJIS[t]||'⭐'); }

  function submit() {
    const lifelog = type === 'lifelog';
    if (!name.trim()) {
      showToast('⚠️', 'Missing info', lifelog ? 'Please name your life log.' : 'Please enter a name and date.');
      return;
    }
    if (!lifelog && !date) { showToast('⚠️', 'Missing info', 'Please enter a name and date.'); return; }
    // Resolve the log shape: a preset carries its kind/target; custom is a count
    // unless the user set a target number (→ an X-of-Y collection).
    let logKind: 'count' | 'collection' = 'count';
    let logPreset: string | undefined;
    let logTarget: number | undefined;
    if (lifelog) {
      const p = preset ? PRESET_BY_ID[preset] : undefined;
      if (p) {
        logKind = p.kind; logPreset = p.id; logTarget = p.target;
      } else {
        const t = parseInt(customTarget, 10);
        if (t > 0) { logKind = 'collection'; logTarget = t; }
      }
    }
    const newId = addMemory({
      type:type as any, name:name.trim(), emoji,
      // A life log is a CONTAINER — no container-level date. Dates live on entries.
      originDate: lifelog ? '' : date,
      yearUnknown: lifelog ? false : yearUnknown,
      entries: [], // containers always start empty
      logKind: lifelog ? logKind : undefined,
      logPreset: lifelog ? logPreset : undefined,
      logTarget: lifelog ? logTarget : undefined,
      note: lifelog ? '' : note.trim(),
      // Reminders only apply to the recurring types (birthday/anniversary/memorial).
      fav: false, alerts: lifelog ? [] : alerts,
      links: lifelog ? [] : links,
    });
    // Creating a life log lands you in its detail view, ready to add entries.
    if (lifelog) router.replace({ pathname: '/modals/lifelog-detail', params: { id: newId } });
    else router.back();
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2 }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ width:40, height:4, backgroundColor:colors.border,
          borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between',
          alignItems:'center', paddingHorizontal:20, paddingVertical:12 }}>
          <Text style={{ fontSize:18, fontWeight:'700', color:colors.text1 }}>New Memory 🕰️</Text>
          <CloseButton />
        </View>
        <ScrollView contentContainerStyle={{ padding:20 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <FL label="Type" />
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:7, marginBottom:14 }}>
            {MEMORY_TYPES.map(t => (
              <TouchableOpacity key={t.id} onPress={() => pickType(t.id)}
                style={{ flexDirection:'row', alignItems:'center', gap:7,
                  paddingVertical:10, paddingHorizontal:12, borderRadius:11, borderWidth:1.5,
                  borderColor: type===t.id ? colors.accent : colors.border,
                  backgroundColor: type===t.id ? (colors.isDark ? 'rgba(124,106,245,0.1)' : colors.tint) : colors.glass }}>
                <Text style={{ fontSize:18 }}>{t.icon}</Text>
                <View>
                  <Text style={{ fontSize:12, fontWeight:'600',
                    color: type===t.id ? colors.accent : colors.text2 }}>{t.label}</Text>
                  <Text style={{ fontSize:10, color:colors.text3 }}>{t.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {type === 'lifelog' && (
            <>
              <FL label="What are you tracking?" />
              <Text style={{ fontSize:11, color:colors.text3, marginTop:-2, marginBottom:7 }}>
                Collections — progress toward a set (X of Y)
              </Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:7, marginBottom:12 }}>
                {COLLECTION_PRESETS.map(p => (
                  <Chip key={p.id} selected={preset===p.id} emoji={p.emoji} label={p.name} onPress={() => pickPreset(p.id)} />
                ))}
              </View>
              <Text style={{ fontSize:11, color:colors.text3, marginBottom:7 }}>Counts — a running tally</Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:7, marginBottom:12 }}>
                {COUNT_PRESETS.map(p => (
                  <Chip key={p.id} selected={preset===p.id} emoji={p.emoji} label={p.name} onPress={() => pickPreset(p.id)} />
                ))}
                <Chip selected={preset===''} emoji="✨" label="Custom" onPress={pickCustom} />
              </View>
              {preset === '' && (
                <>
                  <FL label="Target (optional)" />
                  <TextInput value={customTarget} onChangeText={setCustomTarget} keyboardType="numeric"
                    placeholder="e.g. 50 — leave blank to just count" placeholderTextColor={colors.text3} style={fi} />
                  <Text style={{ fontSize:11, color:colors.text3, marginTop:-8, marginBottom:14, marginLeft:2 }}>
                    Set a number to track “X of Y”; leave blank for a simple count.
                  </Text>
                </>
              )}
            </>
          )}

          <FL label="Name" />
          <TextInput value={name} onChangeText={setName}
            placeholder={type==='lifelog' ? 'e.g. Countries Visited' : 'e.g. First Half Dome Hike…'}
            placeholderTextColor={colors.text3} style={fi} />

          {/* A life log is a CONTAINER — no date / unknown-year / note here.
              Those are per-ENTRY concerns handled inside the log's detail view. */}
          {type !== 'lifelog' && (
            <>
              <DateTimeField mode="date" label={DATE_LABELS[type]||'Date'} value={date} onChange={setDate} />
              <Toggle label="I don't know the year" value={yearUnknown} onChange={setYearUnknown} />
              {yearUnknown && (
                <Text style={{ fontSize:12, color:colors.text3, marginTop:-6, marginBottom:14, marginLeft:2 }}>
                  Only the month and day are used — the year won't be shown.
                </Text>
              )}
            </>
          )}

          <FL label="Icon" />
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:14 }}>
            {MEM_EMOJIS.map(em => (
              <TouchableOpacity key={em} onPress={() => setEmoji(em)}
                style={{ width:44, height:44, borderRadius:10, borderWidth:2,
                  borderColor: em===emoji ? colors.rose : 'transparent',
                  backgroundColor: em===emoji ? (colors.isDark ? 'rgba(232,80,122,0.15)' : colors.tint) : colors.glass,
                  alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:20 }}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {type !== 'lifelog' && (
            <>
              <FL label="Note (optional)" />
              <TextInput value={note} onChangeText={setNote}
                placeholder="Add a note…" placeholderTextColor={colors.text3} style={fi} />
              <LinksEditor value={links} onChange={setLinks} />
            </>
          )}
          {(type === 'birthday' || type === 'anniversary' || type === 'memorial') && (
            <AlertsEditor value={alerts} onChange={setAlerts} />
          )}
          <TouchableOpacity onPress={submit}
            style={{ backgroundColor:colors.rose, borderRadius:14, padding:15, alignItems:'center' }}>
            <Text style={{ color:'#fff', fontSize:15, fontWeight:'700' }}>
              {type==='lifelog' ? 'Create Life Log →' : 'Save Memory →'}
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

function Chip({ selected, emoji, label, onPress }: { selected: boolean; emoji: string; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress}
      style={{ flexDirection:'row', alignItems:'center', gap:6,
        paddingVertical:8, paddingHorizontal:11, borderRadius:11, borderWidth:1.5,
        borderColor: selected ? colors.teal : colors.border,
        backgroundColor: selected ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.glass }}>
      <Text style={{ fontSize:15 }}>{emoji}</Text>
      <Text style={{ fontSize:12, fontWeight:'600', color: selected ? colors.teal : colors.text2 }}>{label}</Text>
    </TouchableOpacity>
  );
}
