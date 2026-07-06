import { Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';

// A modal-header close (✕) with a proper ≥44×44 tap target. The glyph stays
// visually compact, but the touchable fills 44×44 and adds hitSlop so it's
// comfortable to hit. Defaults to router.back(); pass onPress to override.
export function CloseButton({ onPress, label = '✕' }: { onPress?: () => void; label?: string }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress ?? (() => router.back())}
      accessibilityRole="button"
      accessibilityLabel="Close"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 }}>
      <Text style={{ fontSize: 18, color: colors.text2 }}>{label}</Text>
    </TouchableOpacity>
  );
}
