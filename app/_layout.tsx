import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { ToastProvider } from '../components/Toast';
import { ConfirmProvider } from '../components/ConfirmDialog';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { TickProvider } from '../contexts/TickContext';
import { rescheduleAll } from '../lib/notifications';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedStatusBar />
          <AuthProvider>
            <ToastProvider>
              <ConfirmProvider>
                <TickProvider>
                  <RootNavigator />
                </TickProvider>
              </ConfirmProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

function ThemedStatusBar() {
  const { colors } = useTheme();
  return <StatusBar style={colors.isDark ? 'light' : 'dark'} />;
}

function RootNavigator() {
  const { session, user, loading: authLoading } = useAuth();
  const loadForUser     = useStore(s => s.loadForUser);
  const clearForSignOut = useStore(s => s.clearForSignOut);
  const flushOutbox     = useStore(s => s.flushOutbox);
  const storeReady      = useStore(s => s.ready);
  const prefsExists     = useStore(s => s.prefsExists);
  const onboarded       = useStore(s => s.prefs.onboarded);
  const events          = useStore(s => s.events);
  const goals           = useStore(s => s.goals);
  const memories        = useStore(s => s.memories);
  const { colors } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  // Load the signed-in user's cloud data (or clear it on sign-out / switch).
  useEffect(() => {
    if (user) loadForUser(user.id);
    else clearForSignOut();
  }, [user?.id]);

  // (Re)schedule native local notifications whenever items/alerts/dates change.
  // No-op on web and without notification permission.
  useEffect(() => {
    if (!session) return;
    rescheduleAll({ events, goals, memories });
  }, [session, events, goals, memories]);

  // Re-push queued writes when the app/tab wakes or reconnects, and pause Supabase's
  // token auto-refresh (a ~30s internal tick) while hidden so nothing polls in the
  // background — resuming triggers an immediate refresh check, so the session stays
  // valid. AppState 'active' is native-only and unreliable on web, so on web we
  // listen to DOM online/focus/visibility events instead. (Mutations already trigger
  // a flush directly; this is just a belt-and-suspenders retry for anything queued.)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const g: any = globalThis as any;
      const wake = () => { flushOutbox(); };
      g.addEventListener?.('online', wake);
      g.addEventListener?.('focus', wake);
      const onVis = () => {
        if (g.document?.visibilityState === 'visible') { flushOutbox(); supabase.auth.startAutoRefresh(); }
        else { supabase.auth.stopAutoRefresh(); }
      };
      g.document?.addEventListener?.('visibilitychange', onVis);
      return () => {
        g.removeEventListener?.('online', wake);
        g.removeEventListener?.('focus', wake);
        g.document?.removeEventListener?.('visibilitychange', onVis);
      };
    }
    const sub = AppState.addEventListener('change', st => {
      if (st === 'active') { flushOutbox(); supabase.auth.startAutoRefresh(); }
      else supabase.auth.stopAutoRefresh();
    });
    return () => sub.remove();
  }, []);

  // Wait for the initial session check and (once logged in) the first data load.
  const booting = authLoading || (!!session && !storeReady);

  // If boot hasn't resolved after ~9s (hung/slow load), stop the animated spinner
  // and show a static state so we never animate an indicator indefinitely.
  const [bootTimedOut, setBootTimedOut] = useState(false);
  useEffect(() => {
    if (!booting) { setBootTimedOut(false); return; }
    const t = setTimeout(() => setBootTimedOut(true), 9000);
    return () => clearTimeout(t);
  }, [booting]);

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
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="tabs" />
        <Stack.Screen name="modals/add-event"   options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/add-goal"    options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/add-memory"  options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/detail-event"  options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/detail-goal"   options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/detail-memory" options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/detail-logentry" options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/edit-event"  options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/edit-goal"   options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/edit-memory" options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/log-entry"   options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/browse-universe" options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/exact-edit"  options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/holiday-detail"    options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/holidays-settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/favorites"         options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/calendar"          options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/lifelog-detail"    options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/admin-universes"   options={{ presentation: 'modal' }} />
      </Stack>
      {booting && <LoadingScreen timedOut={bootTimedOut} />}
    </View>
  );
}

function LoadingScreen({ timedOut }: { timedOut?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <Text style={{ fontSize: 40, fontWeight: '800', color: colors.text1, letterSpacing: -1 }}>
        sayZay<Text style={{ color: colors.accent }}>.</Text>
      </Text>
      {/* After a timeout, drop the animated spinner (never animate indefinitely). */}
      {timedOut
        ? <Text style={{ fontSize: 13, color: colors.text3, textAlign: 'center', paddingHorizontal: 40 }}>
            Still loading… check your connection.
          </Text>
        : <ActivityIndicator color={colors.accent} />}
    </View>
  );
}
