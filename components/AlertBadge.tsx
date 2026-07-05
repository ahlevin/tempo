import { Text, View } from 'react-native';
import { Colors } from '../constants/colors';

/**
 * Small display-only "🔔 N" pill shown on cards when an item has one or more
 * reminders set. Renders nothing when count is 0, so callers can drop it in
 * unconditionally. Matches the subtle amber recurrence-badge style.
 */
export function AlertBadge({ count }: { count: number | undefined }) {
  if (!count || count <= 0) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2,
      backgroundColor: 'rgba(240,160,75,0.14)', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6 }}>
      <Text style={{ fontSize: 9 }}>🔔</Text>
      <Text style={{ fontSize: 9, fontWeight: '700', color: Colors.amber }}>{count}</Text>
    </View>
  );
}
