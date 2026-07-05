import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { useStore } from '../store/useStore';
import { ToastProvider } from '../components/Toast';
import { ConfirmProvider } from '../components/ConfirmDialog';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

export default function RootLayout() {
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
  const { session, user, loading: authLoading } = useAuth();
  const loadForUser     = useStore(s => s.loadForUser);
  const clearForSignOut = useStore(s => s.clearForSignOut);
  const flushOutbox     = useStore(s => s.flushOutbox);
  const storeReady      = useStore(s => s.ready);
  const prefsExists     = useStore(s => s.prefsExists);
  const onboarded       = useStore(s => s.prefs.onboarded);
  const segments = useSegments();
  const router = useRouter();

  // Load the signed-in user's cloud data (or clear it on sign-out / switch).
  useEffect(() => {
    if (user) loadForUser(user.id);
    else clearForSignOut();
  }, [user?.id]);

  // Push any queued offline writes when the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => { if (st === 'active') flushOutbox(); });
    return () => sub.remove();
  }, []);

  // Wait for the initial session check and (once logged in) the first data load.
  const booting = authLoading || (!!session && !storeReady);

  // Gate: logged-out -> (auth); logged-in but not onboarded -> (onboarding);
  // onboarded -> the app. Onboarding sits between "logged in" and "in the app".
  useEffect(() => {
    if (booting) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    if (!session) {
      if (!inAuthGroup) router.replace('/login');
      return;
    }
    const needsOnboarding = !prefsExists || !onboarded;
    if (needsOnboarding) {
      if (!inOnboarding) router.replace('/(onboarding)/wizard');
    } else if (inAuthGroup || inOnboarding) {
      router.replace('/tabs');
    }
  }, [booting, session, segments, prefsExists, onboarded]);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0F' } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
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
      {booting && <LoadingScreen />}
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
