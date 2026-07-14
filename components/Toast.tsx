import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Text, TouchableOpacity, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

interface ToastData {
  icon: string;
  title: string;
  sub?: string;
}

interface ToastContextValue {
  showToast: (icon: string, title: string, sub?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastData | null>(null);
  const translateY = useRef(new Animated.Value(-160)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const timer      = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    Animated.parallel([
      Animated.timing(translateY, { toValue: -160, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,    duration: 220, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setToast(null); });
  }, [translateY, opacity]);

  const showToast = useCallback((icon: string, title: string, sub?: string) => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setToast({ icon, title, sub });
  }, []);

  useEffect(() => {
    if (!toast) return;
    translateY.setValue(-160);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 180 }),
      Animated.timing(opacity,    { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    timer.current = setTimeout(hide, AUTO_DISMISS_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [toast, hide, translateY, opacity]);

  // Same root-layer problem as the confirm dialog: this absolutely-positioned
  // view paints BEHIND expo-router native modal screens on iOS, so validation
  // toasts fired from inside a modal (add/edit screens) were invisible. On iOS,
  // render through <FullWindowOverlay> — a top-level passthrough overlay above
  // every view controller. `pointerEvents="box-none"` keeps it non-blocking (only
  // the toast card is tappable). Android + web render inline as before.
  const toastNode = toast && (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute', left: 0, right: 0, top: insets.top + 8,
        paddingHorizontal: 16, zIndex: 9999, elevation: 9999,
        transform: [{ translateY }], opacity,
      }}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={hide}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          backgroundColor: colors.surf2, borderRadius: 16, borderWidth: 1,
          borderColor: colors.border, paddingVertical: 12, paddingHorizontal: 14,
          shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
        }}>
        <View style={{
          width: 38, height: 38, borderRadius: 11,
          backgroundColor: colors.isDark ? 'rgba(124,106,245,0.16)' : colors.tint,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 20 }}>{toast.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text1 }} numberOfLines={1}>
            {toast.title}
          </Text>
          {!!toast.sub && (
            <Text style={{ fontSize: 12, color: colors.text2, marginTop: 1 }} numberOfLines={2}>
              {toast.sub}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {Platform.OS === 'ios'
        ? (!!toast && <FullWindowOverlay>{toastNode}</FullWindowOverlay>)
        : toastNode}
    </ToastContext.Provider>
  );
}
