import { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useToast } from '../../components/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { format, subDays } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { CloseButton } from '../../components/CloseButton';
import { IconPicker } from '../../components/IconPicker';
import { useStore } from '../../store/useStore';
import { Alert as AlertType, Link } from '../../store/types';
import { DateTimeField } from '../../components/DateTimeField';
import { AlertsEditor } from '../../components/AlertsEditor';
import { LinksEditor } from '../../components/LinksEditor';
import { Toggle } from '../../components/FormControls';
import { getPreset, LifelogPreset } from '../../constants/lifelogs';
import { PresetBrowser, OccasionType } from '../../components/PresetBrowser';

const DATE_LABELS: Record<string,string> = {
  birthday:'Date of Birth', anniversary:'Anniversary Date',
  memorial:'Date to Remember', lifelog:'First Occurrence'
};
const DEF_EMOJIS: Record<string,string> = {
  birthday:'🎂', anniversary:'💑', memorial:'🕊️', lifelog:'🏔️'
};
const FORM_TYPES = ['birthday', 'anniversary', 'memorial'];

export default function AddMemoryModal() {
  const { colors } = useTheme();
  const addMemory = useStore(s => s.addMemory);
  const { showToast } = useToast();
  // Deep link: the AddChooser routes Birthday/Anniversary/Memorial straight to
  // their form (skipping the browser). Everything else opens the browser.
  const { type: typeParam } = useLocalSearchParams<{ type?: string }>();
  const deepLinked = !!typeParam && FORM_TYPES.includes(typeParam);
  const initialType = deepLinked ? (typeParam as string) : 'lifelog';
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
  // UI-only flow state for the Life Log path (no effect on saved data).
  const [browserOpen,   setBrowserOpen]   = useState(true);  // browser expanded vs collapsed selection
  const [customMode,    setCustomMode]    = useState(false); // "Custom" chosen (vs a real preset)
  const [customizeOpen, setCustomizeOpen] = useState(false); // name+icon revealed for a preset

  // Browser: a preset collapses to a compact card; Custom opens the name/icon/
  // target form. Seeds name/emoji exactly as before (unchanged logic).
  function choosePreset(p: LifelogPreset | null) {
    if (p) {
      setPreset(p.id); setCustomMode(false);
      setName(p.name); setEmoji(p.emoji);
    } else {
      setCustomMode(true); setPreset('');
      setName(''); setEmoji(DEF_EMOJIS.lifelog);
    }
    setCustomizeOpen(false);
    setBrowserOpen(false);
  }
  // A Family Occasions pill switches to that type's existing form.
  function chooseOccasion(t: OccasionType) {
    setType(t);
    setEmoji(DEF_EMOJIS[t] || '⭐');
    setName('');
  }
  // "Back to tracking" from an occasion form (only when reached via the browser).
  function backToBrowser() { setType('lifelog'); }

  const fi = { backgroundColor:colors.glass, borderWidth:1,
    borderColor:colors.border, borderRadius:12, padding:12,
    color:colors.text1, fontSize:15, marginBottom:14 };

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
      const p = getPreset(preset);
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

  const lifelog = type === 'lifelog';
  const chosen = getPreset(preset);
  const chosenCount = chosen?.kind === 'collection' ? chosen.universe?.length : undefined;
  // Sticky Create bar appears once a Life Log choice is made (preset or custom).
  const showSticky = lifelog && !browserOpen && (preset !== '' || customMode);
  const createDisabled = customMode && !name.trim();

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
        <ScrollView contentContainerStyle={{ padding:20, paddingBottom: showSticky ? 24 : 40 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ============================ LIFE LOG / BROWSER ============================ */}
          {lifelog && (
            <>
              <Text style={{ fontSize:22, fontWeight:'800', color:colors.text1, letterSpacing:-0.3, marginBottom:14 }}>
                What are you tracking?
              </Text>

              {/* Browser — kept mounted (hidden when collapsed) so its search /
                  expanded groups survive a "Change". */}
              <View style={{ display: browserOpen ? 'flex' : 'none' }}>
                <PresetBrowser selectedId={preset} onSelect={choosePreset}
                  showCustom customSelected={customMode} onSelectOccasion={chooseOccasion} />
              </View>

              {/* Collapsed PRESET selection */}
              {!browserOpen && preset !== '' && (
                <>
                  <FL label="Tracking" />
                  <View style={{ flexDirection:'row', alignItems:'center', gap:12,
                    backgroundColor:colors.surf, borderWidth:1, borderColor:colors.teal,
                    borderRadius:14, padding:14, marginBottom:12 }}>
                    <View style={{ width:46, height:46, borderRadius:13,
                      backgroundColor: colors.isDark ? 'rgba(62,207,178,0.14)' : colors.tint,
                      alignItems:'center', justifyContent:'center' }}>
                      <Text style={{ fontSize:24 }}>{emoji}</Text>
                    </View>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:14, fontWeight:'700', color:colors.text1 }}>{name}</Text>
                      {chosenCount != null && (
                        <Text style={{ fontSize:12, color:colors.text2, marginTop:2 }}>{chosenCount} items to collect</Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => setBrowserOpen(true)} hitSlop={{ top:8, bottom:8, left:8, right:8 }}
                      style={{ paddingVertical:7, paddingHorizontal:12, borderRadius:10, borderWidth:1, borderColor:colors.border }}>
                      <Text style={{ fontSize:12, fontWeight:'700', color:colors.teal }}>Change</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Name & icon are optional for a preset — hidden behind a link. */}
                  <TouchableOpacity onPress={() => setCustomizeOpen(o => !o)}
                    style={{ alignSelf:'flex-start', paddingVertical:6, marginBottom:customizeOpen ? 8 : 4 }}>
                    <Text style={{ fontSize:13, fontWeight:'600', color:colors.accent }}>
                      {customizeOpen ? '▾ Hide name & icon' : '▸ Customize name & icon'}
                    </Text>
                  </TouchableOpacity>
                  {customizeOpen && (
                    <>
                      <FL label="Name" />
                      <TextInput value={name} onChangeText={setName}
                        placeholder="Name this log" placeholderTextColor={colors.text3} style={fi} />
                      <FL label="Icon" />
                      <IconGrid value={emoji} onChange={setEmoji} />
                    </>
                  )}
                </>
              )}

              {/* Collapsed CUSTOM selection */}
              {!browserOpen && customMode && (
                <>
                  <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <Text style={{ fontSize:13, fontWeight:'700', color:colors.text1 }}>✨ Custom list</Text>
                    <TouchableOpacity onPress={() => setBrowserOpen(true)} hitSlop={{ top:8, bottom:8, left:8, right:8 }}
                      style={{ paddingVertical:7, paddingHorizontal:12, borderRadius:10, borderWidth:1, borderColor:colors.border }}>
                      <Text style={{ fontSize:12, fontWeight:'700', color:colors.teal }}>Change</Text>
                    </TouchableOpacity>
                  </View>
                  <FL label="New life log name" />
                  <TextInput value={name} onChangeText={setName}
                    placeholder="e.g. Coffee shops tried" placeholderTextColor={colors.text3} style={fi} />
                  <FL label="Icon" />
                  <IconGrid value={emoji} onChange={setEmoji} />
                  <FL label="Target (optional)" />
                  <TextInput value={customTarget} onChangeText={setCustomTarget} keyboardType="numeric"
                    placeholder="e.g. 50 — leave blank to just count" placeholderTextColor={colors.text3} style={fi} />
                  <Text style={{ fontSize:11, color:colors.text3, marginTop:-8, marginBottom:8, marginLeft:2 }}>
                    Set a number to track “X of Y”; leave blank for a simple count.
                  </Text>
                </>
              )}
            </>
          )}

          {/* ===================== BIRTHDAY / ANNIVERSARY / MEMORIAL ===================== */}
          {!lifelog && (
            <>
              {/* Reached via the browser's Family Occasions → offer a way back.
                  Deep-linked (from the Countdowns +) keeps today's direct path. */}
              {!deepLinked && (
                <TouchableOpacity onPress={backToBrowser} hitSlop={{ top:8, bottom:8, left:8, right:8 }}
                  style={{ alignSelf:'flex-start', paddingVertical:6, marginBottom:8 }}>
                  <Text style={{ fontSize:13, fontWeight:'600', color:colors.accent }}>‹ Back to tracking</Text>
                </TouchableOpacity>
              )}

              <FL label="Name" />
              <TextInput value={name} onChangeText={setName}
                placeholder="e.g. First Half Dome Hike…"
                placeholderTextColor={colors.text3} style={fi} />

              <DateTimeField mode="date" label={DATE_LABELS[type]||'Date'} value={date} onChange={setDate} />
              <Toggle label="I don't know the year" value={yearUnknown} onChange={setYearUnknown} />
              {yearUnknown && (
                <Text style={{ fontSize:12, color:colors.text3, marginTop:-6, marginBottom:14, marginLeft:2 }}>
                  Only the month and day are used — the year won't be shown.
                </Text>
              )}

              <FL label="Icon" />
              <IconGrid value={emoji} onChange={setEmoji} />

              <FL label="Note (optional)" />
              <TextInput value={note} onChangeText={setNote}
                placeholder="Add a note…" placeholderTextColor={colors.text3} style={fi} />
              <LinksEditor value={links} onChange={setLinks} />
              {(type === 'birthday' || type === 'anniversary' || type === 'memorial') && (
                <AlertsEditor value={alerts} onChange={setAlerts} />
              )}
              <TouchableOpacity onPress={submit}
                style={{ backgroundColor:colors.rose, borderRadius:14, padding:15, alignItems:'center' }}>
                <Text style={{ color:'#fff', fontSize:15, fontWeight:'700' }}>Save Memory →</Text>
              </TouchableOpacity>
              <View style={{ height:40 }} />
            </>
          )}
        </ScrollView>

        {/* Sticky Create bar — Life Log only, once a choice is made. */}
        {showSticky && (
          <View style={{ paddingHorizontal:20, paddingTop:12, paddingBottom:6,
            borderTopWidth:1, borderTopColor:colors.border, backgroundColor:colors.surf2 }}>
            <TouchableOpacity onPress={submit} disabled={createDisabled}
              style={{ backgroundColor:colors.rose, borderRadius:14, padding:15, alignItems:'center',
                opacity: createDisabled ? 0.5 : 1 }}>
              <Text style={{ color:'#fff', fontSize:15, fontWeight:'700' }}>Create Life Log →</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function IconGrid({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  const { colors } = useTheme();
  return <IconPicker value={value} onChange={onChange} accent={colors.rose} />;
}

function FL({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize:11, fontWeight:'600', color:colors.text3,
    textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>{label}</Text>;
}
