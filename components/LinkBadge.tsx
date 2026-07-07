import { Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Small display-only "🔗" pill (with the count when >1) shown on cards when an
 * item has one or more links. Renders nothing when count is 0, so callers can
 * drop it in unconditionally. The tappable links themselves live in the detail
 * view. Matches the subtle AlertBadge style, in the accent color.
 */
export function LinkBadge({ count }: { count: number | undefined }) {
  const { colors } = useTheme();
  if (!count || count <= 0) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2,
      backgroundColor: colors.isDark ? 'rgba(124,106,245,0.14)' : colors.tint, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6 }}>
      <Text style={{ fontSize: 9 }}>🔗</Text>
      {count > 1 && <Text style={{ fontSize: 9, fontWeight: '700', color: colors.accent }}>{count}</Text>}
    </View>
  );
}
