import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
        pathname: '/preferences' as never,
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
          <Text style={styles.heading}>Create Session</Text>

          {/* Session Name */}
          <Text style={styles.label}>Session Name</Text>
          <TextInput
            placeholder="Dinner with friends..."
            placeholderTextColor={THEME.colors.mutedForeground}
            style={styles.input}
            value={sessionName}
            onChangeText={setSessionName}
            returnKeyType="done"
          />

          {/* Location */}
          <Text style={styles.label}>Location</Text>
          <Pressable style={styles.dropdown} onPress={() => setShowCityPicker((v) => !v)}>
            <Text style={styles.dropdownIcon}>📍</Text>
            <Text style={styles.dropdownText}>{selectedCity}</Text>
            <Text style={styles.dropdownChevron}>▾</Text>
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
                    {city}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Cuisine filters */}
          <Text style={styles.label}>Filters</Text>
          <View style={styles.chipRow}>
            {CUISINES.map((c) => {
              const active = selectedCuisines.includes(c.id);
              return (
                <Pressable
                  key={c.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleCuisine(c.id)}
                >
                  <Text style={styles.chipEmoji}>{c.emoji}</Text>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Price filters */}
          <View style={styles.chipRow}>
            {PRICE_LEVELS.map((p) => {
              const active = selectedPrice === p.value;
              return (
                <Pressable
                  key={p.value}
                  style={[styles.priceChip, active && styles.chipActive]}
                  onPress={() => setSelectedPrice(active ? null : p.value)}
                >
                  <Text style={[styles.priceChipText, active && styles.chipTextActive]}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}

            {/* Distance */}
            <Pressable style={[styles.priceChip, styles.chipActive]}>
              <Text style={styles.chipTextActive}>5 miles</Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.nextButton, loading && styles.disabled]}
            disabled={loading}
            onPress={handleNext}
          >
            {loading ? (
              <ActivityIndicator color={THEME.colors.primaryForeground} />
            ) : (
              <Text style={styles.nextButtonText}>Next →</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.colors.background },
  flex: { flex: 1 },
  container: { padding: 24, gap: 12 },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.colors.foreground,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.foreground,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.input,
    backgroundColor: '#fff',
    color: THEME.colors.foreground,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.input,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  dropdownIcon: { fontSize: 16 },
  dropdownText: { flex: 1, fontSize: 16, color: THEME.colors.foreground },
  dropdownChevron: { fontSize: 14, color: THEME.colors.mutedForeground },
  cityList: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.card,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginTop: -4,
  },
  cityItem: { paddingVertical: 12, paddingHorizontal: 16 },
  cityItemSelected: { backgroundColor: THEME.colors.primary + '18' },
  cityItemText: { fontSize: 15, color: THEME.colors.foreground },
  cityItemTextSelected: { color: THEME.colors.primary, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: THEME.colors.primary + '20',
    borderColor: THEME.colors.primary,
  },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 14, color: THEME.colors.foreground },
  chipTextActive: { color: THEME.colors.primary, fontWeight: '600' },
  priceChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: '#fff',
  },
  priceChipText: { fontSize: 14, color: THEME.colors.foreground },
  nextButton: {
    marginTop: 16,
    borderRadius: THEME.radius.input,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 15,
    alignItems: 'center',
  },
  nextButtonText: {
    color: THEME.colors.primaryForeground,
    fontWeight: '700',
    fontSize: 16,
  },
  disabled: { opacity: 0.5 },
});
