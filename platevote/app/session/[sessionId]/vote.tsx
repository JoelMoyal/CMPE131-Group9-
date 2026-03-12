import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScorePicker } from '../../../src/features/voting/components/ScorePicker';
import { THEME } from '../../../src/lib/constants/theme';

export default function VoteScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  return (
    <View style={styles.page}>
      <Text style={styles.heading}>Vote</Text>
      <Text style={styles.subheading}>Session {sessionId}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Example restaurant</Text>
        <Text style={styles.cardBody}>Score this option from 1 to 5.</Text>
        <ScorePicker value={3} onChange={() => {}} />
      </View>

      <Link href={{ pathname: '/session/[sessionId]/result', params: { sessionId } }} asChild>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>See Result</Text>
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
