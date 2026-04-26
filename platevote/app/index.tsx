import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
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

import { joinSession } from '../src/features/session/api';
import { THEME } from '../src/lib/constants/theme';
import { useSessionStore } from '../src/state/session-store';

export default function WelcomeScreen() {
  // pulse animation on the logo
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const [displayName, setDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const setSession = useSessionStore((s) => s.setSession);

  const canCreate = displayName.trim().length >= 2;
  const canJoin = displayName.trim().length >= 2 && joinCode.trim().length >= 4;

  const handleCreate = () => {
    useSessionStore.setState({ participantName: displayName.trim() });
    router.push('/create-session' as never);
  };

  const handleJoin = async () => {
    if (!canJoin) return;
    setLoading(true);
    try {
      const { session, participantId } = await joinSession(joinCode.trim(), displayName.trim());
      setSession({
        sessionId: session.id,
        participantId,
        participantName: displayName.trim(),
        status: session.status,
        joinCode: session.joinCode,
        isHost: false,
      });
      router.push({ pathname: '/session/[sessionId]/lobby', params: { sessionId: session.id } });
    } catch (err: unknown) {
      Alert.alert('Could not join', err instanceof Error ? err.message : 'Invalid code');
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
          {/* Logo + tagline */}
          <View style={styles.hero}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Image
                source={require('../assets/Logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>
            <Text style={styles.appName}>PlateVote</Text>
            <Text style={styles.tagline}>Pick where to eat together!</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              placeholder="Your name..."
              placeholderTextColor={THEME.colors.mutedForeground}
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              returnKeyType="done"
            />

            <Pressable
              style={[styles.primaryButton, !canCreate && styles.disabled]}
              disabled={!canCreate}
              onPress={handleCreate}
            >
              <Text style={styles.primaryButtonText}>Create Session</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or join with a code</Text>
              <View style={styles.dividerLine} />
            </View>

            <TextInput
              placeholder="Enter code (ABC123)"
              placeholderTextColor={THEME.colors.mutedForeground}
              style={styles.input}
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              maxLength={6}
              returnKeyType="done"
            />

            <Pressable
              style={[styles.primaryButton, !canJoin && styles.disabled]}
              disabled={!canJoin || loading}
              onPress={handleJoin}
            >
              {loading ? (
                <ActivityIndicator color={THEME.colors.primaryForeground} />
              ) : (
                <Text style={styles.primaryButtonText}>Join Session</Text>
              )}
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.colors.background },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 32,
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 12,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: THEME.colors.foreground,
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 6,
    fontSize: 16,
    color: THEME.colors.mutedForeground,
  },
  form: {
    gap: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.input,
    backgroundColor: '#fff',
    color: THEME.colors.foreground,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
  },
  primaryButton: {
    borderRadius: THEME.radius.input,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: THEME.colors.primaryForeground,
    fontWeight: '700',
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: THEME.colors.mutedForeground,
  },
  disabled: { opacity: 0.45 },
});
