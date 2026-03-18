import { StyleSheet, Text, View } from 'react-native';
import type { Participant } from '../types';

const AVATAR_COLORS = ['#c96e4b', '#6e7c63', '#e8a87c', '#8fad88', '#d4a574', '#7d9b76', '#a0866a', '#5a8a7a'];

function nameToColor(name: string): string {
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) ?? 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

type Props = {
  participant: Participant;
  size?: number;
};

export function ParticipantAvatar({ participant, size = 48 }: Props) {
  const initial = participant.displayName[0].toUpperCase();
  const bg = nameToColor(participant.displayName);

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
      {participant.isHost && <View style={styles.hostBadge} />}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#fff',
    fontWeight: '700',
  },
  hostBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFD700',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});
