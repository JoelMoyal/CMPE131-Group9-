import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { THEME } from '../src/lib/constants/theme';

const DEMO_SESSION_ID = 'demo-session';

export default function HomeScreen() {
  const [displayName, setDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const canCreate = useMemo(() => displayName.trim().length >= 2, [displayName]);
  const canJoin = useMemo(
    () => displayName.trim().length >= 2 && joinCode.trim().length >= 4,
    [displayName, joinCode],
  );

  const handleCreate = () => {
    router.push({
      pathname: '/session/[sessionId]/lobby',
      params: { sessionId: DEMO_SESSION_ID },
    });
  };

  const handleJoin = () => {
    const sessionId = joinCode.trim().toUpperCase();
    router.push({
      pathname: '/session/[sessionId]/lobby',
      params: { sessionId },
    });
  };

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Where should we eat?</Text>
        <Text style={styles.subtitle}>Create or join a PlateVote session.</Text>

        <TextInput
          placeholder="Your display name"
          placeholderTextColor={THEME.colors.mutedForeground}
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
        />

        <Pressable style={[styles.primaryButton, !canCreate && styles.disabled]} disabled={!canCreate} onPress={handleCreate}>
          <Text style={styles.primaryButtonText}>Create Session</Text>
        </Pressable>

        <View style={styles.divider} />

        <TextInput
          placeholder="Join code"
          placeholderTextColor={THEME.colors.mutedForeground}
          style={styles.input}
          value={joinCode}
          onChangeText={setJoinCode}
          autoCapitalize="characters"
          maxLength={6}
        />

        <Pressable style={[styles.secondaryButton, !canJoin && styles.disabled]} disabled={!canJoin} onPress={handleJoin}>
          <Text style={styles.secondaryButtonText}>Join Session</Text>
        </Pressable>

        <Text style={styles.footerNote}>
          Scaffold mode: backend integration will be wired in the next step.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: THEME.colors.background,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.card,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: THEME.colors.foreground,
  },
  subtitle: {
    fontSize: 15,
    color: THEME.colors.mutedForeground,
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    color: THEME.colors.foreground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: THEME.colors.primaryForeground,
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    borderRadius: 10,
    backgroundColor: THEME.colors.secondary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: THEME.colors.secondaryForeground,
    fontWeight: '700',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: 4,
  },
  footerNote: {
    marginTop: 8,
    fontSize: 12,
    color: THEME.colors.mutedForeground,
  },
  disabled: {
    opacity: 0.5,
  },
});
