import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { THEME } from '../../../src/lib/constants/theme';

export default function SessionLobbyScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  return (
    <View style={styles.page}>
      <Text style={styles.heading}>Session {sessionId}</Text>
      <Text style={styles.subheading}>Lobby scaffold: participants and restaurant options will appear here.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Next step</Text>
        <Text style={styles.cardBody}>Wire create/join + list option APIs to Supabase.</Text>
      </View>

      <Link href={{ pathname: '/session/[sessionId]/vote', params: { sessionId } }} asChild>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Go To Voting</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 24,
    gap: 16,
    backgroundColor: THEME.colors.background,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.colors.foreground,
  },
  subheading: {
    color: THEME.colors.mutedForeground,
    fontSize: 15,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.card,
    padding: 16,
    gap: 6,
  },
  cardTitle: {
    fontWeight: '700',
    color: THEME.colors.foreground,
  },
  cardBody: {
    color: THEME.colors.mutedForeground,
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: THEME.colors.primaryForeground,
    fontWeight: '700',
  },
});
