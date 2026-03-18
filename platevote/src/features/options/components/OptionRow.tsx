import { StyleSheet, Text, View } from 'react-native';

import type { RestaurantOption } from '../../session/types';
import { THEME } from '../../../lib/constants/theme';

const CUISINE_COLORS: Record<string, string> = {
  sushi: '#e8c9a0',
  italian: '#f4c6a0',
  burgers: '#f0b89a',
  mexican: '#f5d08a',
  chinese: '#f9c7a0',
  healthy: '#c8e6c9',
};

type OptionRowProps = {
  option: RestaurantOption;
};

export function OptionRow({ option }: OptionRowProps) {
  const priceLabel = option.priceLevel ? '$'.repeat(option.priceLevel) : null;
  const distLabel = option.distanceMiles ? `${option.distanceMiles} mi` : null;
  const metaParts = [option.cuisine, priceLabel, distLabel].filter(Boolean);
  const thumbColor = CUISINE_COLORS[option.cuisine?.toLowerCase() ?? ''] ?? '#e0d6cc';

  return (
    <View style={styles.row}>
      <View style={[styles.thumb, { backgroundColor: thumbColor }]}>
        <Text style={styles.thumbInitial}>{option.name[0].toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{option.name}</Text>
        <Text style={styles.meta}>{metaParts.join('  ·  ') || 'No details'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: THEME.radius.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.card,
    padding: 12,
    gap: 12,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  info: { flex: 1, gap: 3 },
  name: {
    color: THEME.colors.foreground,
    fontWeight: '600',
    fontSize: 15,
  },
  meta: {
    color: THEME.colors.mutedForeground,
    fontSize: 13,
  },
});
