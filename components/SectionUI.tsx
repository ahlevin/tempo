import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

// Shared section header + empty-state prompt used across the countdown-style tabs.
export function SectionHeader({ title, onAdd }: { title: string; onAdd?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
      marginTop: 22, marginBottom: 10, marginHorizontal: 4 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text1, letterSpacing: -0.3 }}>{title}</Text>
      {onAdd && (
        <TouchableOpacity onPress={onAdd}>
          <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '500' }}>+ Add</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function EmptyPrompt({ icon, text, onPress }: { icon: string; text: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={{ alignItems: 'center', paddingVertical: 26, paddingHorizontal: 20,
        backgroundColor: colors.glass, borderRadius: 18, borderWidth: 1,
        borderColor: colors.border, borderStyle: 'dashed' }}>
      <Text style={{ fontSize: 30, marginBottom: 10 }}>{icon}</Text>
      <Text style={{ color: colors.text2, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>{text}</Text>
      <View style={{ marginTop: 12, backgroundColor: colors.isDark ? 'rgba(124,106,245,0.15)' : colors.tint, borderWidth: 1,
        borderColor: colors.isDark ? 'rgba(124,106,245,0.3)' : colors.border, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 16 }}>
        <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '700' }}>+ Add</Text>
      </View>
    </TouchableOpacity>
  );
}

// A simple screen title header ("Life Log", "Goals", …) matching the app style.
export function ScreenTitle({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text1, letterSpacing: -0.5 }}>{title}</Text>
    </View>
  );
}
