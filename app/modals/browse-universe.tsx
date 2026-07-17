import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { CloseButton } from '../../components/CloseButton';
import { useStore } from '../../store/useStore';
import { useToast } from '../../components/Toast';
import { logUniverse, isCollectionLog, itemName, itemCityState, itemFullAddress, itemMapQuery, locationForName } from '../../utils/lifelog';
import { openUrl } from '../../utils/links';

// A fuller "browse with addresses" view over a collection log's universe: each
// item shows its name, full address (when present) and a Map link; multi-select
// then "Add selected" creates one INDEPENDENT entry per item (default date =
// today, editable after). Same universe + same addLogEntry as the picker — just
// an alternate view. Items already logged keep their "· N×" and stay selectable.
export default function BrowseUniverseModal() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memories = useStore(s => s.memories);
  const addLogEntry = useStore(s => s.addLogEntry);
  const { showToast } = useToast();

  const m = memories.find(x => x.id === id);
  const universe = m ? logUniverse(m) : undefined;

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    m?.entries.forEach(e => { if (e.item) c.set(e.item, (c.get(e.item) ?? 0) + 1); });
    return c;
  }, [m]);

  const items = useMemo(() => {
    if (!universe) return [];
    const q = query.trim().toLowerCase();
    return universe.filter(it => !q || itemName(it).toLowerCase().includes(q) || itemCityState(it).toLowerCase().includes(q));
  }, [universe, query]);

  // Never navigate during render (illegal side effect → ErrorBoundary).
  useEffect(() => { if (!m || !isCollectionLog(m) || !universe) router.back(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m || !isCollectionLog(m) || !universe) return null;

  const toggle = (name: string) => setSelected(prev => {
    const n = new Set(prev);
    if (n.has(name)) n.delete(name); else n.add(name);
    return n;
  });

  function addSelected() {
    if (selected.size === 0) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    // One independent entry per selected item — default date today, editable
    // after. Snapshot the item's current location onto the entry (historical).
    selected.forEach(name => {
      const loc = locationForName(universe, name);
      addLogEntry(id, { date: today, note: '', datePrecision: 'full', item: name,
        city: loc?.city, state: loc?.state, address: loc?.address });
    });
    showToast('✅', 'Added', `${selected.size} logged to ${m!.name}`);
    router.back();
  }

  const fi = { backgroundColor:colors.glass, borderWidth:1, borderColor:colors.border,
    borderRadius:12, padding:12, color:colors.text1, fontSize:15, marginBottom:14 };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2 }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ width:40, height:4, backgroundColor:colors.border,
          borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center',
          paddingHorizontal:20, paddingVertical:12 }}>
          <Text style={{ fontSize:18, fontWeight:'700', color:colors.text1, flex:1, minWidth:0, marginRight:12 }} numberOfLines={1}>
            📍 {m.emoji} {m.name}
          </Text>
          <View style={{ flexShrink:0 }}><CloseButton /></View>
        </View>

        <View style={{ paddingHorizontal:20 }}>
          <TextInput value={query} onChangeText={setQuery}
            placeholder="Search name, city, or state…" placeholderTextColor={colors.text3} style={fi} />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal:16, paddingBottom:24 }}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {items.length === 0 ? (
            <Text style={{ fontSize:13, color:colors.text3, padding:14 }}>{query ? 'No matches.' : 'No items.'}</Text>
          ) : items.map((it, i) => {
            const name = itemName(it);
            const addr = itemFullAddress(it);
            const count = counts.get(name) ?? 0;
            const sel = selected.has(name);
            return (
              <TouchableOpacity key={name + i} activeOpacity={0.7} onPress={() => toggle(name)}
                style={{ flexDirection:'row', alignItems:'center', gap:12, backgroundColor:colors.surf,
                  borderWidth:1, borderColor: sel ? colors.teal : colors.border, borderRadius:12,
                  padding:12, marginBottom:8 }}>
                {/* Checkbox */}
                <View style={{ width:24, height:24, borderRadius:6, borderWidth:2,
                  borderColor: sel ? colors.teal : colors.border,
                  backgroundColor: sel ? colors.teal : 'transparent',
                  alignItems:'center', justifyContent:'center' }}>
                  {sel && <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontSize:14, fontWeight:'800' }}>✓</Text>}
                </View>
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:14, fontWeight:'600', color:colors.text1 }} numberOfLines={1}>
                    {name}
                    {count > 0 && <Text style={{ color:colors.text3, fontWeight:'600' }}>{`  · ${count}×`}</Text>}
                  </Text>
                  {!!addr && (
                    <Text style={{ fontSize:12, color:colors.text2, marginTop:2 }} numberOfLines={2}>{addr}</Text>
                  )}
                </View>
                {/* Map link — separate touch target, opens externally. */}
                <TouchableOpacity onPress={() => openUrl('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(itemMapQuery(it)))}
                  hitSlop={{ top:8, bottom:8, left:8, right:8 }}
                  style={{ paddingVertical:6, paddingHorizontal:10, borderRadius:9, borderWidth:1, borderColor:colors.border }}>
                  <Text style={{ fontSize:12, fontWeight:'700', color:colors.teal }}>📍 Map</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal:16, paddingTop:8, paddingBottom:6,
          borderTopWidth:1, borderTopColor:colors.border }}>
          <TouchableOpacity onPress={addSelected} disabled={selected.size === 0}
            style={{ backgroundColor:colors.teal, borderRadius:14, padding:15, alignItems:'center',
              opacity: selected.size === 0 ? 0.5 : 1 }}>
            <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontSize:15, fontWeight:'700' }}>
              {selected.size === 0 ? 'Select items to add' : `Add selected · ${selected.size}`}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
