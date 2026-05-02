import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { createSession, createTimeSlots, setTimeAvailability } from '../src/features/session/api';
import { CUISINES, CITIES, PRICE_LEVELS } from '../src/lib/constants/cuisines';
import { THEME } from '../src/lib/constants/theme';
import { useSessionStore } from '../src/state/session-store';

type SlotLayout = { x: number; y: number; width: number; height: number };

export default function CreateSessionScreen() {
  const participantName = useSessionStore((s) => s.participantName) ?? '';
  const setSession = useSessionStore((s) => s.setSession);

  const [sessionName, setSessionName] = useState('');
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [enableTimeSelection, setEnableTimeSelection] = useState(false);
  const [selectedAvailability, setSelectedAvailability] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [isGridDragging, setIsGridDragging] = useState(false);

  const TIMES = ['10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'];

  const getDayLabel = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'short' });

  const TODAY = new Date();
  TODAY.setHours(0, 0, 0, 0);

  const DAYS = Array.from({ length: 4 }, (_, index) => {
    const date = new Date(TODAY);
    date.setDate(date.getDate() + index);
    return getDayLabel(date);
  });

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const GRID_LABEL_WIDTH = 56;
  const GRID_GUTTER = 8;
  const NUM_DAYS = DAYS.length;
  // 20px page padding * 2 + 18px card padding * 2 + 14px timeCard padding * 2 = 104px total
  const CELL_WIDTH = Math.floor((SCREEN_WIDTH - 104 - GRID_LABEL_WIDTH - GRID_GUTTER * (NUM_DAYS - 1)) / NUM_DAYS);
  const CELL_HEIGHT = 44;
  const CELL_MARGIN = 10;

  // Drag selection — slots stored in PAGE coords via measureInWindow
  const slotLayouts = useRef<Map<string, SlotLayout>>(new Map());
  const slotViewRefs = useRef<Map<string, View>>(new Map());
  const dragValueRef = useRef<boolean>(true);
  const lastToggledKey = useRef<string | null>(null);

  const remeasureSlots = () => {
    slotViewRefs.current.forEach((ref, key) => {
      ref.measureInWindow((x, y, width, height) => {
        if (width > 0) slotLayouts.current.set(key, { x, y, width, height });
      });
    });
  };

  const getKeyFromPoint = (pageX: number, pageY: number): string | null => {
    for (const [key, layout] of slotLayouts.current.entries()) {
      if (
        pageX >= layout.x && pageX <= layout.x + layout.width &&
        pageY >= layout.y && pageY <= layout.y + layout.height
      ) {
        return key;
      }
    }
    return null;
  };

  const applySlot = (key: string, value: boolean) => {
    setSelectedAvailability((prev) => {
      const next = new Set(prev);
      if (value) next.add(key); else next.delete(key);
      return next;
    });
  };

  // Keep a ref to selectedAvailability so PanResponder closure always reads latest value
  const selectedAvailabilityRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    selectedAvailabilityRef.current = selectedAvailability;
  }, [selectedAvailability]);

  const panResponder = useRef(
    PanResponder.create({
      // Only claim the touch if it lands on a known slot
      onStartShouldSetPanResponderCapture: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        return getKeyFromPoint(pageX, pageY) !== null;
      },
      onMoveShouldSetPanResponderCapture: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        return getKeyFromPoint(pageX, pageY) !== null;
      },
      onStartShouldSetPanResponder: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        return getKeyFromPoint(pageX, pageY) !== null;
      },
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        const key = getKeyFromPoint(pageX, pageY);
        if (!key) return;
        setIsGridDragging(true);
        const willBeSelected = !selectedAvailabilityRef.current.has(key);
        dragValueRef.current = willBeSelected;
        lastToggledKey.current = key;
        applySlot(key, willBeSelected);
      },
      onPanResponderMove: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        const key = getKeyFromPoint(pageX, pageY);
        if (!key || key === lastToggledKey.current) return;
        lastToggledKey.current = key;
        applySlot(key, dragValueRef.current);
      },
      onPanResponderRelease: () => {
        setIsGridDragging(false);
        lastToggledKey.current = null;
      },
      onPanResponderTerminate: () => {
        setIsGridDragging(false);
        lastToggledKey.current = null;
      },
    }),
  ).current;

  const buildSlotDate = (dayOffset: number, timeLabel: string) => {
    const slot = new Date(TODAY);
    slot.setDate(slot.getDate() + dayOffset);
    const [hourStr, meridiem] = timeLabel.split(' ');
    let hour = Number(hourStr);
    if (meridiem === 'PM' && hour !== 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    slot.setHours(hour, 0, 0, 0);
    return slot.toISOString();
  };

  const getDefaultTimeSlots = () =>
    DAYS.flatMap((day, dayIndex) =>
      TIMES.map((time) => {
        const startTime = buildSlotDate(dayIndex, time);
        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + 1);
        return { startTime, endTime: endTime.toISOString() };
      }),
    );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const toggleCuisine = (id: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleNext = async () => {
    const name = participantName.trim();
    if (name.length < 2) {
      Alert.alert('Please go back and enter your name.');
      return;
    }
    setLoading(true);
    try {
      const { session, participantId } = await createSession(
        name,
        sessionName.trim() || undefined,
        enableTimeSelection,
      );

      if (enableTimeSelection && participantId) {
        const defaultSlots = getDefaultTimeSlots();
        const createdSlots = await createTimeSlots(
          session.id,
          defaultSlots.map((slot) => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        );

        const slotKeyByLabel = new Map<string, string>();
        const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        createdSlots.forEach((slot) => {
          const date = new Date(slot.startTime);
          const day = shortDayNames[date.getDay()];
          const hour = date.getHours();
          const timeLabel = `${hour % 12 === 0 ? 12 : hour % 12} ${hour >= 12 ? 'PM' : 'AM'}`;
          slotKeyByLabel.set(`${day}|${timeLabel}`, slot.id);
        });

        await Promise.all(
          Array.from(selectedAvailability).map((key) => {
            const slotId = slotKeyByLabel.get(key);
            return slotId ? setTimeAvailability(participantId, slotId, true) : Promise.resolve();
          }),
        );
      }

      setSession({
        sessionId: session.id,
        participantId,
        participantName: name,
        status: session.status,
        joinCode: session.joinCode,
        isHost: true,
        enableTimeSelection: session.enableTimeSelection,
      });
      useSessionStore.getState().setPreferences(selectedCuisines, selectedPrice);
      router.push({
        pathname: '/session/[sessionId]/lobby' as never,
        params: { sessionId: session.id },
      });
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          scrollEnabled={!isGridDragging}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          onScrollEndDrag={() => setTimeout(remeasureSlots, 50)}
          onMomentumScrollEnd={() => setTimeout(remeasureSlots, 50)}
        >
          <Animated.View style={{ opacity: fadeAnim, gap: 16 }}>
            <View style={styles.headerRow}>
              <Text style={styles.heading}>New Session</Text>
              <Text style={styles.subheading}>Set up your group vote</Text>
            </View>

            {/* Session Name Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Session Name</Text>
              <TextInput
                placeholder="Dinner with friends..."
                placeholderTextColor={THEME.colors.mutedForeground}
                style={styles.input}
                value={sessionName}
                onChangeText={setSessionName}
                returnKeyType="done"
              />
            </View>

            {/* Location Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Location</Text>
              <Pressable style={styles.dropdown} onPress={() => setShowCityPicker((v) => !v)}>
                <Ionicons name="location-sharp" size={18} color={THEME.colors.primary} />
                <Text style={styles.dropdownText}>{selectedCity}</Text>
                <Text style={styles.dropdownChevron}>{showCityPicker ? '▴' : '▾'}</Text>
              </Pressable>
              {showCityPicker && (
                <View style={styles.cityList}>
                  {CITIES.map((city) => (
                    <Pressable
                      key={city}
                      style={[styles.cityItem, city === selectedCity && styles.cityItemSelected]}
                      onPress={() => {
                        setSelectedCity(city);
                        setShowCityPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.cityItemText,
                          city === selectedCity && styles.cityItemTextSelected,
                        ]}
                      >
                        {city === selectedCity ? `✓  ${city}` : `    ${city}`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Cuisine Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>What sounds good?</Text>
              <View style={styles.chipRow}>
                {CUISINES.map((c) => {
                  const active = selectedCuisines.includes(c.id);
                  return (
                    <Pressable
                      key={c.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleCuisine(c.id)}
                    >
                      <MaterialCommunityIcons
                        name={c.icon}
                        size={18}
                        color={active ? THEME.colors.primary : THEME.colors.mutedForeground}
                      />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Price & Distance Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Budget & Distance</Text>
              <View style={styles.chipRow}>
                {PRICE_LEVELS.map((p) => {
                  const active = selectedPrice === p.value;
                  return (
                    <Pressable
                      key={p.value}
                      style={[styles.priceChip, active && styles.priceChipActive]}
                      onPress={() => setSelectedPrice(active ? null : p.value)}
                    >
                      <Text style={[styles.priceChipText, active && styles.priceChipTextActive]}>
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
                <View style={styles.distanceChip}>
                  <Ionicons name="navigate-outline" size={14} color={THEME.colors.secondary} />
                  <Text style={styles.distanceText}>5 mi</Text>
                </View>
              </View>
            </View>

            {/* Time Selection Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Schedule Coordination</Text>
              <Pressable
                style={[styles.toggleCard, enableTimeSelection && styles.toggleCardActive]}
                onPress={() => setEnableTimeSelection((v) => !v)}
              >
                <Text style={[styles.toggleText, enableTimeSelection && styles.toggleTextActive]}>
                  {enableTimeSelection ? '✓' : '○'} Decide on a time to eat together
                </Text>
              </Pressable>

              {enableTimeSelection && (
                <View style={styles.timeCard}>
                  <Text style={styles.timeCardLabel}>Pick the times you're available</Text>

                  <View style={styles.timeGridContainer}>
                    {/* Day headers row */}
                    <View style={styles.timeHeaderRow}>
                      <View style={{ width: GRID_LABEL_WIDTH }} />
                      {DAYS.map((day, index) => (
                        <Text
                          key={day}
                          style={[
                            styles.timeHeaderText,
                            {
                              width: CELL_WIDTH,
                              marginRight: index === DAYS.length - 1 ? 0 : GRID_GUTTER,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {day}
                        </Text>
                      ))}
                    </View>

                    {/* Drag-enabled grid */}
                    <View
                      onLayout={() => setTimeout(remeasureSlots, 100)}
                      {...panResponder.panHandlers}
                    >
                      {TIMES.map((time, timeIndex) => (
                        <View key={time} style={styles.timeRow}>
                          <Text style={[styles.timeLabel, { width: GRID_LABEL_WIDTH }]}>{time}</Text>
                          {DAYS.map((day, dayIndex) => {
                            const key = `${day}|${time}`;
                            const active = selectedAvailability.has(key);
                            return (
                              <View
                                key={key}
                                ref={(r) => {
                                  if (r) {
                                    slotViewRefs.current.set(key, r);
                                  } else {
                                    slotViewRefs.current.delete(key);
                                  }
                                }}
                                style={[
                                  styles.timeSlot,
                                  active && styles.timeSlotActive,
                                  {
                                    width: CELL_WIDTH,
                                    height: CELL_HEIGHT,
                                    marginRight: dayIndex === DAYS.length - 1 ? 0 : GRID_GUTTER,
                                    marginBottom: timeIndex === TIMES.length - 1 ? 0 : CELL_MARGIN - GRID_GUTTER,
                                  },
                                ]}
                              />
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  </View>

                  <Text style={styles.helperText}>
                    Tap or drag across slots to mark your availability.
                  </Text>
                </View>
              )}
            </View>

            {/* Create Button */}
            <Pressable
              style={[styles.createButton, loading && styles.disabled]}
              disabled={loading}
              onPress={handleNext}
            >
              <LinearGradient
                colors={['#d4805a', THEME.colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color={THEME.colors.primaryForeground} />
                ) : (
                  <Text style={styles.createButtonText}>Create Session →</Text>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.colors.background },
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  headerRow: { gap: 4, marginBottom: 4 },
  heading: {
    fontSize: 32,
    fontWeight: '900',
    color: THEME.colors.foreground,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 15,
    color: THEME.colors.mutedForeground,
    fontWeight: '400',
  },
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: THEME.colors.border + '60',
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.foreground,
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    backgroundColor: THEME.colors.background,
    color: THEME.colors.foreground,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    backgroundColor: THEME.colors.background,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },
  dropdownText: { flex: 1, fontSize: 16, color: THEME.colors.foreground, fontWeight: '500' },
  dropdownChevron: { fontSize: 14, color: THEME.colors.mutedForeground },
  cityList: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    backgroundColor: THEME.colors.background,
    overflow: 'hidden',
  },
  cityItem: { paddingVertical: 12, paddingHorizontal: 16 },
  cityItemSelected: { backgroundColor: THEME.colors.primary + '15' },
  cityItemText: { fontSize: 15, color: THEME.colors.foreground },
  cityItemTextSelected: { color: THEME.colors.primary, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
  },
  chipActive: {
    backgroundColor: THEME.colors.primary + '18',
    borderColor: THEME.colors.primary,
  },
  chipText: { fontSize: 14, color: THEME.colors.foreground, fontWeight: '500' },
  chipTextActive: { color: THEME.colors.primary, fontWeight: '700' },
  priceChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
  },
  priceChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  priceChipText: { fontSize: 15, color: THEME.colors.foreground, fontWeight: '600' },
  priceChipTextActive: { color: '#fff', fontWeight: '700' },
  distanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: THEME.colors.secondary + '20',
    borderWidth: 1.5,
    borderColor: THEME.colors.secondary + '40',
  },
  distanceText: { fontSize: 14, color: THEME.colors.secondary, fontWeight: '600' },
  toggleCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
  },
  toggleCardActive: {
    backgroundColor: THEME.colors.primary + '18',
    borderColor: THEME.colors.primary,
  },
  toggleText: { fontSize: 15, color: THEME.colors.foreground, fontWeight: '500' },
  toggleTextActive: { color: THEME.colors.primary, fontWeight: '700' },
  timeCard: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 14,
    gap: 14,
  },
  timeCardLabel: { fontSize: 14, fontWeight: '700', color: THEME.colors.foreground },
  timeGridContainer: { flexDirection: 'column', gap: 0 },
  timeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  timeHeaderText: {
    textAlign: 'center',
    fontSize: 13,
    color: THEME.colors.mutedForeground,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  timeLabel: {
    fontSize: 13,
    color: THEME.colors.mutedForeground,
    fontWeight: '600',
    textAlignVertical: 'center',
  },
  timeSlot: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.card,
  },
  timeSlotActive: {
    backgroundColor: THEME.colors.primary + '30',
    borderColor: THEME.colors.primary,
  },
  helperText: { fontSize: 12, color: THEME.colors.mutedForeground },
  createButton: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonGradient: { paddingVertical: 17, alignItems: 'center', borderRadius: 14 },
  createButtonText: {
    color: THEME.colors.primaryForeground,
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.3,
  },
  disabled: { opacity: 0.45 },
});