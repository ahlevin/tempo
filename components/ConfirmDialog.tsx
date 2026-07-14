import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { useTheme } from '../contexts/ThemeContext';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}

/**
 * Cross-platform confirm dialog that returns a Promise<boolean>.
 *
 * CRITICAL (native): the provider lives at the ROOT of the tree, so a plain RN
 * <Modal> here would try to present from the ROOT view controller — which on iOS
 * already has an expo-router modal screen (edit-event, etc.) presented on top,
 * so the dialog would be invisible and `await confirm(...)` would hang forever.
 * On iOS we therefore render through <FullWindowOverlay> (react-native-screens),
 * which renders in a top-level UIWindow ABOVE every view controller including
 * native modal screens. Android + web use a transparent <Modal>.
 *
 * The promise is ALWAYS settled: a new confirm() settles any prior pending one
 * (false), cancel/backdrop/back all resolve false, and unmount resolves false —
 * an awaited confirm() can never be left pending.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  // Resolve the current pending promise (if any) exactly once.
  const settle = useCallback((value: boolean) => {
    const r = resolver.current;
    resolver.current = null;
    r?.(value);
  }, []);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      settle(false);            // never orphan a still-pending confirm
      resolver.current = resolve;
      setOpts(options);
    });
  }, [settle]);

  const finish = useCallback((value: boolean) => {
    setOpts(null);
    settle(value);
  }, [settle]);

  // Safety net: a hung promise can never freeze the app — resolve false on unmount.
  useEffect(() => () => { settle(false); }, [settle]);

  const destructive = opts?.destructive;

  const dialog = !!opts && (
    <Pressable
      onPress={() => finish(false)}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 28 }}
    >
      {/* Inner press stops the backdrop from closing when the card is tapped. */}
      <Pressable
        onPress={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 340, backgroundColor: colors.surf2,
          borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 22 }}
      >
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text1, marginBottom: opts?.message ? 8 : 18 }}>
          {opts?.title}
        </Text>
        {!!opts?.message && (
          <Text style={{ fontSize: 14, color: colors.text2, marginBottom: 20, lineHeight: 20 }}>
            {opts.message}
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => finish(false)}
            style={{ flex: 1, paddingVertical: 13, borderRadius: 13, borderWidth: 1, borderColor: colors.border,
              backgroundColor: colors.glass, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text2 }}>
              {opts?.cancelLabel || 'Cancel'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => finish(true)}
            style={{ flex: 1, paddingVertical: 13, borderRadius: 13, alignItems: 'center',
              backgroundColor: destructive ? colors.rose : colors.accent }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
              {opts?.confirmLabel || 'Confirm'}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {Platform.OS === 'ios'
        ? (!!opts && <FullWindowOverlay>{dialog}</FullWindowOverlay>)
        : (
          <Modal visible={!!opts} transparent animationType="fade" onRequestClose={() => finish(false)}>
            {dialog}
          </Modal>
        )}
    </ConfirmContext.Provider>
  );
}
