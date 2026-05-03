import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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

  // which breakdown row is expanded to show voters
  const [expandedOptionId, setExpandedOptionId] = useState<string | null>(null);

  // flip animation for the winner card
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  // use scale + opacity for a smooth flip effect that works on all platforms
  // front shrinks to 0 width then hides, back grows from 0
  const frontScale = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });
  const backScale = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.49, 0.5],
    outputRange: [1, 1, 0],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.51],
    outputRange: [0, 0, 1],
  });

  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      try {
        const [options, votes] = await Promise.all([
          listOptions(sessionId),
          listVotes(sessionId),
        ]);

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

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topSection}>
          <Text style={styles.announcement}>And the winner is...</Text>
          <Text style={styles.winnerName}>{winner?.name ?? 'No winner'}</Text>
        </View>

        {/* Flippable winner card - tap to see venue details */}
        <Pressable onPress={handleFlip} style={styles.flipContainer}>
          {/* Front side - photo or initial */}
          <Animated.View style={[styles.cardSide, { transform: [{ scaleX: frontScale }], opacity: frontOpacity }]}>
            {winner?.imageUrl ? (
              <Image
                source={{ uri: winner.imageUrl }}
                style={styles.photoImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.winnerInitial}>{winner?.name?.[0]?.toUpperCase() ?? '?'}</Text>
                {winner?.cuisine ? <Text style={styles.winnerCuisine}>{winner.cuisine}</Text> : null}
              </View>
            )}
            <Text style={styles.flipHint}>Tap for details</Text>
          </Animated.View>

          {/* Back side - venue info */}
          <Animated.View style={[styles.cardSide, styles.cardBack, { transform: [{ scaleX: backScale }], opacity: backOpacity }]}>
            <Text style={styles.backTitle}>{winner?.name ?? 'Unknown'}</Text>
            <View style={styles.backDetails}>
              {winner?.cuisine ? (
                <View style={styles.backRow}>
                  <Text style={styles.backLabel}>Cuisine</Text>
                  <Text style={styles.backValue}>{winner.cuisine}</Text>
                </View>
              ) : null}
              <View style={styles.backRow}>
                <Text style={styles.backLabel}>Avg Score</Text>
                <Text style={styles.backValue}>{winner?.avgScore.toFixed(1) ?? '-'}</Text>
              </View>
              <View style={styles.backRow}>
                <Text style={styles.backLabel}>Votes</Text>
                <Text style={styles.backValue}>{winner?.voteCount ?? 0}</Text>
              </View>
              {winner?.distanceMiles ? (
                <View style={styles.backRow}>
                  <Text style={styles.backLabel}>Distance</Text>
                  <Text style={styles.backValue}>{winner.distanceMiles} mi</Text>
                </View>
              ) : null}
              {/* show who voted yes for the winner */}
              {winner && (
                <View style={styles.backVotersSection}>
                  <Text style={styles.backLabel}>Voted Yes</Text>
                  <View style={styles.backVotersList}>
                    {allVotes
                      .filter((v) => v.optionId === winner.id && v.score === 5)
                      .map((v) => {
                        const p = participants.find((p) => p.id === v.participantId);
                        return (
                          <View key={v.id} style={styles.voterChip}>
                            <Text style={styles.voterChipText}>{p?.displayName ?? 'Someone'}</Text>
                          </View>
                        );
                      })}
                  </View>
                </View>
              )}
            </View>
            <Text style={styles.flipHintBack}>Tap to flip back</Text>
          </Animated.View>
        </Pressable>

        {winner && (
          <Text style={styles.stats}>
            {winner.avgScore.toFixed(1)} avg · {winner.voteCount} vote{winner.voteCount !== 1 ? 's' : ''}
            {winner.distanceMiles ? `  ·  ${winner.distanceMiles} mi` : ''}
          </Text>
        )}

        {/* Vote breakdown - tap a row to see who voted */}
        {allOptions.length > 0 && (
          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownTitle}>Vote Breakdown</Text>
            {allOptions.map((opt) => {
              const optVotes = allVotes.filter((v) => v.optionId === opt.id);
              const avg = optVotes.length
                ? optVotes.reduce((a, v) => a + v.score, 0) / optVotes.length
                : 0;
              const isWinner = opt.id === winner?.id;
              const isExpanded = expandedOptionId === opt.id;

              return (
                <Pressable
                  key={opt.id}
                  style={[styles.breakdownRow, isWinner && styles.breakdownRowWinner]}
                  onPress={() => setExpandedOptionId(isExpanded ? null : opt.id)}
                >
                  <View style={styles.breakdownInfo}>
                    <View style={styles.breakdownTop}>
                      <Text style={[styles.breakdownName, isWinner && styles.breakdownNameWinner]}>
                        {opt.name} {isWinner ? '👑' : ''}
                      </Text>
                      <Text style={styles.breakdownChevron}>{isExpanded ? '▴' : '▾'}</Text>
                    </View>
                    <Text style={styles.breakdownMeta}>
                      {avg.toFixed(1)} avg · {optVotes.length} vote{optVotes.length !== 1 ? 's' : ''}
                    </Text>

                    {/* expanded voter list */}
                    {isExpanded && optVotes.length > 0 && (
                      <View style={styles.voterList}>
                        {optVotes.map((v) => {
                          const p = participants.find((p) => p.id === v.participantId);
                          const name = p?.displayName ?? 'Someone';
                          const voted = v.score === 5;
                          return (
                            <View key={v.id} style={styles.voterRow}>
                              <View style={[styles.voteDot, { backgroundColor: voted ? '#4CAF50' : '#f44336' }]} />
                              <Text style={styles.voterName}>{name}</Text>
                              <Text style={[styles.voterVote, { color: voted ? '#4CAF50' : '#f44336' }]}>
                                {voted ? 'Yes' : 'No'}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                    {isExpanded && optVotes.length === 0 && (
                      <Text style={styles.noVotesText}>No votes yet</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={handleNewSession}>
            <Text style={styles.primaryButtonText}>New Session</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.colors.background },
  container: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
    gap: 16,
  },
  topSection: { alignItems: 'center', gap: 8 },
  announcement: {
    fontSize: 18,
    color: THEME.colors.mutedForeground,
    fontWeight: '500',
  },
  winnerName: {
    fontSize: 38,
    fontWeight: '900',
    color: THEME.colors.foreground,
    textAlign: 'center',
    lineHeight: 44,
  },
  // flip card
  flipContainer: {
    width: '100%',
    height: 220,
  },
  cardSide: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: THEME.colors.card,
    borderWidth: 2,
    borderColor: THEME.colors.primary + '40',
    padding: 20,
    justifyContent: 'center',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: THEME.colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.primary + '40',
    borderRadius: 20,
  },
  photoImage: {
    width: '100%',
    height: '100%',
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
  flipHint: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  flipHintBack: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    fontSize: 12,
    color: THEME.colors.mutedForeground,
  },
  backTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.foreground,
    marginBottom: 12,
  },
  backDetails: {
    gap: 8,
  },
  backRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backLabel: {
    fontSize: 14,
    color: THEME.colors.mutedForeground,
    fontWeight: '500',
  },
  backValue: {
    fontSize: 14,
    color: THEME.colors.foreground,
    fontWeight: '700',
  },
  backVotersSection: {
    marginTop: 4,
    gap: 6,
  },
  backVotersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  voterChip: {
    backgroundColor: '#4CAF50' + '20',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#4CAF50' + '40',
  },
  voterChipText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
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
  // breakdown
  breakdownSection: {
    width: '100%',
    gap: 8,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.foreground,
  },
  breakdownRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  breakdownRowWinner: {
    backgroundColor: THEME.colors.primary + '12',
    borderColor: THEME.colors.primary + '40',
  },
  breakdownInfo: {
    gap: 4,
  },
  breakdownTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownName: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.foreground,
    flex: 1,
  },
  breakdownNameWinner: {
    color: THEME.colors.primary,
  },
  breakdownChevron: {
    fontSize: 13,
    color: THEME.colors.mutedForeground,
  },
  breakdownMeta: {
    fontSize: 13,
    color: THEME.colors.mutedForeground,
  },
  // expanded voter list
  voterList: {
    marginTop: 8,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border + '60',
    paddingTop: 8,
  },
  voterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  voterName: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.foreground,
  },
  voterVote: {
    fontSize: 13,
    fontWeight: '700',
  },
  noVotesText: {
    marginTop: 6,
    fontSize: 13,
    color: THEME.colors.mutedForeground,
    fontStyle: 'italic',
  },
});
