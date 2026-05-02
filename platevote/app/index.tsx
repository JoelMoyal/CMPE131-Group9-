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
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { joinSession } from '../src/features/session/api';
import { THEME } from '../src/lib/constants/theme';
import { useSessionStore } from '../src/state/session-store';

export default function WelcomeScreen() {
  // pulse animation on the logo
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // fade in the form
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ]),
    );
    pulse.start();

    // fade in the form on mount
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, delay: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, delay: 300, useNativeDriver: true }),
    ]).start();

    return () => pulse.stop();
  }, [pulseAnim, fadeAnim, slideAnim]);

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
        enableTimeSelection: session.enableTimeSelection,
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
          {/* Hero section */}
          <View style={styles.hero}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={styles.logoGlow}>
                <Image
                  source={require('../assets/Logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>
            <Text style={styles.appName}>PlateVote</Text>
            <Text style={styles.tagline}>Pick where to eat together!</Text>
          </View>

          {/* Form card */}
          <Animated.View style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
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
              <LinearGradient
                colors={['#d4805a', THEME.colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.primaryButtonText}>Create Session</Text>
              </LinearGradient>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or join with a code</Text>
              <View style={styles.dividerLine} />
            </View>

            <TextInput
              placeholder="Enter code (ABC123)"
              placeholderTextColor={THEME.colors.mutedForeground}
              style={[styles.input, styles.codeInput]}
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              maxLength={6}
              returnKeyType="done"
            />

            <Pressable
              style={[styles.secondaryButton, !canJoin && styles.disabled]}
              disabled={!canJoin || loading}
              onPress={handleJoin}
            >
              {loading ? (
                <ActivityIndicator color={THEME.colors.primary} />
              ) : (
                <Text style={styles.secondaryButtonText}>Join Session</Text>
              )}
            </Pressable>
          </Animated.View>

          <Text style={styles.footerText}>Swipe. Vote. Eat.</Text>
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
    paddingHorizontal: 28,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 24,
  },
  logoGlow: {
    padding: 12,
    borderRadius: 100,
    backgroundColor: THEME.colors.primary + '12',
  },
  logo: {
    width: 120,
    height: 120,
  },
  appName: {
    fontSize: 38,
    fontWeight: '900',
    color: THEME.colors.foreground,
    letterSpacing: -1,
    marginTop: 12,
  },
  tagline: {
    marginTop: 6,
    fontSize: 16,
    color: THEME.colors.mutedForeground,
    fontWeight: '400',
  },
  formCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 20,
    padding: 24,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: THEME.colors.border + '80',
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    backgroundColor: THEME.colors.background,
    color: THEME.colors.foreground,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  codeInput: {
    textAlign: 'center',
    letterSpacing: 4,
    fontSize: 18,
    fontWeight: '600',
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  primaryButtonText: {
    color: THEME.colors.primaryForeground,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    color: THEME.colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: THEME.colors.mutedForeground,
    fontWeight: '500',
  },
  disabled: { opacity: 0.4 },
  footerText: {
    textAlign: 'center',
    fontSize: 13,
    color: THEME.colors.mutedForeground + '90',
    fontWeight: '500',
    letterSpacing: 1,
    marginTop: 16,
  },
});
