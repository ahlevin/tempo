import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { popularPresets, expandedGroups, allPresetsForSearch, LifelogPreset } from '../constants/lifelogs';

export type OccasionType = 'birthday' | 'anniversary' | 'memorial';
const OCCASIONS: { type: OccasionType; emoji: string; label: string }[] = [
  { type: 'birthday',    emoji: '🎂', label: 'Birthday' },
  { type: 'anniversary', emoji: '💑', label: 'Anniversary' },
  { type: 'memorial',    emoji: '🕊️', label: 'Memorial' },
];
const POPULAR_DEFAULT_OPEN = (g: string) => g === 'Popular' || g === 'Family Occasions';

// Unified, searchable, grouped tracking browser. One consistent 2-column pill
// grid across Popular, the expanded categories, and (when onSelectOccasion is
// provided) a Family Occasions group. Search matches preset NAME/GROUP/ITEM and,
// when occasions are enabled, the occasion labels. Selecting a list preset →
// onSelect(preset); Custom → onSelect(null); an occasion → onSelectOccasion(type).
export function PresetBrowser({
  selectedId, onSelect, showCustom = false, customSelected = false, onSelectOccasion,
}: {
  selectedId: string;
  onSelect: (preset: LifelogPreset | null) => void;
  showCustom?: boolean;
  customSelected?: boolean;
  onSelectOccasion?: (type: OccasionType) => void;
}) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  const results = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return null;
    const presets: { p: LifelogPreset; hitItem?: string }[] = [];
    for (const p of allPresetsForSearch()) {
      if (p.name.toLowerCase().includes(q) || (p.group ?? '').toLowerCase().includes(q)) { presets.push({ p }); continue; }
      const hit = p.universe?.find(i => i.toLowerCase().includes(q));
      if (hit) presets.push({ p, hitItem: hit });
    }
    const occ = onSelectOccasion
      ? OCCASIONS.filter(o => o.label.toLowerCase().includes(q) || 'family occasions'.includes(q))
      : [];
    return { presets, occ };
  }, [debounced, onSelectOccasion]);

  const searching = !!debounced.trim();
  const POPULAR = popularPresets();
  const isOpen = (g: string) => openGroups[g] ?? POPULAR_DEFAULT_OPEN(g);
  const toggle = (g: string) => setOpenGroups(s => ({ ...s, [g]: !(s[g] ?? POPULAR_DEFAULT_OPEN(g)) }));

  return (
    <View style={{ marginBottom: 8 }}>
      {/* Search */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.glass,
        borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, marginBottom: 12 }}>
        <Text style={{ fontSize: 14 }}>🔎</Text>
        <TextInput value={query} onChangeText={setQuery}
          placeholder="Search — try 'Everest', 'Birthday', 'pizza'…"
          placeholderTextColor={colors.text3} autoCapitalize="none" autoCorrect={false}
          style={{ flex: 1, paddingVertical: 11, color: colors.text1, fontSize: 14 }} />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 14, color: colors.text3 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {searching ? (
        results && (results.presets.length + results.occ.length) > 0 ? (
          <View>
            <Label text={`${results.presets.length + results.occ.length} ${results.presets.length + results.occ.length === 1 ? 'result' : 'results'}`} />
            <Grid>
              {results.occ.map(o => (
                <Pill key={'occ-' + o.type} emoji={o.emoji} label={o.label} onPress={() => onSelectOccasion?.(o.type)} />
              ))}
              {results.presets.map(({ p, hitItem }) => (
                <Pill key={p.id} emoji={p.emoji} label={p.name} sublabel={hitItem ? `contains “${hitItem}”` : p.group}
                  selected={selectedId === p.id} onPress={() => onSelect(p)} />
              ))}
            </Grid>
          </View>
        ) : (
          <Text style={{ fontSize: 13, color: colors.text2, paddingVertical: 14, textAlign: 'center' }}>
            No matches for “{debounced.trim()}”. Use Custom to make your own.
          </Text>
        )
      ) : (
        <View>
          {/* Popular (expanded by default) */}
          <GroupSection title="Popular" count={POPULAR.length + (showCustom ? 1 : 0)} open={isOpen('Popular')} onToggle={() => toggle('Popular')}>
            <Grid>
              {POPULAR.map(p => (
                <Pill key={p.id} emoji={p.emoji} label={p.name} selected={selectedId === p.id} onPress={() => onSelect(p)} />
              ))}
              {showCustom && <Pill emoji="✨" label="Custom" selected={customSelected} onPress={() => onSelect(null)} />}
            </Grid>
          </GroupSection>

          {/* Expanded categories (collapsed by default) */}
          {expandedGroups().map(({ group, presets }) => (
            <GroupSection key={group} title={group} count={presets.length} open={isOpen(group)} onToggle={() => toggle(group)}>
              <Grid>
                {presets.map(p => (
                  <Pill key={p.id} emoji={p.emoji} label={p.name} selected={selectedId === p.id} onPress={() => onSelect(p)} />
                ))}
              </Grid>
            </GroupSection>
          ))}

          {/* Family Occasions — LAST, expanded by default (only when enabled) */}
          {onSelectOccasion && (
            <GroupSection title="Family Occasions" count={OCCASIONS.length} open={isOpen('Family Occasions')} onToggle={() => toggle('Family Occasions')}>
              <Grid>
                {OCCASIONS.map(o => (
                  <Pill key={o.type} emoji={o.emoji} label={o.label} onPress={() => onSelectOccasion(o.type)} />
                ))}
              </Grid>
            </GroupSection>
          )}
        </View>
      )}
    </View>
  );
}

// ── Symmetric building blocks ────────────────────────────────────────────────

// A 2-column grid: equal-width (48%) columns, space-between gutter.
function Grid({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>{children}</View>;
}

// A uniform pill: equal height (minHeight), emoji + label (2 lines max, ellipsis).
function Pill({ emoji, label, sublabel, selected = false, onPress }:
  { emoji: string; label: string; sublabel?: string; selected?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={{ width: '48%', minHeight: 58, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 10, paddingHorizontal: 11, borderRadius: 12, borderWidth: 1.5,
        borderColor: selected ? colors.teal : colors.border,
        backgroundColor: selected ? (colors.isDark ? 'rgba(62,207,178,0.12)' : colors.tint) : colors.glass }}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} style={{ fontSize: 12.5, fontWeight: '600', color: selected ? colors.teal : colors.text1 }}>{label}</Text>
        {!!sublabel && <Text numberOfLines={1} style={{ fontSize: 10, color: colors.text3, marginTop: 1 }}>{sublabel}</Text>}
      </View>
    </TouchableOpacity>
  );
}

// A collapsible group: header (title · count + chevron) then its grid when open.
function GroupSection({ title, count, open, onToggle, children }:
  { title: string; count: number; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 8 }}>
      <TouchableOpacity onPress={onToggle}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingVertical: 11, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1,
          borderColor: colors.border, backgroundColor: colors.glass, marginBottom: open ? 10 : 0 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text1 }}>
          {title} <Text style={{ color: colors.text3, fontWeight: '600' }}>· {count}</Text>
        </Text>
        <Text style={{ fontSize: 13, color: colors.text3 }}>{open ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {open && children}
    </View>
  );
}

function Label({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text3,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{text}</Text>;
}
