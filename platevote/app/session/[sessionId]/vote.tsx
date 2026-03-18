import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { listOptions } from '../../../src/features/options/api';
import { SwipeCard } from '../../../src/features/voting/components/SwipeCard';
import { upsertVote } from '../../../src/features/voting/api';
import { completeSession } from '../../../src/features/session/api';
import { useSessionSubscription } from '../../../src/features/session/hooks/useSessionSubscription';
import { THEME } from '../../../src/lib/constants/theme';
import { useSessionStore } from '../../../src/state/session-store';
import type { RestaurantOption } from '../../../src/features/session/types';

export default function VoteScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { participantId, isHost } = useSessionStore();

  const [options, setOptions] = useState<RestaurantOption[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  // Realtime: navigate when session completes
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

  const handleVote = async (liked: boolean) => {
    const option = options[currentIndex];
    if (!option || !sessionId || !participantId) return;

    try {
      await upsertVote(sessionId, option.id, participantId, liked ? 5 : 1);
    } catch {
      // Vote may fail silently for demo purposes
    }

    const next = currentIndex + 1;
    if (next >= options.length) {
      setDone(true);
      if (isHost) {
        try {
          await completeSession(sessionId);
        } catch {
          // Host completes session
        }
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
        <Text style={styles.emptyText}>No restaurants to vote on.</Text>
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

  return (
    <SafeAreaView style={styles.safe}>
      {/* Progress */}
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {currentIndex + 1} / {options.length}
        </Text>
      </View>

      {/* Card stack */}
      <View style={styles.cardArea}>
        {/* Next card (behind) */}
        {next && (
          <View style={styles.behindCard} pointerEvents="none">
            <SwipeCard option={next} />
          </View>
        )}
        {/* Current card */}
        {current && (
          <SwipeCard
            key={current.id}
            option={current}
            onSwipeLeft={() => handleVote(false)}
            onSwipeRight={() => handleVote(true)}
          />
        )}
      </View>

      {/* No / Yes buttons */}
      <View style={styles.buttonRow}>
        <Pressable style={styles.noButton} onPress={() => handleVote(false)}>
          <Text style={styles.noButtonText}>✕</Text>
        </Pressable>
        <View style={styles.swipeHint}>
          <Text style={styles.swipeHintText}>
            {'← '}
            <Text style={{ color: '#f44336' }}>No</Text>
            {'  ·  '}
            <Text style={{ color: '#4CAF50' }}>Yes</Text>
            {' →'}
          </Text>
        </View>
        <Pressable style={styles.yesButton} onPress={() => handleVote(true)}>
          <Text style={styles.yesButtonText}>♥</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.colors.background },
  progressRow: { alignItems: 'center', paddingTop: 16 },
  progressText: { fontSize: 14, color: THEME.colors.mutedForeground, fontWeight: '600' },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  behindCard: {
    position: 'absolute',
    transform: [{ scale: 0.95 }, { translateY: 16 }],
    opacity: 0.7,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingBottom: 32,
    paddingTop: 16,
  },
  noButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#f44336',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#f44336',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  noButtonText: { fontSize: 24, color: '#f44336' },
  yesButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  yesButtonText: { fontSize: 24, color: '#4CAF50' },
  swipeHint: { flex: 1, alignItems: 'center' },
  swipeHintText: { fontSize: 13, color: THEME.colors.mutedForeground },
  emptyText: { fontSize: 16, color: THEME.colors.mutedForeground },
  doneEmoji: { fontSize: 56, marginBottom: 16 },
  doneTitle: { fontSize: 28, fontWeight: '700', color: THEME.colors.foreground },
  doneSubtitle: { fontSize: 16, color: THEME.colors.mutedForeground, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
});
