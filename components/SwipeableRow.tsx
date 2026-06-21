import { useRef } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Colors } from '../constants/colors';
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

/**
 * iOS-standard swipe-left-to-delete wrapper. The wrapped card keeps its own
 * tap-to-edit behaviour; this only adds the swipe affordance + a red Delete
 * action with a confirm step.
 *
 * On web, react-native-gesture-handler does not drive the pan gesture, so the
 * Swipeable simply renders its children inline — the card stays fully tappable
 * and deletion remains reachable through the edit screen. No functionality lost.
 */
export function SwipeableRow({
  children,
  onDelete,
  confirmTitle = 'Delete',
  confirmMessage = "This can't be undone.",
  marginBottom = 8,
}: Props) {
  const ref = useRef<Swipeable>(null);
  const confirm = useConfirm();

  async function confirmDelete() {
    ref.current?.close();
    const ok = await confirm({ title: confirmTitle, message: confirmMessage, confirmLabel: 'Delete', destructive: true });
    if (ok) onDelete();
  }

  function renderRightActions(_progress: any, dragX: any) {
    const scale = dragX.interpolate({
      inputRange: [-80, -20, 0],
      outputRange: [1, 0.85, 0.5],
      extrapolate: 'clamp',
    });
    return (
      <Pressable onPress={confirmDelete} style={{ width: 80, marginBottom }}>
        <View style={{
          flex: 1, backgroundColor: Colors.rose, borderRadius: 18,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Animated.View style={{ alignItems: 'center', transform: [{ scale }] }}>
            <Text style={{ fontSize: 22 }}>🗑️</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12, marginTop: 2 }}>Delete</Text>
          </Animated.View>
        </View>
      </Pressable>
    );
  }

  // Web: skip Swipeable entirely (no pan gesture there) and render the card
  // directly so it stays tappable; deletion is handled via the edit screen.
  if (Platform.OS === 'web') {
    return <>{children}</>;
  }

  return (
    <Swipeable
      ref={ref}
      renderRightActions={renderRightActions}
      overshootRight={false}
      rightThreshold={40}
      friction={2}
    >
      {children}
    </Swipeable>
  );
}
