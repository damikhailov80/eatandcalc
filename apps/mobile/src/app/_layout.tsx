import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DevLogButton } from '@/components/DevLogButton';
import { authClient } from '@/lib/auth';
import { diag, installDiagnosticsCapture } from '@/lib/diagnostics';
import { queryClient } from '@/lib/query';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();
installDiagnosticsCapture();

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    // Icon font is preloaded too: lazy loading inside <Icon> fails silently and leaves blank icons.
    ...MaterialCommunityIcons.font,
  });
  // Session is cached in SecureStore by the Expo plugin, so this resolves fast on relaunch.
  const { data: session, isPending } = authClient.useSession();

  const ready = (fontsLoaded || !!fontsError) && !isPending;
  const signedIn = !!session;

  // Session transitions go to the diagnostics log: a sign-out nobody asked for becomes visible.
  const prevSignedIn = useRef<boolean | null>(null);
  useEffect(() => {
    if (!ready || prevSignedIn.current === signedIn) return;
    if (prevSignedIn.current !== null || signedIn) {
      diag('session', signedIn ? `вход: ${session?.user.email}` : 'сессия пропала → экран входа');
    }
    prevSignedIn.current = signedIn;
  }, [ready, signedIn, session?.user.email]);

  // Screen changes give the log its context ("what was open when it failed").
  const pathname = usePathname();
  useEffect(() => {
    if (ready) diag('nav', pathname);
  }, [ready, pathname]);

  useEffect(() => {
    if (fontsError) diag('fonts', `шрифты не загрузились: ${fontsError.message}`, 'error');
  }, [fontsError]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          {/* Nothing in the app is reachable without a Google sign-in. */}
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="member/[id]" />
            <Stack.Screen name="product/[id]" />
            <Stack.Screen name="recipe/[id]" />
            <Stack.Screen name="cooking/start" />
            <Stack.Screen name="cooking/[id]" />
            <Stack.Screen name="day/add" />
            <Stack.Screen name="day/dish" />
            <Stack.Screen name="day/member" />
            <Stack.Screen name="history" />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="sign-in" />
          </Stack.Protected>
          {/* Invite deep link: reachable signed out too, the screen asks to sign in first. */}
          <Stack.Screen name="join/index" />
          <Stack.Screen name="join/[code]" />
          <Stack.Screen name="diagnostics" />
        </Stack>
        <DevLogButton />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
