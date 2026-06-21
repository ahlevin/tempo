import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Colors } from '../constants/colors';

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
 * Cross-platform confirm dialog. Unlike Alert.alert (which is a no-op on
 * react-native-web), this renders a real themed modal on both native and web.
 * Usage: const ok = await confirm({ title, message, destructive: true }).
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOpts(options);
    });
  }, []);

  const finish = useCallback((value: boolean) => {
    setOpts(null);
    const r = resolver.current;
    resolver.current = null;
    r?.(value);
  }, []);

  const destructive = opts?.destructive;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal visible={!!opts} transparent animationType="fade" onRequestClose={() => finish(false)}>
        <Pressable
          onPress={() => finish(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 28 }}
        >
          {/* Inner press stops the backdrop from closing when the card is tapped. */}
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 340, backgroundColor: Colors.surf2,
              borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
              padding: 22,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: Colors.text1, marginBottom: opts?.message ? 8 : 18 }}>
              {opts?.title}
            </Text>
            {!!opts?.message && (
              <Text style={{ fontSize: 14, color: Colors.text2, marginBottom: 20, lineHeight: 20 }}>
                {opts.message}
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => finish(false)}
                style={{ flex: 1, paddingVertical: 13, borderRadius: 13, borderWidth: 1, borderColor: Colors.border,
                  backgroundColor: Colors.glass, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.text2 }}>
                  {opts?.cancelLabel || 'Cancel'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => finish(true)}
                style={{ flex: 1, paddingVertical: 13, borderRadius: 13, alignItems: 'center',
                  backgroundColor: destructive ? Colors.rose : Colors.accent }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                  {opts?.confirmLabel || 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext.Provider>
  );
}
