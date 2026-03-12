import { StyleSheet, Text, View } from 'react-native';

import type { RestaurantOption } from '../../session/types';
import { THEME } from '../../../lib/constants/theme';

type OptionRowProps = {
  option: RestaurantOption;
};

export function OptionRow({ option }: OptionRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.name}>{option.name}</Text>
      <Text style={styles.meta}>{option.cuisine ?? 'Cuisine n/a'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.card,
    padding: 12,
    gap: 2,
  },
  name: {
    color: THEME.colors.foreground,
    fontWeight: '600',
  },
  meta: {
    color: THEME.colors.mutedForeground,
    fontSize: 13,
  },
});
