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
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../src/lib/supabase/client';

import { addOption, type AddOptionInput } from '../../../src/features/options/api';
import { spawnDemoBot } from '../../../src/features/bot/demo-bot';
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
  const [botSpawned, setBotSpawned] = useState(false);

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
      const allRecs = await getRecommendations(sessionId, filters);
      // filter out restaurants already added to the session
      const existingNames = new Set([
        ...options.map((o) => o.name.toLowerCase()),
        ...addedNames,
      ]);
      const nextRecommendations = allRecs.filter(
        (r) => !existingNames.has(r.name.toLowerCase()),
      );
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
      setAddedNames(new Set());
      return;
    }

    void loadRecommendations();
  }, [loadRecommendations, showAddModal]);

  const addOptionToSession = async (input: AddOptionInput, keepOpen = false) => {
    if (!sessionId || !participantId) return;
    setAddLoading(true);
    try {
      await addOption(sessionId, input, participantId);
      setOptionName('');
      setOptionCuisine('');
      if (!keepOpen) {
        setShowAddModal(false);
      }
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

  // track names of restaurants already added so we don't show them again
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set());

  const handleAddRecommendation = async (recommendation: Recommendation) => {
    // remove from list and remember the name
    setRecommendations((prev) => prev.filter((r) => r.id !== recommendation.id));
    setAddedNames((prev) => new Set(prev).add(recommendation.name.toLowerCase()));
    await addOptionToSession({
      name: recommendation.name,
      cuisine: recommendation.cuisine,
      priceLevel: recommendation.priceLevel,
      distanceMiles: recommendation.distanceMiles,
      imageUrl: recommendation.imageUrl,
    }, true);
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

        {/* Demo bot button - adds a fake player for testing */}
        {dynamicIsHost && !botSpawned && sessionId && (
          <Pressable
            style={styles.botButton}
            onPress={() => {
              setBotSpawned(true);
              void spawnDemoBot(sessionId);
            }}
          >
            <Ionicons name="person-add-outline" size={16} color={THEME.colors.secondary} />
            <Text style={styles.botButtonText}>Add Demo Player</Text>
          </Pressable>
        )}
        {botSpawned && (
          <Text style={styles.botHint}>Bot joined! It will vote automatically when voting starts.</Text>
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
            {/* Header with close button */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Restaurant</Text>
              <Pressable onPress={() => setShowAddModal(false)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={THEME.colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {/* Search section */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <Ionicons name="search" size={16} color={THEME.colors.primary} />
                  <Text style={styles.modalSectionTitle}>Find Nearby</Text>
                </View>
                <View style={styles.searchRow}>
                  <TextInput
                    placeholder="Location"
                    placeholderTextColor={THEME.colors.mutedForeground}
                    style={[styles.modalInput, styles.searchInputHalf]}
                    value={recommendationLocation}
                    onChangeText={setRecommendationLocation}
                    returnKeyType="next"
                  />
                  <TextInput
                    placeholder="Cuisine"
                    placeholderTextColor={THEME.colors.mutedForeground}
                    style={[styles.modalInput, styles.searchInputHalf]}
                    value={recommendationCuisine}
                    onChangeText={setRecommendationCuisine}
                    returnKeyType="next"
                  />
                </View>
                <View style={styles.priceAndSearch}>
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
                  </View>
                  <Pressable
                    style={[styles.searchButton, recsLoading && styles.disabled]}
                    onPress={() => { void loadRecommendations(); }}
                    disabled={recsLoading}
                  >
                    <Ionicons name="search" size={16} color="#fff" />
                    <Text style={styles.searchButtonText}>Search</Text>
                  </Pressable>
                </View>
              </View>

              {/* Recommendations */}
              {recsLoading ? (
                <View style={styles.recommendationsLoadingRow}>
                  <ActivityIndicator size="small" color={THEME.colors.primary} />
                  <Text style={styles.recommendationsLoadingText}>Searching restaurants...</Text>
                </View>
              ) : recommendations.length > 0 ? (
                <View style={styles.recommendationsSection}>
                  {recommendations.map((recommendation) => (
                    <Pressable
                      key={recommendation.id}
                      style={[styles.recommendationItem, addLoading && styles.disabled]}
                      disabled={addLoading}
                      onPress={() => { void handleAddRecommendation(recommendation); }}
                    >
                      <View style={styles.recThumb}>
                        <Text style={styles.recThumbText}>{recommendation.name[0].toUpperCase()}</Text>
                      </View>
                      <View style={styles.recommendationTextWrap}>
                        <Text style={styles.recommendationName}>{recommendation.name}</Text>
                        <Text style={styles.recommendationMeta}>
                          {[
                            recommendation.cuisine,
                            recommendation.priceLevel ? '$'.repeat(recommendation.priceLevel) : null,
                            recommendation.distanceMiles ? `${recommendation.distanceMiles} mi` : null,
                          ].filter(Boolean).join('  ·  ') || 'Restaurant'}
                        </Text>
                      </View>
                      <View style={styles.addIconButton}>
                        <Ionicons name="add" size={20} color={THEME.colors.primary} />
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {/* Manual add divider */}
              <View style={styles.modalDivider}>
                <View style={styles.modalDividerLine} />
                <Text style={styles.modalDividerText}>or add manually</Text>
                <View style={styles.modalDividerLine} />
              </View>

              {/* Manual add section */}
              <View style={styles.modalSection}>
                <TextInput
                  placeholder="Restaurant name"
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
                <Pressable
                  style={[styles.manualAddButton, (!optionName.trim() || addLoading) && styles.disabled]}
                  disabled={!optionName.trim() || addLoading}
                  onPress={handleAddOption}
                >
                  {addLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={18} color="#fff" />
                      <Text style={styles.manualAddButtonText}>Add Restaurant</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
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
  botButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.secondary + '40',
    backgroundColor: THEME.colors.secondary + '12',
    marginBottom: 4,
  },
  botButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.secondary,
  },
  botHint: {
    textAlign: 'center',
    fontSize: 12,
    color: THEME.colors.mutedForeground,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: THEME.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border + '60',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.foreground,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  modalSection: {
    gap: 10,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInputHalf: {
    flex: 1,
  },
  priceAndSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceFilterChips: {
    flexDirection: 'row',
    gap: 6,
  },
  priceChip: {
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: THEME.colors.background,
  },
  priceChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  priceChipText: {
    color: THEME.colors.foreground,
    fontSize: 13,
    fontWeight: '600',
  },
  priceChipTextActive: {
    color: '#fff',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  recommendationsSection: {
    gap: 8,
    marginTop: 14,
  },
  recommendationItem: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 14,
    backgroundColor: THEME.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: THEME.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recThumbText: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  recommendationTextWrap: {
    flex: 1,
    gap: 2,
  },
  recommendationName: {
    color: THEME.colors.foreground,
    fontWeight: '600',
    fontSize: 15,
  },
  recommendationMeta: {
    color: THEME.colors.mutedForeground,
    fontSize: 12,
  },
  addIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.primary + '15',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationsLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  recommendationsLoadingText: {
    color: THEME.colors.mutedForeground,
    fontSize: 13,
  },
  modalDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 18,
  },
  modalDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.border,
  },
  modalDividerText: {
    fontSize: 13,
    color: THEME.colors.mutedForeground,
    fontWeight: '500',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: THEME.colors.foreground,
    backgroundColor: THEME.colors.background,
  },
  manualAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  manualAddButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
