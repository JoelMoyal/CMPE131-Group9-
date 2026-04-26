import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { listOptions } from '../../../src/features/options/api';
import { SwipeCard } from '../../../src/features/voting/components/SwipeCard';
import { upsertVote } from '../../../src/features/voting/api';
import { completeSession } from '../../../src/features/session/api';
import { useSessionSubscription } from '../../../src/features/session/hooks/useSessionSubscription';
import { THEME } from '../../../src/lib/constants/theme';
import { useSessionStore } from '../../../src/state/session-store';
import type { RestaurantOption } from '../../../src/features/session/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VoteScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { participantId, isHost } = useSessionStore();

  const [options, setOptions] = useState<RestaurantOption[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  // poll for session status - when completed, go to results
  const { session } = useSessionSubscription(sessionId ?? null);
  useEffect(() => {
    if (session?.status === 'completed') {
      router.replace({ pathname: '/session/[sessionId]/result', params: { sessionId } });
    }
  }, [session?.status, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    listOptions(sessionId)
      .then((data) => setOptions(data))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // score 5 = liked, score 1 = nope
  const handleVote = async (liked: boolean) => {
    const option = options[currentIndex];
    if (!option || !sessionId || !participantId) return;

    try {
      await upsertVote(sessionId, option.id, participantId, liked ? 5 : 1);
    } catch {
      // vote may fail silently for demo
    }

    const next = currentIndex + 1;
    if (next >= options.length) {
      setDone(true);
      if (isHost) {
        try { await completeSession(sessionId); } catch {}
      }
    } else {
      setCurrentIndex(next);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={THEME.colors.primary} size="large" />
      </View>
    );
  }

  if (options.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="restaurant-outline" size={48} color={THEME.colors.mutedForeground} />
        <Text style={styles.emptyText}>No restaurants to vote on</Text>
      </View>
    );
  }

  if (done) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.doneEmoji}>🍽️</Text>
          <Text style={styles.doneTitle}>All done!</Text>
          <Text style={styles.doneSubtitle}>
            {isHost ? 'Tallying results...' : 'Waiting for everyone to finish...'}
          </Text>
          <ActivityIndicator color={THEME.colors.primary} style={{ marginTop: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  const current = options[currentIndex];
  const next = options[currentIndex + 1];
  const progress = (currentIndex + 1) / options.length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Progress bar + counter */}
      <View style={styles.progressSection}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {currentIndex + 1} of {options.length}
        </Text>
      </View>

      {/* Card stack */}
      <View style={styles.cardArea}>
        {/* next card peeking behind */}
        {next && (
          <View style={styles.behindCard} pointerEvents="none">
            <SwipeCard option={next} />
          </View>
        )}
        {/* current card to swipe */}
        {current && (
          <SwipeCard
            key={current.id}
            option={current}
            onSwipeLeft={() => handleVote(false)}
            onSwipeRight={() => handleVote(true)}
          />
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.bottomSection}>
        <Pressable style={styles.noButton} onPress={() => handleVote(false)}>
          <Ionicons name="close" size={28} color="#f44336" />
        </Pressable>

        <View style={styles.swipeHint}>
          <Text style={styles.swipeHintText}>Swipe to vote</Text>
          <View style={styles.swipeArrows}>
            <Ionicons name="arrow-back" size={14} color="#f44336" />
            <Text style={styles.swipeHintSmall}> Pass  ·  Like </Text>
            <Ionicons name="arrow-forward" size={14} color="#4CAF50" />
          </View>
        </View>

        <Pressable style={styles.yesButton} onPress={() => handleVote(true)}>
          <Ionicons name="heart" size={26} color="#4CAF50" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.background,
    gap: 12,
  },
  // progress
  progressSection: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 6,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.border,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: THEME.colors.primary,
  },
  progressText: {
    fontSize: 13,
    color: THEME.colors.mutedForeground,
    fontWeight: '600',
  },
  // card
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  behindCard: {
    position: 'absolute',
    transform: [{ scale: 0.93 }, { translateY: 20 }],
    opacity: 0.5,
  },
  // bottom buttons
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 36,
    paddingTop: 12,
  },
  noButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.colors.card,
    borderWidth: 2,
    borderColor: '#f44336' + '40',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f44336',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  yesButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.colors.card,
    borderWidth: 2,
    borderColor: '#4CAF50' + '40',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  swipeHint: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  swipeHintText: {
    fontSize: 14,
    color: THEME.colors.mutedForeground,
    fontWeight: '600',
  },
  swipeArrows: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeHintSmall: {
    fontSize: 12,
    color: THEME.colors.mutedForeground,
  },
  emptyText: {
    fontSize: 16,
    color: THEME.colors.mutedForeground,
    fontWeight: '500',
  },
  doneEmoji: { fontSize: 56, marginBottom: 16 },
  doneTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.colors.foreground,
  },
  doneSubtitle: {
    fontSize: 16,
    color: THEME.colors.mutedForeground,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
