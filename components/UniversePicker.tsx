import { ReactNode, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { itemName, itemCityState, UniverseItem } from '../utils/lifelog';

// The shared item-picker RENDERING: a coverage header + search box + scrollable
// list of universe items (name · city/state · "N×" visit count), single-select.
// Used by the life-log picker (log-entry, sourced from a memory) and the collection
// CHALLENGE picker (log-visit, sourced from a goal's preset universe). It owns only
// its search state; the caller owns the selected item, the visit counts, and the
// header label (so "Your log: X/Y" vs "This challenge: X/Y" stays unambiguous).
export function UniversePicker({ universe, counts, selected, onSelect, headerLabel, rightBadge }: {
  universe: UniverseItem[];
  counts: Map<string, number>;   // item name → visit count (for the "· N×" badge)
  selected: string;
  onSelect: (name: string) => void;
  headerLabel: string;           // e.g. "This challenge: 2 of 30"
  rightBadge?: ReactNode;
}) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return universe
      .filter(x => !q || itemName(x).toLowerCase().includes(q) || itemCityState(x).toLowerCase().includes(q))
      .map(x => ({ name: itemName(x), cityState: itemCityState(x), count: counts.get(itemName(x)) ?? 0 }));
  }, [universe, counts, query]);

  const fi = { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 12, color: colors.text1, fontSize: 15, marginBottom: 14 };

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {headerLabel}
        </Text>
        {rightBadge}
      </View>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search…" placeholderTextColor={colors.text3} style={fi} />
      <View style={{ maxHeight: 240, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
        <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          {rows.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.text3, padding: 14 }}>{query ? 'No matches.' : 'No items.'}</Text>
          ) : rows.map((x, i) => {
            const sel = selected === x.name;
            return (
              <TouchableOpacity key={x.name} onPress={() => onSelect(x.name)}
                style={{ padding: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border,
                  backgroundColor: sel ? (colors.isDark ? 'rgba(62,207,178,0.14)' : colors.tint) : 'transparent' }}>
                <Text style={{ fontSize: 14, fontWeight: sel ? '700' : '500', color: sel ? colors.teal : colors.text1 }}>
                  {sel ? '✓ ' : ''}{x.name}
                  {!!x.cityState && <Text style={{ color: sel ? colors.teal : colors.text3, fontWeight: '500' }}>{`  ·  ${x.cityState}`}</Text>}
                  {x.count > 0 && <Text style={{ color: sel ? colors.teal : colors.text3, fontWeight: '600' }}>{`  · ${x.count}×`}</Text>}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}
