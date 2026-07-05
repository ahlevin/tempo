import { GestureResponderEvent, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';

/**
 * A clearly visible, tappable favourite toggle used on event & goal list rows.
 * - Uses colorable TEXT glyphs (★ / ☆), not the ⭐ emoji, so the color actually
 *   applies and it renders identically on web and native (the emoji ignored color
 *   and could render blank/mismatched on web).
 * - Fixed 44×44 tap target with a subtle background circle so it can never
 *   collapse to zero size, get clipped, or blend into the card.
 * - stopPropagation keeps a tap from triggering the card's tap-to-edit / swipe.
 */
export function FavStar({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      onPress={(ev: GestureResponderEvent) => { ev.stopPropagation(); onToggle(); }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Remove from favorites' : 'Add to favorites'}
      style={{
        width: 44, height: 44, borderRadius: 22, marginTop: 2,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: active ? 'rgba(240,160,75,0.16)' : 'rgba(255,255,255,0.06)',
      }}
    >
      <Text style={{ fontSize: 22, lineHeight: 26, textAlign: 'center', color: active ? Colors.amber : Colors.text2 }}>
        {active ? '★' : '☆'}
      </Text>
    </TouchableOpacity>
  );
}
