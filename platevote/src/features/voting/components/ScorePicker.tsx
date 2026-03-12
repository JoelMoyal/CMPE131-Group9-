import { Pressable, StyleSheet, Text, View } from 'react-native';

import { THEME } from '../../../lib/constants/theme';

type ScorePickerProps = {
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (next: 1 | 2 | 3 | 4 | 5) => void;
};

const SCORES: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];

export function ScorePicker({ value, onChange }: ScorePickerProps) {
  return (
    <View style={styles.row}>
      {SCORES.map((score) => {
        const active = score === value;
        return (
          <Pressable
            key={score}
            onPress={() => onChange(score)}
            style={[styles.button, active && styles.activeButton]}
          >
            <Text style={[styles.buttonLabel, active && styles.activeButtonLabel]}>{score}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  buttonLabel: {
    color: THEME.colors.foreground,
    fontWeight: '600',
  },
  activeButtonLabel: {
    color: THEME.colors.primaryForeground,
  },
});
