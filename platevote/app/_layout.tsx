import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useAnonymousAuth } from '../src/lib/auth/useAnonymousAuth';
import { THEME } from '../src/lib/constants/theme';

export default function RootLayout() {
  useAnonymousAuth();

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: THEME.colors.background },
          headerTintColor: THEME.colors.foreground,
          contentStyle: { backgroundColor: THEME.colors.background },
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="create-session" options={{ title: 'New Session' }} />
        <Stack.Screen name="preferences" options={{ title: 'Preferences' }} />
        <Stack.Screen
          name="session/[sessionId]/lobby"
          options={{ title: 'Session Lobby' }}
        />
        <Stack.Screen name="session/[sessionId]/vote" options={{ headerShown: false }} />
        <Stack.Screen name="session/[sessionId]/result" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
