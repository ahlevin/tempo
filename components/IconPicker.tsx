import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ICON_GROUPS } from '../constants/icons';

// Shared icon picker used by every add/edit screen (event, memory, goal, life
// log, custom). Renders the domain-grouped catalog in a bounded, scrollable
// panel with a trivial search that filters by group name (or an exact emoji).
// Selection just calls onChange(emoji) — storage is unchanged (a single emoji).
// `accent` themes the selected tile so each surface keeps its brand color
// (event → violet, memory → rose, goal/log → teal).
export function IconPicker({ value, onChange, accent }: {
  value: string; onChange: (e: string) => void; accent?: string;
}) {
  const { colors } = useTheme();
  const acc = accent ?? colors.accent;
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();

  const groups = query
    ? ICON_GROUPS
        .map(g => ({
          label: g.label,
          // Match by group name → keep the whole group; otherwise keep only an
          // icon that IS the typed emoji (paste-to-find).
          icons: g.label.toLowerCase().includes(query) ? g.icons : g.icons.filter(ic => ic === q.trim()),
        }))
        .filter(g => g.icons.length)
    : ICON_GROUPS;

  const selBg = colors.isDark ? hexToRgba(acc, 0.15) : colors.tint;

  return (
    <View style={{ marginBottom: 14 }}>
      <TextInput value={q} onChangeText={setQ} placeholder="Search icons…"
        placeholderTextColor={colors.text3} autoCapitalize="none" autoCorrect={false}
        style={{ backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border,
          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: colors.text1,
          fontSize: 14, marginBottom: 10 }} />
      <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {groups.map(g => (
          <View key={g.label} style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text3,
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{g.label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {g.icons.map((em, i) => {
                const sel = em === value;
                return (
                  <TouchableOpacity key={`${g.label}-${i}`} onPress={() => onChange(em)}
                    style={{ width: 44, height: 44, borderRadius: 10, borderWidth: 2,
                      borderColor: sel ? acc : 'transparent',
                      backgroundColor: sel ? selBg : colors.glass,
                      alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20 }}>{em}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
        {groups.length === 0 && (
          <Text style={{ color: colors.text3, fontSize: 13, paddingVertical: 8 }}>
            No icons match “{q.trim()}”.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

// Turn a #RRGGBB / #RGB accent into a translucent rgba() for the selected-tile
// tint. Falls back to the input untouched if it isn't a hex color.
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  if (full.length !== 6) return hex;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return hex;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
