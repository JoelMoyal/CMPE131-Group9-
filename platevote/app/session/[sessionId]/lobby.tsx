import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
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
import {
  getTimeAvailability,
  getTimeSlots,
  setTimeAvailability,
  startVoting,
} from '../../../src/features/session/api';
import type { TimeAvailability, TimeSlot } from '../../../src/features/session/types';
import { ParticipantAvatar } from '../../../src/features/session/components/ParticipantAvatar';
import { JoinCodeBadge } from '../../../src/features/session/components/JoinCodeBadge';
import { useSessionSubscription } from '../../../src/features/session/hooks/useSessionSubscription';
import { THEME } from '../../../src/lib/constants/theme';
import { useSessionStore } from '../../../src/state/session-store';

type SlotLayout = { x: number; y: number; width: number; height: number };

// Returns a background color based on how many people are free out of total
function getHeatColor(count: number, total: number, isMe: boolean): string {
  if (count === 0) return THEME.colors.card;
  const ratio = total > 0 ? count / total : 0;
  if (isMe && ratio >= 1) return THEME.colors.primary;
  if (ratio >= 1)    return THEME.colors.primary;
  if (ratio >= 0.75) return THEME.colors.primary + 'CC';
  if (ratio >= 0.5)  return THEME.colors.primary + '80';
  if (ratio >= 0.25) return THEME.colors.primary + '40';
  return THEME.colors.primary + '20';
}

function getHeatBorder(count: number, total: number): string {
  if (count === 0) return THEME.colors.border;
  const ratio = total > 0 ? count / total : 0;
  if (ratio >= 0.75) return THEME.colors.primary;
  if (ratio >= 0.25) return THEME.colors.primary + '80';
  return THEME.colors.border;
}

