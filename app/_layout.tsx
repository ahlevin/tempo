import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { useStore } from '../store/useStore';
import { ToastProvider } from '../components/Toast';
import { ConfirmProvider } from '../components/ConfirmDialog';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

export default function RootLayout() {
  const seed = useStore(s => s.seed);

  useEffect(() => {
    seed();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <RootNavigator />
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Login gate: bounce logged-out users to (auth), and logged-in users out of it.
  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && inAuthGroup) {
      router.replace('/tabs');
    }
  }, [session, loading, segments]);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0F' } }}>
        <Stack.Screen name="(auth)" />
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
      {loading && <LoadingScreen />}
    </View>
  );
}

function LoadingScreen() {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <Text style={{ fontSize: 40, fontWeight: '800', color: Colors.text1, letterSpacing: -1 }}>
        sayZay<Text style={{ color: Colors.accent }}>.</Text>
      </Text>
      <ActivityIndicator color={Colors.accent} />
    </View>
  );
}
