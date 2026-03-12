import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { computeWinner } from '../../../src/features/results/selectors';
import { THEME } from '../../../src/lib/constants/theme';

const DEMO_OPTIONS = [
  { id: 'o1', name: 'Sushi Place', createdAt: '2026-03-11T00:00:00.000Z', distanceMiles: 1.2 },
  { id: 'o2', name: 'Taco Spot', createdAt: '2026-03-11T00:01:00.000Z', distanceMiles: 0.6 },
];

const DEMO_VOTES = [
  { optionId: 'o1', score: 4 },
  { optionId: 'o1', score: 5 },
  { optionId: 'o2', score: 5 },
  { optionId: 'o2', score: 3 },
];

export default function ResultScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const winner = computeWinner(DEMO_OPTIONS, DEMO_VOTES);

  return (
    <View style={styles.page}>
      <Text style={styles.heading}>Final Pick</Text>
      <Text style={styles.subheading}>Session {sessionId}</Text>

      <View style={styles.card}>
        <Text style={styles.winnerLabel}>Winner</Text>
        <Text style={styles.winnerName}>{winner?.name ?? 'No winner yet'}</Text>
        <Text style={styles.summary}>Demo calculation with tie-break scaffold.</Text>
      </View>
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
  winnerLabel: {
    color: THEME.colors.mutedForeground,
    fontSize: 13,
  },
  winnerName: {
    color: THEME.colors.foreground,
    fontWeight: '700',
    fontSize: 26,
  },
  summary: {
    color: THEME.colors.mutedForeground,
    fontSize: 14,
  },
});
