import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
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

import { createSession } from '../src/features/session/api';
import { CUISINES, CITIES, PRICE_LEVELS } from '../src/lib/constants/cuisines';
import { THEME } from '../src/lib/constants/theme';
import { useSessionStore } from '../src/state/session-store';

export default function CreateSessionScreen() {
  const participantName = useSessionStore((s) => s.participantName) ?? '';
  const setSession = useSessionStore((s) => s.setSession);

  const [sessionName, setSessionName] = useState('');
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // fade in animation
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
      );
      setSession({
        sessionId: session.id,
        participantId,
        participantName: name,
        status: session.status,
        joinCode: session.joinCode,
        isHost: true,
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
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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
  headerRow: {
    gap: 4,
    marginBottom: 4,
  },
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
  distanceText: {
    fontSize: 14,
    color: THEME.colors.secondary,
    fontWeight: '600',
  },
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
  buttonGradient: {
    paddingVertical: 17,
    alignItems: 'center',
    borderRadius: 14,
  },
  createButtonText: {
    color: THEME.colors.primaryForeground,
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.3,
  },
  disabled: { opacity: 0.45 },
});
