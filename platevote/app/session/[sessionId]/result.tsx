import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { listOptions } from '../../../src/features/options/api';
import { listVotes } from '../../../src/features/voting/api';
import { computeWinner } from '../../../src/features/results/selectors';
import { ConfettiOverlay } from '../../../src/features/results/components/ConfettiOverlay';
import { THEME } from '../../../src/lib/constants/theme';
import { useSessionStore } from '../../../src/state/session-store';
import type { WinnerResult } from '../../../src/features/results/selectors';

export default function ResultScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const clearSession = useSessionStore((s) => s.clearSession);

  const [winner, setWinner] = useState<WinnerResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      try {
        const [options, votes] = await Promise.all([
          listOptions(sessionId),
          listVotes(sessionId),
        ]);
        const result = computeWinner(options, votes);
        setWinner(result);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  const handleNewSession = () => {
    clearSession();
    router.replace('/');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={THEME.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ConfettiOverlay active={true} />

      <View style={styles.container}>
        <View style={styles.topSection}>
          <Text style={styles.announcement}>And the winner is...</Text>
          <Text style={styles.winnerName}>{winner?.name ?? 'No winner'}</Text>
        </View>

        {/* Winner photo placeholder or color block */}
        <View style={styles.photoContainer}>
          <View style={[styles.photoPlaceholder]}>
            <Text style={styles.photoEmoji}>🍽️</Text>
          </View>
        </View>

        {winner && (
          <Text style={styles.stats}>
            {winner.avgScore.toFixed(1)} avg · {winner.voteCount} vote{winner.voteCount !== 1 ? 's' : ''}
            {winner.distanceMiles ? `  ·  ${winner.distanceMiles} mi` : ''}
          </Text>
        )}

        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={handleNewSession}>
            <Text style={styles.primaryButtonText}>New Session</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => {}}>
            <Text style={styles.secondaryButtonText}>Just Spoiler</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.colors.background },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
  topSection: { alignItems: 'center', gap: 8 },
  announcement: {
    fontSize: 18,
    color: THEME.colors.mutedForeground,
    fontWeight: '500',
  },
  winnerName: {
    fontSize: 40,
    fontWeight: '900',
    color: THEME.colors.foreground,
    textAlign: 'center',
    lineHeight: 46,
  },
  photoContainer: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  photoPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: THEME.colors.primary + '30',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.primary + '40',
  },
  photoEmoji: { fontSize: 72 },
  stats: {
    fontSize: 15,
    color: THEME.colors.mutedForeground,
    fontWeight: '500',
  },
  actions: { width: '100%', gap: 12 },
  primaryButton: {
    borderRadius: THEME.radius.input,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: THEME.colors.primaryForeground,
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    borderRadius: THEME.radius.input,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
  },
  secondaryButtonText: {
    color: THEME.colors.foreground,
    fontWeight: '600',
    fontSize: 15,
  },
});
