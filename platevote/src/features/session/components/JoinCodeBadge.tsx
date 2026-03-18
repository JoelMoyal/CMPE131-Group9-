import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { THEME } from '../../../lib/constants/theme';

type Props = { code: string };

export function JoinCodeBadge({ code }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Pressable onPress={handleCopy} style={styles.badge}>
      <Text style={styles.label}>Code: </Text>
      <Text style={styles.code}>{code}</Text>
      {copied && <Text style={styles.copied}>  ✓ Copied</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: THEME.colors.primary + '18',
    borderWidth: 1,
    borderColor: THEME.colors.primary + '40',
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    color: THEME.colors.mutedForeground,
  },
  code: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.primary,
    letterSpacing: 2,
  },
  copied: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
});
