import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { ToastProvider } from '../components/Toast';

export default function RootLayout() {
  const seed = useStore(s => s.seed);

  useEffect(() => {
    seed();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0F' } }}>
            <Stack.Screen name="tabs" />
            <Stack.Screen name="modals/add-event"   options={{ presentation: 'modal' }} />
            <Stack.Screen name="modals/add-goal"    options={{ presentation: 'modal' }} />
            <Stack.Screen name="modals/add-memory"  options={{ presentation: 'modal' }} />
            <Stack.Screen name="modals/edit-event"  options={{ presentation: 'modal' }} />
            <Stack.Screen name="modals/edit-goal"   options={{ presentation: 'modal' }} />
            <Stack.Screen name="modals/edit-memory" options={{ presentation: 'modal' }} />
            <Stack.Screen name="modals/log-entry"   options={{ presentation: 'modal' }} />
            <Stack.Screen name="modals/exact-edit"  options={{ presentation: 'modal' }} />
          </Stack>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
