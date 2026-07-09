import { ReactNode } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { lightCardShadow } from '../constants/colors';

// A compact headline stat card for a tab's metrics header. On-brand surface +
// border, big number over a small label, with an optional sub-line breakdown.
export function StatCard({ value, label, sub }: { value: number | string; label: string; sub?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surf, borderRadius: 16, borderWidth: 1,
      borderColor: colors.border, paddingVertical: 12, paddingHorizontal: 14,
      ...(colors.isDark ? null : lightCardShadow) }}>
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text1 }}>{value}</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text2, marginTop: 2 }}>{label}</Text>
      {!!sub && <Text style={{ fontSize: 11, color: colors.text3, marginTop: 2 }} numberOfLines={1}>{sub}</Text>}
    </View>
  );
}

// The horizontal row wrapping a tab's stat cards.
export function StatRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>{children}</View>;
}

// A list-filter search box (name substring). Shows a clear (✕) button when the
// query is non-empty.
export function SearchBar({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glass,
      borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, marginBottom: 14 }}>
      <Text style={{ fontSize: 14, color: colors.text3 }}>🔍</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={colors.text3} autoCapitalize="none" autoCorrect={false}
        style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: colors.text1, fontSize: 14 }} />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 15, color: colors.text3 }}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
