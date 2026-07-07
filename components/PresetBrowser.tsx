import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import {
  COLLECTION_PRESETS, COUNT_PRESETS, EXPANDED_GROUPS, ALL_LIFELOG_PRESETS, LifelogPreset,
} from '../constants/lifelogs';

// Shared, searchable, grouped life-log preset picker. Scales to ~82 presets by
// replacing the flat chip rows with: a search field, a "Popular" section (the
// original presets, exactly as before), collapsible groups for the expanded
// universes, and a flat filtered list while searching. Search matches a preset's
// NAME, GROUP, and any ITEM inside its universe (so "Everest" surfaces Seven
// Summits + Eight Thousanders). Selection is reported via onSelect; null = Custom.
export function PresetBrowser({
  selectedId, onSelect, showCustom = false, customSelected = false,
}: {
  selectedId: string;
  onSelect: (preset: LifelogPreset | null) => void;
  showCustom?: boolean;
  customSelected?: boolean;
}) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Light debounce — all local data, so this is just to avoid re-filtering on
  // every keystroke of a fast typist.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  // Flat search results across every preset (originals + expanded). A preset
  // matches on name/group, or on any item within its universe (with the first
  // matching item surfaced as a hint).
  const results = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return null;
    const out: { p: LifelogPreset; hitItem?: string }[] = [];
    for (const p of ALL_LIFELOG_PRESETS) {
      if (p.name.toLowerCase().includes(q) || (p.group ?? '').toLowerCase().includes(q)) {
        out.push({ p });
        continue;
      }
      const hit = p.universe?.find(i => i.toLowerCase().includes(q));
      if (hit) out.push({ p, hitItem: hit });
    }
    return out;
  }, [debounced]);

  const searching = !!(debounced.trim());

  return (
    <View style={{ marginBottom: 8 }}>
      {/* Search field */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.glass,
        borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, marginBottom: 12 }}>
        <Text style={{ fontSize: 14 }}>🔎</Text>
        <TextInput value={query} onChangeText={setQuery}
          placeholder="Search lists — try 'Everest', 'Hot Wheels', 'pizza'…"
          placeholderTextColor={colors.text3} autoCapitalize="none" autoCorrect={false}
          style={{ flex: 1, paddingVertical: 11, color: colors.text1, fontSize: 14 }} />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 14, color: colors.text3 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {searching ? (
        // ---- Flat filtered results ----
        results && results.length > 0 ? (
          <View>
            <Label text={`${results.length} ${results.length === 1 ? 'list' : 'lists'}`} />
            {results.map(({ p, hitItem }) => (
              <PresetRow key={p.id} p={p} selected={selectedId === p.id}
                groupLabel={p.group} hitItem={hitItem} onPress={() => onSelect(p)} />
            ))}
          </View>
        ) : (
          <Text style={{ fontSize: 13, color: colors.text2, paddingVertical: 14, textAlign: 'center' }}>
            No lists match “{debounced.trim()}”. Use the Custom option to make your own.
          </Text>
        )
      ) : (
        // ---- Popular + collapsible groups ----
        <View>
          <Label text="Popular" />
          <Flow>
            {COLLECTION_PRESETS.map(p => (
              <Chip key={p.id} p={p} selected={selectedId === p.id} onPress={() => onSelect(p)} />
            ))}
            {COUNT_PRESETS.map(p => (
              <Chip key={p.id} p={p} selected={selectedId === p.id} onPress={() => onSelect(p)} />
            ))}
            {showCustom && (
              <Chip p={{ id: '__custom', name: 'Custom', emoji: '✨' }}
                selected={customSelected} onPress={() => onSelect(null)} />
            )}
          </Flow>

          {EXPANDED_GROUPS.map(({ group, presets }) => {
            const open = !!openGroups[group];
            return (
              <View key={group} style={{ marginTop: 8 }}>
                <TouchableOpacity onPress={() => setOpenGroups(s => ({ ...s, [group]: !s[group] }))}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingVertical: 11, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1,
                    borderColor: colors.border, backgroundColor: colors.glass }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text1 }}>
                    {group} <Text style={{ color: colors.text3, fontWeight: '600' }}>· {presets.length}</Text>
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.text3 }}>{open ? '▾' : '▸'}</Text>
                </TouchableOpacity>
                {open && (
                  <View style={{ marginTop: 6 }}>
                    {presets.map(p => (
                      <PresetRow key={p.id} p={p} selected={selectedId === p.id} onPress={() => onSelect(p)} />
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// A single tappable list row: emoji, name, item count, optional group/hit labels.
function PresetRow({ p, selected, onPress, groupLabel, hitItem }:
  { p: LifelogPreset; selected: boolean; onPress: () => void; groupLabel?: string; hitItem?: string }) {
  const { colors } = useTheme();
  const count = p.universe?.length;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, borderRadius: 11, borderWidth: 1.5, marginBottom: 6,
        borderColor: selected ? colors.teal : colors.border,
        backgroundColor: selected ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.glass }}>
      <Text style={{ fontSize: 18 }}>{p.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? colors.teal : colors.text1 }} numberOfLines={2}>
          {p.name}{count != null && <Text style={{ color: colors.text3, fontWeight: '600' }}>  · {count}</Text>}
        </Text>
        {!!groupLabel && (
          <Text style={{ fontSize: 11, color: colors.text3, marginTop: 1 }}>{groupLabel}</Text>
        )}
        {!!hitItem && (
          <Text style={{ fontSize: 11, color: colors.text2, marginTop: 1 }} numberOfLines={1}>contains “{hitItem}”</Text>
        )}
      </View>
      {selected && <Text style={{ fontSize: 15, color: colors.teal }}>✓</Text>}
    </TouchableOpacity>
  );
}

// The original compact chip (Popular section keeps the familiar look).
function Chip({ p, selected, onPress }:
  { p: { id: string; name: string; emoji: string }; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 11,
        borderRadius: 11, borderWidth: 1.5,
        borderColor: selected ? colors.teal : colors.border,
        backgroundColor: selected ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.glass }}>
      <Text style={{ fontSize: 15 }}>{p.emoji}</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: selected ? colors.teal : colors.text2 }}>{p.name}</Text>
    </TouchableOpacity>
  );
}

function Flow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 4 }}>{children}</View>;
}

function Label({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text3,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{text}</Text>;
}
