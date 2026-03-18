import { useState } from 'react';
import {
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { CUISINES, PRICE_LEVELS } from '../src/lib/constants/cuisines';
import { THEME } from '../src/lib/constants/theme';
import { useSessionStore } from '../src/state/session-store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = (SCREEN_WIDTH - 24 * 2 - 12) / 2;

export default function PreferencesScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const setPreferences = useSessionStore((s) => s.setPreferences);

  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);

  const toggleCuisine = (id: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleContinue = () => {
    setPreferences(selectedCuisines, selectedPrice);
    router.push({ pathname: '/session/[sessionId]/lobby', params: { sessionId } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Preferences</Text>
        <Text style={styles.subheading}>What are you craving?</Text>

        {/* Cuisine grid */}
        <View style={styles.grid}>
          {CUISINES.map((c) => {
            const active = selectedCuisines.includes(c.id);
            return (
              <Pressable
                key={c.id}
                style={[styles.cuisineCard, active && styles.cuisineCardActive]}
                onPress={() => toggleCuisine(c.id)}
              >
                <Text style={styles.cuisineEmoji}>{c.emoji}</Text>
                <Text style={[styles.cuisineLabel, active && styles.cuisineLabelActive]}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Price level */}
        <View style={styles.priceRow}>
          {PRICE_LEVELS.map((p) => {
            const active = selectedPrice === p.value;
            return (
              <Pressable
                key={p.value}
                style={[styles.priceChip, active && styles.priceChipActive]}
                onPress={() => setSelectedPrice(active ? null : p.value)}
              >
                <Text style={[styles.priceText, active && styles.priceTextActive]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue →</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.colors.background },
  container: { padding: 24, gap: 20 },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.colors.foreground,
  },
  subheading: {
    fontSize: 16,
    color: THEME.colors.mutedForeground,
    marginTop: -12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cuisineCard: {
    width: CARD_SIZE,
    aspectRatio: 1,
    borderRadius: THEME.radius.card,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cuisineCardActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primary + '12',
  },
  cuisineEmoji: { fontSize: 40 },
  cuisineLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.foreground,
  },
  cuisineLabelActive: { color: THEME.colors.primary },
  priceRow: { flexDirection: 'row', gap: 12 },
  priceChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: THEME.radius.input,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  priceChipActive: {
    backgroundColor: THEME.colors.primary + '20',
    borderColor: THEME.colors.primary,
  },
  priceText: { fontSize: 16, fontWeight: '600', color: THEME.colors.foreground },
  priceTextActive: { color: THEME.colors.primary },
  continueButton: {
    borderRadius: THEME.radius.input,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  continueButtonText: {
    color: THEME.colors.primaryForeground,
    fontWeight: '700',
    fontSize: 16,
  },
});
