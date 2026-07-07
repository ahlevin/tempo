import { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { Link } from '../store/types';
import { cleanLinks } from '../utils/links';

/**
 * Reusable labeled-links editor (add/edit screens). Seeds its state once from
 * `value` (the item's existing links), lets the user add/remove rows of
 * label + URL, and emits the cleaned Link[] via onChange — URLs normalized
 * (https:// prepended when the scheme is missing) and implausible/empty rows
 * dropped. Mirrors the AlertsEditor "uncontrolled-with-initial-value" pattern.
 */
export function LinksEditor({
  value = [], onChange,
}: { value?: Link[]; onChange: (l: Link[]) => void }) {
  const { colors } = useTheme();
  const [rows, setRows] = useState<Link[]>(
    value.length ? value.map(l => ({ label: l.label ?? '', url: l.url ?? '' })) : []
  );

  useEffect(() => {
    onChange(cleanLinks(rows));
    // onChange is a stable setState; re-run only when the rows change.
  }, [rows]);

  const field = {
    backgroundColor: colors.track, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7,
    color: colors.text1, fontSize: 13, borderWidth: 1, borderColor: colors.border,
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text3,
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>🔗 Links (optional)</Text>

      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: colors.tile, borderWidth: 1, borderColor: colors.track,
          borderRadius: 10, padding: 9, marginBottom: 7 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <TextInput value={r.label}
              onChangeText={v => setRows(prev => prev.map((x, j) => j === i ? { ...x, label: v } : x))}
              placeholder="Label (optional)" placeholderTextColor={colors.text3} style={field} />
            <TextInput value={r.url}
              onChangeText={v => setRows(prev => prev.map((x, j) => j === i ? { ...x, url: v } : x))}
              placeholder="example.com" placeholderTextColor={colors.text3}
              autoCapitalize="none" autoCorrect={false} keyboardType="url" style={field} />
          </View>
          <TouchableOpacity onPress={() => setRows(prev => prev.filter((_, j) => j !== i))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ width: 28, height: 28, borderRadius: 14,
              backgroundColor: colors.isDark ? 'rgba(232,80,122,0.12)' : 'rgba(197,0,26,0.10)',
              alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.rose, fontSize: 13 }}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity onPress={() => setRows(prev => [...prev, { label: '', url: '' }])}
        style={{ padding: 8, borderRadius: 9, borderWidth: 1.5,
          borderColor: colors.isDark ? 'rgba(124,106,245,0.3)' : colors.accent,
          borderStyle: 'dashed', alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent }}>+ Add link</Text>
      </TouchableOpacity>
    </View>
  );
}
