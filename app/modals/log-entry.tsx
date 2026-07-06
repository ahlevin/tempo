import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { useStore } from '../../store/useStore';
import { DatePrecision } from '../../store/types';
import { DateTimeField } from '../../components/DateTimeField';
import { presetUniverse } from '../../constants/lifelogs';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PRECISIONS: { id: DatePrecision; label: string }[] = [
  { id:'full',  label:'Full date' },
  { id:'month', label:'Month + year' },
  { id:'year',  label:'Year only' },
  { id:'none',  label:'No date' },
];

export default function LogEntryModal() {
  const { colors } = useTheme();
  const { id, past } = useLocalSearchParams<{ id: string; past: string }>();
  const memories    = useStore(s => s.memories);
  const addLogEntry = useStore(s => s.addLogEntry);
  const m = memories.find(x => x.id === id);

  const now = new Date();
  const [precision, setPrecision] = useState<DatePrecision>('full');
  const [usePast, setUsePast] = useState(past === '1');
  const [date,    setDate]    = useState(format(now, 'yyyy-MM-dd')); // full-date value
  const [year,    setYear]    = useState(String(now.getFullYear()));
  const [month,   setMonth]   = useState(now.getMonth());            // 0-11
  const [note,    setNote]    = useState('');
  const [item,    setItem]    = useState('');   // selected collection item
  const [query,   setQuery]   = useState('');

  const universe = m ? presetUniverse(m.logPreset) : undefined;
  const isPicker = !!m && m.logKind === 'collection' && !!universe;

  // Remaining = the universe minus items already logged (no duplicates).
  const remaining = useMemo(() => {
    if (!isPicker || !universe || !m) return [];
    const logged = new Set(m.entries.map(e => e.item).filter(Boolean));
    const q = query.trim().toLowerCase();
    return universe.filter(x => !logged.has(x) && (!q || x.toLowerCase().includes(q)));
  }, [isPicker, universe, m, query]);

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

  function submit() {
    if (isPicker && !item) return; // must pick an item first
    addLogEntry(id, { date: buildDate(), note: note.trim(), datePrecision: precision,
      ...(isPicker ? { item } : {}) });
    router.back();
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2 }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ width:40, height:4, backgroundColor:colors.border,
          borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between',
          alignItems:'center', paddingHorizontal:20, paddingVertical:12 }}>
          <Text style={{ fontSize:18, fontWeight:'700', color:colors.text1 }} numberOfLines={1}>
            {isPicker ? 'Add to' : 'Log'}: {m.emoji} {m.name}
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize:16, color:colors.text3 }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding:20 }} keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {isPicker && universe && (
            <>
              <Text style={{ fontSize:11, fontWeight:'600', color:colors.text3,
                textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>
                Pick one · {loggedCount} of {universe.length} logged
              </Text>
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
          <TouchableOpacity onPress={submit} disabled={isPicker && !item}
            style={{ backgroundColor:colors.teal, borderRadius:14, padding:15, alignItems:'center',
              opacity: (isPicker && !item) ? 0.5 : 1 }}>
            <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontSize:15, fontWeight:'700' }}>
              {isPicker ? (item ? `Add ${item} →` : 'Pick an item') : 'Log It →'}
            </Text>
          </TouchableOpacity>
          <View style={{ height:40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
