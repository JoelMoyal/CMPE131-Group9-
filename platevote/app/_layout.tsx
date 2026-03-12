import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { THEME } from '../src/lib/constants/theme';

export default function RootLayout() {
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
        <Stack.Screen name="index" options={{ title: 'PlateVote' }} />
        <Stack.Screen
          name="session/[sessionId]/lobby"
          options={{ title: 'Session Lobby' }}
        />
        <Stack.Screen name="session/[sessionId]/vote" options={{ title: 'Vote' }} />
        <Stack.Screen name="session/[sessionId]/result" options={{ title: 'Result' }} />
      </Stack>
    </>
  );
}
