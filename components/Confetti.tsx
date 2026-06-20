import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

const COLORS = ['#7C6AF5', '#E8507A', '#3ECFB2', '#F0A04B', '#F0F0FA'];
const PIECES = 18;

interface Piece {
  left: number;       // 0..1 horizontal start (fraction of width)
  drift: number;      // horizontal drift in px
  size: number;
  rotateTo: number;   // degrees
  delay: number;
  color: string;
  rounded: boolean;
}

// Deterministic-ish spread so we avoid Math.random (varies per index instead).
function buildPieces(): Piece[] {
  return Array.from({ length: PIECES }, (_, i) => ({
    left: (i * 0.61803398875) % 1,
    drift: (((i * 53) % 100) - 50) * 1.6,
    size: 7 + ((i * 17) % 6),
    rotateTo: 180 + ((i * 97) % 360),
    delay: (i % 6) * 45,
    color: COLORS[i % COLORS.length],
    rounded: i % 3 === 0,
  }));
}

/**
 * Lightweight one-shot confetti burst. Plays whenever `fire` flips truthy
 * (pass an incrementing number or boolean). Pieces fall + drift + fade, then
 * onDone() fires so the parent can unmount/reset.
 */
export function Confetti({
  fire,
  height = 220,
  onDone,
}: {
  fire: number | boolean;
  height?: number;
  onDone?: () => void;
}) {
  const piecesRef = useRef<Piece[]>(buildPieces());
  const progress  = useRef(new Animated.Value(0)).current;
  const fireKey    = typeof fire === 'boolean' ? (fire ? 1 : 0) : fire;
  const lastFire   = useRef<number>(0);

  useEffect(() => {
    if (!fireKey || fireKey === lastFire.current) return;
    lastFire.current = fireKey;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 1400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => { if (finished) onDone?.(); });
  }, [fireKey, progress, onDone]);

  if (!fireKey) return null;

  return (
    <View pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, top: 0, height, overflow: 'hidden' }}>
      {piecesRef.current.map((p, i) => {
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, height],
        });
        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.drift],
        });
        const rotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', p.rotateTo + 'deg'],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.1, 0.75, 1],
          outputRange: [0, 1, 1, 0],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              left: `${p.left * 100}%`,
              width: p.size,
              height: p.size,
              borderRadius: p.rounded ? p.size / 2 : 2,
              backgroundColor: p.color,
              opacity,
              transform: [{ translateX }, { translateY }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
