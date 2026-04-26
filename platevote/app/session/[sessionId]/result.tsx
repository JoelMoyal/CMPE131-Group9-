import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import * as Haptics from 'expo-haptics';
import { listOptions } from '../../../src/features/options/api';
import { listVotes } from '../../../src/features/voting/api';
import { computeWinner } from '../../../src/features/results/selectors';
import { ConfettiOverlay } from '../../../src/features/results/components/ConfettiOverlay';
import { THEME } from '../../../src/lib/constants/theme';
import { useSessionStore } from '../../../src/state/session-store';
import { supabase } from '../../../src/lib/supabase/client';
import type { WinnerResult } from '../../../src/features/results/selectors';
import type { RestaurantOption, Vote, Participant } from '../../../src/features/session/types';

export default function ResultScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const clearSession = useSessionStore((s) => s.clearSession);

  const [winner, setWinner] = useState<WinnerResult | null>(null);
  const [allOptions, setAllOptions] = useState<RestaurantOption[]>([]);
  const [allVotes, setAllVotes] = useState<Vote[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      try {
        const [options, votes] = await Promise.all([
          listOptions(sessionId),
          listVotes(sessionId),
        ]);

        // fetch participants so we can show who voted for what
        let pList: Participant[] = [];
        if (supabase) {
          const { data } = await supabase
            .from('participants')
            .select('id, session_id, user_id, display_name, is_host')
            .eq('session_id', sessionId);
          pList = (data ?? []).map((r: Record<string, unknown>) => ({
            id: r.id as string,
            sessionId: r.session_id as string,
            userId: r.user_id as string,
            displayName: r.display_name as string,
            isHost: r.is_host as boolean,
          }));
        }

        setAllOptions(options);
        setAllVotes(votes);
        setParticipants(pList);
        const result = computeWinner(options, votes);
        setWinner(result);
        // haptic buzz when winner is revealed
        if (result) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
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

        {/* Winner display */}
        <View style={styles.photoContainer}>
          {winner?.imageUrl ? (
            <Image
              source={{ uri: winner.imageUrl }}
              style={styles.photoImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.photoPlaceholder]}>
              <Text style={styles.winnerInitial}>{winner?.name?.[0]?.toUpperCase() ?? '?'}</Text>
              {winner?.cuisine ? <Text style={styles.winnerCuisine}>{winner.cuisine}</Text> : null}
            </View>
          )}
        </View>

        {winner && (
          <Text style={styles.stats}>
            {winner.avgScore.toFixed(1)} avg · {winner.voteCount} vote{winner.voteCount !== 1 ? 's' : ''}
            {winner.distanceMiles ? `  ·  ${winner.distanceMiles} mi` : ''}
          </Text>
        )}

        {/* Vote breakdown */}
        {allOptions.length > 0 && (
          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownTitle}>Vote Breakdown</Text>
            <ScrollView style={styles.breakdownScroll} showsVerticalScrollIndicator={false}>
              {allOptions.map((opt) => {
                const optVotes = allVotes.filter((v) => v.optionId === opt.id);
                const avg = optVotes.length
                  ? optVotes.reduce((a, v) => a + v.score, 0) / optVotes.length
                  : 0;
                const isWinner = opt.id === winner?.id;
                return (
                  <View key={opt.id} style={[styles.breakdownRow, isWinner && styles.breakdownRowWinner]}>
                    <View style={styles.breakdownInfo}>
                      <Text style={[styles.breakdownName, isWinner && styles.breakdownNameWinner]}>
                        {opt.name} {isWinner ? '👑' : ''}
                      </Text>
                      <Text style={styles.breakdownMeta}>
                        {avg.toFixed(1)} avg · {optVotes.length} vote{optVotes.length !== 1 ? 's' : ''}
                      </Text>
                      {optVotes.length > 0 && (
                        <Text style={styles.breakdownVoters}>
                          {optVotes.map((v) => {
                            const p = participants.find((p) => p.id === v.participantId);
                            const name = p?.displayName ?? 'Someone';
                            return `${name}: ${v.score === 5 ? 'Yes' : 'No'}`;
                          }).join('  ·  ')}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={handleNewSession}>
            <Text style={styles.primaryButtonText}>New Session</Text>
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
  photoImage: {
    width: '100%',
    height: 200,
    borderRadius: 20,
  },
  winnerInitial: {
    fontSize: 56,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  winnerCuisine: {
    fontSize: 16,
    color: THEME.colors.mutedForeground,
    marginTop: 4,
    fontWeight: '500',
  },
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
  breakdownSection: {
    width: '100%',
    maxHeight: 200,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.foreground,
    marginBottom: 8,
  },
  breakdownScroll: {
    flex: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  breakdownRowWinner: {
    backgroundColor: THEME.colors.primary + '15',
    borderColor: THEME.colors.primary + '40',
  },
  breakdownInfo: {
    flex: 1,
    gap: 2,
  },
  breakdownName: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.foreground,
  },
  breakdownNameWinner: {
    color: THEME.colors.primary,
  },
  breakdownMeta: {
    fontSize: 13,
    color: THEME.colors.mutedForeground,
  },
  breakdownVoters: {
    fontSize: 12,
    color: THEME.colors.mutedForeground,
    marginTop: 2,
  },
});
