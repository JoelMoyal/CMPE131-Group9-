import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../src/lib/supabase/client';

import { addOption, type AddOptionInput } from '../../../src/features/options/api';
import { OptionRow } from '../../../src/features/options/components/OptionRow';
import {
  getRecommendations,
  type Recommendation,
  type RecommendationFilters,
} from '../../../src/features/recommendations/api';
import { startVoting } from '../../../src/features/session/api';
import { ParticipantAvatar } from '../../../src/features/session/components/ParticipantAvatar';
import { JoinCodeBadge } from '../../../src/features/session/components/JoinCodeBadge';
import { useSessionSubscription } from '../../../src/features/session/hooks/useSessionSubscription';
import { THEME } from '../../../src/lib/constants/theme';
import { useSessionStore } from '../../../src/state/session-store';

export default function SessionLobbyScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { participantId, isHost, setStatus } = useSessionStore();

  const { session, participants, options, loading, refetchOptions } = useSessionSubscription(sessionId ?? null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [optionName, setOptionName] = useState('');
  const [optionCuisine, setOptionCuisine] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recommendationLocation, setRecommendationLocation] = useState('');
  const [recommendationCuisine, setRecommendationCuisine] = useState('');
  const [recommendationPriceLevel, setRecommendationPriceLevel] = useState<number | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [startLoading, setStartLoading] = useState(false);

  const loadRecommendations = useCallback(async () => {
    if (!sessionId) {
      setRecommendations([]);
      return;
    }

    const filters: RecommendationFilters = {
      location: recommendationLocation.trim() || undefined,
      cuisine: recommendationCuisine.trim() || undefined,
      priceLevel: recommendationPriceLevel ?? undefined,
    };

    setRecsLoading(true);
    try {
      const nextRecommendations = await getRecommendations(sessionId, filters);
      setRecommendations(nextRecommendations.slice(0, 5));
    } catch (err: unknown) {
      setRecommendations([]);
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not load recommendations');
    } finally {
      setRecsLoading(false);
    }
  }, [recommendationCuisine, recommendationLocation, recommendationPriceLevel, sessionId]);

  useEffect(() => {
    if (!showAddModal) {
      setRecommendations([]);
      setRecsLoading(false);
      return;
    }

    void loadRecommendations();
  }, [loadRecommendations, showAddModal]);

  const addOptionToSession = async (input: AddOptionInput) => {
    if (!sessionId || !participantId) return;
    setAddLoading(true);
    try {
      await addOption(sessionId, input, participantId);
      setOptionName('');
      setOptionCuisine('');
      setShowAddModal(false);
      await refetchOptions();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not add restaurant');
    } finally {
      setAddLoading(false);
    }
  };

  // Navigate when session status changes (picked up by polling in hook)
  const sessionStatus = session?.status;
  if (sessionStatus === 'voting') {
    router.replace({ pathname: '/session/[sessionId]/vote', params: { sessionId } });
  }
  if (sessionStatus === 'completed') {
    router.replace({ pathname: '/session/[sessionId]/result', params: { sessionId } });
  }

  const handleAddOption = async () => {
    if (!optionName.trim()) return;
    await addOptionToSession({
      name: optionName.trim(),
      cuisine: optionCuisine.trim() || undefined,
    });
  };

  const handleAddRecommendation = async (recommendation: Recommendation) => {
    await addOptionToSession({
      name: recommendation.name,
      cuisine: recommendation.cuisine,
      priceLevel: recommendation.priceLevel,
      distanceMiles: recommendation.distanceMiles,
      imageUrl: recommendation.imageUrl,
    });
  };

  const handleStartVoting = async () => {
    if (!sessionId) return;
    setStartLoading(true);
    try {
      await startVoting(sessionId);
      setStatus('voting');
      router.replace({ pathname: '/session/[sessionId]/vote', params: { sessionId } });
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not start voting');
    } finally {
      setStartLoading(false);
    }
  };

  // Get current user id to check host status dynamically
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  if (!currentUserId && supabase) {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }
  const dynamicIsHost = isHost || (session?.hostUserId != null && session.hostUserId === currentUserId);

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color={THEME.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.sessionTitle}>{session?.title ?? 'Session Lobby'}</Text>
          {session?.joinCode ? <JoinCodeBadge code={session.joinCode} /> : null}
        </View>

        {/* Participants row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.avatarRow}
        >
          {participants.map((p) => (
            <View key={p.id} style={styles.avatarItem}>
              <ParticipantAvatar participant={p} />
              <Text style={styles.avatarName} numberOfLines={1}>{p.displayName}</Text>
            </View>
          ))}
          {participants.length === 0 && (
            <Text style={styles.waitingText}>Waiting for players...</Text>
          )}
        </ScrollView>

        {participants.length > 0 && (
          <Text style={styles.waitingText}>
            {participants.length === 1 ? 'Waiting for more players...' : `${participants.length} players joined`}
          </Text>
        )}

        {/* Added Restaurants */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Added Restaurants</Text>
          <Pressable style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        </View>

        <FlatList
          data={options}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OptionRow option={item} />}
          contentContainerStyle={styles.optionsList}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No restaurants yet. Add one!</Text>
          }
          style={styles.optionsFlex}
        />

        {/* Start Voting button (host only) */}
        {dynamicIsHost && (
          <View style={styles.footer}>
            <Pressable
              style={[
                styles.startButton,
                (options.length === 0 || startLoading) && styles.disabled,
              ]}
              onPress={handleStartVoting}
              disabled={options.length === 0 || startLoading}
            >
              {startLoading ? (
                <ActivityIndicator color={THEME.colors.primaryForeground} />
              ) : (
                <Text style={styles.startButtonText}>Start Voting</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      {/* Add restaurant modal */}
      <Modal visible={showAddModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Restaurant</Text>
            <TextInput
              placeholder="Location (city or neighborhood)"
              placeholderTextColor={THEME.colors.mutedForeground}
              style={styles.modalInput}
              value={recommendationLocation}
              onChangeText={setRecommendationLocation}
              returnKeyType="next"
            />
            <TextInput
              placeholder="Cuisine filter (e.g. Sushi)"
              placeholderTextColor={THEME.colors.mutedForeground}
              style={styles.modalInput}
              value={recommendationCuisine}
              onChangeText={setRecommendationCuisine}
              returnKeyType="next"
            />
            <View style={styles.priceFilterRow}>
              <Text style={styles.priceFilterLabel}>Price</Text>
              <View style={styles.priceFilterChips}>
                {[1, 2, 3, 4].map((price) => {
                  const active = recommendationPriceLevel === price;
                  return (
                    <Pressable
                      key={price}
                      style={[styles.priceChip, active && styles.priceChipActive]}
                      onPress={() => setRecommendationPriceLevel(active ? null : price)}
                    >
                      <Text style={[styles.priceChipText, active && styles.priceChipTextActive]}>
                        {'$'.repeat(price)}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  style={[styles.priceChip, recommendationPriceLevel == null && styles.priceChipActive]}
                  onPress={() => setRecommendationPriceLevel(null)}
                >
                  <Text
                    style={[
                      styles.priceChipText,
                      recommendationPriceLevel == null && styles.priceChipTextActive,
                    ]}
                  >
                    Any
                  </Text>
                </Pressable>
              </View>
            </View>
            <Pressable
              style={[styles.refreshButton, recsLoading && styles.disabled]}
              onPress={() => {
                void loadRecommendations();
              }}
              disabled={recsLoading}
            >
              <Text style={styles.refreshButtonText}>Find Suggestions</Text>
            </Pressable>
            {recsLoading ? (
              <View style={styles.recommendationsLoadingRow}>
                <ActivityIndicator size="small" color={THEME.colors.primary} />
                <Text style={styles.recommendationsLoadingText}>Loading recommendations...</Text>
              </View>
            ) : recommendations.length > 0 ? (
              <View style={styles.recommendationsSection}>
                <Text style={styles.recommendationsTitle}>Recommended</Text>
                <View style={styles.recommendationsList}>
                  {recommendations.map((recommendation) => (
                    <Pressable
                      key={recommendation.id}
                      style={[styles.recommendationItem, addLoading && styles.disabled]}
                      disabled={addLoading}
                      onPress={() => {
                        void handleAddRecommendation(recommendation);
                      }}
                    >
                      <View style={styles.recommendationTextWrap}>
                        <Text style={styles.recommendationName}>{recommendation.name}</Text>
                        {recommendation.cuisine ? (
                          <Text style={styles.recommendationCuisine}>{recommendation.cuisine}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.recommendationAction}>Add</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            <TextInput
              placeholder="Restaurant name *"
              placeholderTextColor={THEME.colors.mutedForeground}
              style={styles.modalInput}
              value={optionName}
              onChangeText={setOptionName}
              returnKeyType="next"
            />
            <TextInput
              placeholder="Cuisine (optional)"
              placeholderTextColor={THEME.colors.mutedForeground}
              style={styles.modalInput}
              value={optionCuisine}
              onChangeText={setOptionCuisine}
              returnKeyType="done"
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelButton} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, (!optionName.trim() || addLoading) && styles.disabled]}
                disabled={!optionName.trim() || addLoading}
                onPress={handleAddOption}
              >
                {addLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Add</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.colors.background },
  container: { flex: 1 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 20, paddingBottom: 12 },
  sessionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: THEME.colors.foreground,
  },
  avatarRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  avatarItem: { alignItems: 'center', gap: 4, maxWidth: 56 },
  avatarName: { fontSize: 11, color: THEME.colors.mutedForeground, textAlign: 'center' },
  waitingText: {
    paddingHorizontal: 20,
    fontSize: 13,
    color: THEME.colors.mutedForeground,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.foreground,
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary + '20',
    borderWidth: 1,
    borderColor: THEME.colors.primary + '60',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  optionsList: { paddingHorizontal: 20, gap: 10, paddingBottom: 16 },
  optionsFlex: { flex: 1 },
  emptyText: {
    textAlign: 'center',
    color: THEME.colors.mutedForeground,
    paddingVertical: 32,
    fontSize: 15,
  },
  footer: { padding: 20, paddingTop: 12 },
  startButton: {
    borderRadius: THEME.radius.input,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 15,
    alignItems: 'center',
  },
  startButtonText: {
    color: THEME.colors.primaryForeground,
    fontWeight: '700',
    fontSize: 16,
  },
  disabled: { opacity: 0.45 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.foreground,
  },
  recommendationsSection: {
    gap: 8,
  },
  recommendationsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.foreground,
  },
  recommendationsList: {
    gap: 8,
  },
  recommendationItem: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.input,
    backgroundColor: THEME.colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  recommendationTextWrap: {
    flex: 1,
    gap: 2,
  },
  recommendationName: {
    color: THEME.colors.foreground,
    fontWeight: '600',
    fontSize: 14,
  },
  recommendationCuisine: {
    color: THEME.colors.mutedForeground,
    fontSize: 12,
  },
  recommendationAction: {
    color: THEME.colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  recommendationsLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  recommendationsLoadingText: {
    color: THEME.colors.mutedForeground,
    fontSize: 13,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: THEME.colors.foreground,
    backgroundColor: THEME.colors.background,
  },
  priceFilterRow: {
    gap: 8,
  },
  priceFilterLabel: {
    fontSize: 13,
    color: THEME.colors.mutedForeground,
    fontWeight: '600',
  },
  priceFilterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceChip: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  priceChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  priceChipText: {
    color: THEME.colors.foreground,
    fontSize: 12,
    fontWeight: '600',
  },
  priceChipTextActive: {
    color: '#fff',
  },
  refreshButton: {
    alignSelf: 'flex-start',
    backgroundColor: THEME.colors.primary + '22',
    borderColor: THEME.colors.primary + '50',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  refreshButtonText: {
    color: THEME.colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    paddingBottom: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: THEME.radius.input,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 15, color: THEME.colors.foreground },
  confirmButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: THEME.radius.input,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
  },
  confirmButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