export default function SessionLobbyScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { participantId, isHost, setStatus } = useSessionStore();

  const { session, participants, options, loading, refetchOptions } = useSessionSubscription(sessionId ?? null);

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [timeAvailabilityMap, setTimeAvailabilityMap] = useState<Record<string, TimeAvailability[]>>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

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
  const [botCount, setBotCount] = useState(0);

  // Drag selection for availability grid
  const slotLayouts = useRef<Map<string, SlotLayout>>(new Map());
  const gridContainerRef = useRef<View>(null);
  const gridOrigin = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragValueRef = useRef<boolean>(true);
  const lastToggledKey = useRef<string | null>(null);

  const getKeyFromPoint = (pageX: number, pageY: number): string | null => {
    const relX = pageX - gridOrigin.current.x;
    const relY = pageY - gridOrigin.current.y;
    for (const [key, layout] of slotLayouts.current.entries()) {
      if (
        relX >= layout.x && relX <= layout.x + layout.width &&
        relY >= layout.y && relY <= layout.y + layout.height
      ) {
        return key;
      }
    }
    return null;
  };

  const myAvailabilityRef = useRef<Record<string, boolean>>({});

  const toggleSlot = async (key: string, value: boolean) => {
    const slot = timeSlots.find((s) => slotKey(s) === key);
    if (!slot || !participantId) return;
    try {
      await setTimeAvailability(participantId, slot.id, value);
      await loadTimeData();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unable to update availability');
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        const key = getKeyFromPoint(pageX, pageY);
        if (!key) return;
        const currentVal = myAvailabilityRef.current[key] ?? false;
        dragValueRef.current = !currentVal;
        lastToggledKey.current = key;
        void toggleSlot(key, dragValueRef.current);
      },
      onPanResponderMove: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        const key = getKeyFromPoint(pageX, pageY);
        if (!key || key === lastToggledKey.current) return;
        lastToggledKey.current = key;
        void toggleSlot(key, dragValueRef.current);
      },
      onPanResponderRelease: () => { lastToggledKey.current = null; },
      onPanResponderTerminate: () => { lastToggledKey.current = null; },
    }),
  ).current;

  const getDayLabel = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'short' });

  const getTimeLabel = (date: Date) => {
    const hour = date.getHours();
    return `${hour % 12 === 0 ? 12 : hour % 12} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const slotKey = (slot: TimeSlot) => {
    const date = new Date(slot.startTime);
    return `${getDayLabel(date)}|${getTimeLabel(date)}`;
  };

  const days = Array.from(
    new Set(
      [...timeSlots]
        .filter((slot) => {
          const date = new Date(slot.startTime);
          const dayDiff = Math.floor((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return dayDiff >= 0 && dayDiff < 4;
        })
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .map((slot) => getDayLabel(new Date(slot.startTime))),
    ),
  );

  const times = Array.from(
    new Set(
      [...timeSlots]
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .map((slot) => getTimeLabel(new Date(slot.startTime))),
    ),
  );

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const GRID_LABEL_WIDTH = 56;
  const GRID_GUTTER = 8;
  const CELL_WIDTH = Math.max(
    90,
    Math.floor((SCREEN_WIDTH - 40 - GRID_LABEL_WIDTH - GRID_GUTTER * days.length) / Math.max(1, days.length)),
  );
  const CELL_HEIGHT = 44;

  const loadTimeData = useCallback(async () => {
    if (!sessionId || !session?.enableTimeSelection) return;
    setAvailabilityLoading(true);
    try {
      const [slots, availability] = await Promise.all([
        getTimeSlots(sessionId),
        getTimeAvailability(sessionId),
      ]);
      setTimeSlots(slots);
      setTimeAvailabilityMap(availability);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unable to load time availability');
    } finally {
      setAvailabilityLoading(false);
    }
  }, [sessionId, session?.enableTimeSelection]);

  const myAvailability = timeSlots.reduce<Record<string, boolean>>((acc, slot) => {
    const availability = timeAvailabilityMap[slot.id]?.find((item) => item.participantId === participantId);
    if (availability?.available) acc[slotKey(slot)] = true;
    return acc;
  }, {});

  // Keep ref in sync for PanResponder (closure-safe)
  useEffect(() => {
    myAvailabilityRef.current = myAvailability;
  });

  const availabilityCounts = timeSlots.reduce<Record<string, number>>((acc, slot) => {
    acc[slotKey(slot)] = timeAvailabilityMap[slot.id]?.filter((item) => item.available).length ?? 0;
    return acc;
  }, {});

  useEffect(() => {
    void loadTimeData();
  }, [loadTimeData]);

  useEffect(() => {
    if (!session?.enableTimeSelection) return;
    const interval = setInterval(() => { void loadTimeData(); }, 5000);
    return () => clearInterval(interval);
  }, [loadTimeData, session?.enableTimeSelection]);

  const loadRecommendations = useCallback(async () => {
    if (!sessionId) { setRecommendations([]); return; }
    const filters: RecommendationFilters = {
      location: recommendationLocation.trim() || undefined,
      cuisine: recommendationCuisine.trim() || undefined,
      priceLevel: recommendationPriceLevel ?? undefined,
    };
    setRecsLoading(true);
    try {
      const allRecs = await getRecommendations(sessionId, filters);
      const existingNames = new Set([
        ...options.map((o) => o.name.toLowerCase()),
        ...addedNames,
      ]);
      const nextRecommendations = allRecs.filter((r) => !existingNames.has(r.name.toLowerCase()));
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
      if (!keepOpen) setShowAddModal(false);
      await refetchOptions();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not add restaurant');
    } finally {
      setAddLoading(false);
    }
  };

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

  const [addedNames, setAddedNames] = useState<Set<string>>(new Set());

  const handleAddRecommendation = async (recommendation: Recommendation) => {
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
        <View style={styles.header}>
          <Text style={styles.sessionTitle}>{session?.title ?? 'Session Lobby'}</Text>
          {session?.joinCode ? <JoinCodeBadge code={session.joinCode} /> : null}
        </View>

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

        {session?.enableTimeSelection && (
          <View style={styles.timeSection}>
            <Text style={styles.sectionTitle}>When can your group eat?</Text>
            <Text style={styles.timeSectionDescription}>
              Tap or drag to mark your availability. Darker = more people free.
            </Text>

            {availabilityLoading ? (
              <View style={styles.timeLoadingRow}>
                <ActivityIndicator color={THEME.colors.primary} />
                <Text style={styles.timeLoadingText}>Loading availability...</Text>
              </View>
            ) : (
              <View>
                {/* Legend */}
                <View style={styles.heatLegend}>
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                    <View key={ratio} style={styles.heatLegendItem}>
                      <View
                        style={[
                          styles.heatLegendSwatch,
                          {
                            backgroundColor: ratio === 0
                              ? THEME.colors.card
                              : ratio >= 1
                              ? THEME.colors.primary
                              : ratio >= 0.75
                              ? THEME.colors.primary + 'CC'
                              : ratio >= 0.5
                              ? THEME.colors.primary + '80'
                              : THEME.colors.primary + '40',
                            borderColor: ratio === 0 ? THEME.colors.border : THEME.colors.primary,
                          },
                        ]}
                      />
                      <Text style={styles.heatLegendText}>
                        {ratio === 0 ? 'None' : ratio >= 1 ? 'All' : `${Math.round(ratio * 100)}%`}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Day headers */}
                <View style={[styles.timeHeaderRow, { paddingLeft: 0 }]}>
                  <View style={{ width: GRID_LABEL_WIDTH }} />
                  {days.map((day, index) => (
                    <Text
                      key={day}
                      style={[
                        styles.timeHeaderText,
                        {
                          width: CELL_WIDTH,
                          marginRight: index === days.length - 1 ? 0 : GRID_GUTTER,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {day}
                    </Text>
                  ))}
                </View>

                {/* Draggable grid */}
                <View
                  ref={gridContainerRef}
                  onLayout={() => {
                    gridContainerRef.current?.measureInWindow((x, y) => {
                      gridOrigin.current = { x, y };
                    });
                  }}
                  {...panResponder.panHandlers}
                >
                  {times.map((time) => (
                    <View key={time} style={[styles.timeRow, { marginBottom: GRID_GUTTER }]}>
                      <Text style={[styles.timeLabel, { width: GRID_LABEL_WIDTH }]}>{time}</Text>
                      {days.map((day, index) => {
                        const key = `${day}|${time}`;
                        const slot = timeSlots.find((s) => slotKey(s) === key);
                        const isMe = !!slot && !!myAvailability[key];
                        const count = slot ? availabilityCounts[key] ?? 0 : 0;
                        const total = participants.length || 1;
                        const bg = slot ? getHeatColor(count, total, isMe) : THEME.colors.card;
                        const border = slot ? getHeatBorder(count, total) : THEME.colors.border;

                        return (
                          <View
                            key={key}
                            style={[
                              styles.timeSlot,
                              {
                                width: CELL_WIDTH,
                                height: CELL_HEIGHT,
                                backgroundColor: bg,
                                borderColor: border,
                                marginRight: index === days.length - 1 ? 0 : GRID_GUTTER,
                                opacity: slot ? 1 : 0.3,
                              },
                            ]}
                            onLayout={(e) => {
                              if (!slot) return;
                              const { x, y, width, height } = e.nativeEvent.layout;
                              slotLayouts.current.set(key, { x, y, width, height });
                            }}
                          >
                            {slot && count > 0 && (
                              <Text style={[
                                styles.slotCountText,
                                { color: count / total >= 0.5 ? '#fff' : THEME.colors.primary },
                              ]}>
                                {count}/{total}
                              </Text>
                            )}
                            {slot && isMe && count === 0 && (
                              <Text style={[styles.slotCountText, { color: THEME.colors.primary }]}>✓</Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {dynamicIsHost && sessionId && (
          <Pressable
            style={styles.botButton}
            onPress={() => {
              setBotCount((c) => c + 1);
              void spawnDemoBot(sessionId);
            }}
          >
            <Ionicons name="person-add-outline" size={16} color={THEME.colors.secondary} />
            <Text style={styles.botButtonText}>Add Demo Player</Text>
          </Pressable>
        )}
        {botCount > 0 && (
          <Text style={styles.botHint}>{botCount} bot{botCount > 1 ? 's' : ''} joined! They will vote automatically when voting starts.</Text>
        )}

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

        {dynamicIsHost && (
          <View style={styles.footer}>
            <Pressable
              style={[styles.startButton, (options.length === 0 || startLoading) && styles.disabled]}
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

      <Modal visible={showAddModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Restaurant</Text>
              <Pressable onPress={() => setShowAddModal(false)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={THEME.colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
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

              <View style={styles.modalDivider}>
                <View style={styles.modalDividerLine} />
                <Text style={styles.modalDividerText}>or add manually</Text>
                <View style={styles.modalDividerLine} />
              </View>

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
  sessionTitle: { fontSize: 26, fontWeight: '700', color: THEME.colors.foreground },
  avatarRow: { paddingHorizontal: 20, paddingVertical: 12, gap: 14 },
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
  sectionTitle: { fontSize: 17, fontWeight: '700', color: THEME.colors.foreground },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary + '20',
    borderWidth: 1,
    borderColor: THEME.colors.primary + '60',
  },
  addButtonText: { fontSize: 14, fontWeight: '600', color: THEME.colors.primary },
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
  startButtonText: { color: THEME.colors.primaryForeground, fontWeight: '700', fontSize: 16 },
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
  botButtonText: { fontSize: 13, fontWeight: '600', color: THEME.colors.secondary },
  botHint: {
    textAlign: 'center',
    fontSize: 12,
    color: THEME.colors.mutedForeground,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  timeSection: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 14,
  },
  timeSectionDescription: {
    color: THEME.colors.mutedForeground,
    fontSize: 13,
    marginTop: 6,
    marginBottom: 10,
  },
  timeLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeLoadingText: { color: THEME.colors.mutedForeground, fontSize: 13 },
  heatLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  heatLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heatLegendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
  },
  heatLegendText: { fontSize: 11, color: THEME.colors.mutedForeground },
  timeHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  timeHeaderText: {
    textAlign: 'center',
    fontSize: 12,
    color: THEME.colors.mutedForeground,
    fontWeight: '700',
  },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeLabel: { fontSize: 12, color: THEME.colors.mutedForeground, fontWeight: '700' },
  timeSlot: {
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCountText: { fontSize: 11, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
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
  modalTitle: { fontSize: 20, fontWeight: '800', color: THEME.colors.foreground },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: { paddingHorizontal: 24, paddingTop: 16 },
  modalSection: { gap: 10 },
  modalSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  modalSectionTitle: { fontSize: 15, fontWeight: '700', color: THEME.colors.primary },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInputHalf: { flex: 1 },
  priceAndSearch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceFilterChips: { flexDirection: 'row', gap: 6 },
  priceChip: {
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: THEME.colors.background,
  },
  priceChipActive: { backgroundColor: THEME.colors.primary, borderColor: THEME.colors.primary },
  priceChipText: { color: THEME.colors.foreground, fontSize: 13, fontWeight: '600' },
  priceChipTextActive: { color: '#fff' },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  recommendationsSection: { gap: 8, marginTop: 14 },
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
  recThumbText: { fontSize: 18, fontWeight: '700', color: THEME.colors.primary },
  recommendationTextWrap: { flex: 1, gap: 2 },
  recommendationName: { color: THEME.colors.foreground, fontWeight: '600', fontSize: 15 },
  recommendationMeta: { color: THEME.colors.mutedForeground, fontSize: 12 },
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
  recommendationsLoadingText: { color: THEME.colors.mutedForeground, fontSize: 13 },
  modalDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  modalDividerLine: { flex: 1, height: 1, backgroundColor: THEME.colors.border },
  modalDividerText: { fontSize: 13, color: THEME.colors.mutedForeground, fontWeight: '500' },
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
  manualAddButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});