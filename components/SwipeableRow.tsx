import { useRef } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import ReanimatedSwipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { SharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { useConfirm } from './ConfirmDialog';

interface Props {
  children: React.ReactNode;
  /** Performs the actual deletion (called after the user confirms). */
  onDelete: () => void;
  confirmTitle?: string;
  confirmMessage?: string;
  /** Bottom gap so the red action aligns with cards that carry their own margin. */
  marginBottom?: number;
}

// The red right-hand Delete action. Scales in as the row is dragged left, driven
// by Reanimated's `translation` shared value (worklet on the UI thread).
function RightAction({ translation, onPress, marginBottom, rose }: {
  translation: SharedValue<number>; onPress: () => void; marginBottom: number; rose: string;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(translation.value, [-80, -20, 0], [1, 0.85, 0.5], Extrapolation.CLAMP) }],
  }));
  return (
    <Pressable onPress={onPress} style={{ width: 80, marginBottom }}>
      <View style={{ flex: 1, backgroundColor: rose, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
        <Reanimated.View style={[{ alignItems: 'center' }, style]}>
          <Text style={{ fontSize: 22 }}>🗑️</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12, marginTop: 2 }}>Delete</Text>
        </Reanimated.View>
      </View>
    </Pressable>
  );
}

/**
 * iOS-standard swipe-left-to-delete wrapper. The wrapped card keeps its own
 * tap-to-edit behaviour; this only adds the swipe affordance + a red Delete
 * action with a confirm step.
 *
 * Migrated to `ReanimatedSwipeable` (the deprecated `Swipeable` from
 * react-native-gesture-handler no longer drives the gesture on the SDK 56
 * native build). On web, gesture-handler doesn't run the pan gesture, so we skip
 * the swipe wrapper and render the card inline — it stays fully tappable and
 * deletion remains reachable through the edit screen. No functionality lost.
 */
export function SwipeableRow({
  children,
  onDelete,
  confirmTitle = 'Delete',
  confirmMessage = "This can't be undone.",
  marginBottom = 8,
}: Props) {
  const ref = useRef<SwipeableMethods>(null);
  const confirm = useConfirm();
  const { colors } = useTheme();

  async function confirmDelete() {
    ref.current?.close();
    const ok = await confirm({ title: confirmTitle, message: confirmMessage, confirmLabel: 'Delete', destructive: true });
    if (ok) onDelete();
  }

  // Web: skip the swipe wrapper (no pan gesture there) and render the card
  // directly so it stays tappable; deletion is handled via the edit screen.
  if (Platform.OS === 'web') {
    return <>{children}</>;
  }

  return (
    <ReanimatedSwipeable
      ref={ref}
      renderRightActions={(_progress, translation) => (
        <RightAction translation={translation} onPress={confirmDelete} marginBottom={marginBottom} rose={colors.rose} />
      )}
      overshootRight={false}
      rightThreshold={40}
      friction={2}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
