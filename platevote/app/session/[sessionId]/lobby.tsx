import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../src/lib/supabase/client';

import { addOption } from '../../../src/features/options/api';
import { OptionRow } from '../../../src/features/options/components/OptionRow';
import { startVoting } from '../../../src/features/session/api';
import { ParticipantAvatar } from '../../../src/features/session/components/ParticipantAvatar';
import { JoinCodeBadge } from '../../../src/features/session/components/JoinCodeBadge';
import { useSessionSubscription } from '../../../src/features/session/hooks/useSessionSubscription';
import { THEME } from '../../../src/lib/constants/theme';
import { useSessionStore } from '../../../src/state/session-store';

export default function SessionLobbyScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { participantId, isHost, setStatus } = useSessionStore();

  const { session, participants, options, loading, refetchOptions } = useSessionSubscription(sessionId ?? null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [optionName, setOptionName] = useState('');
  const [optionCuisine, setOptionCuisine] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [startLoading, setStartLoading] = useState(false);

  // Poll every 4 seconds to sync restaurants and session status without realtime
  useEffect(() => {
    const interval = setInterval(() => {
      refetchOptions();
    }, 4000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Navigate when session status changes via realtime
  const sessionStatus = session?.status;
  if (sessionStatus === 'voting') {
    router.replace({ pathname: '/session/[sessionId]/vote', params: { sessionId } });
  }
  if (sessionStatus === 'completed') {
    router.replace({ pathname: '/session/[sessionId]/result', params: { sessionId } });
  }

  const handleAddOption = async () => {
    if (!optionName.trim() || !sessionId || !participantId) return;
    setAddLoading(true);
    try {
      await addOption(sessionId, { name: optionName.trim(), cuisine: optionCuisine.trim() || undefined }, participantId);
      setOptionName('');
      setOptionCuisine('');
      setShowAddModal(false);
      await refetchOptions();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not add restaurant');
    } finally {
      setAddLoading(false);
    }
  };

  const handleStartVoting = async () => {
    if (!sessionId) return;
    setStartLoading(true);
    try {
      await startVoting(sessionId);
      setStatus('voting');
      router.replace({ pathname: '/session/[sessionId]/vote', params: { sessionId } });
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not start voting');
    } finally {
      setStartLoading(false);
    }
  };

  // Get current user id to check host status dynamically
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  if (!currentUserId && supabase) {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }
  const dynamicIsHost = isHost || (session?.hostUserId != null && session.hostUserId === currentUserId);

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color={THEME.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.sessionTitle}>{session?.title ?? 'Session Lobby'}</Text>
          {session?.joinCode ? <JoinCodeBadge code={session.joinCode} /> : null}
        </View>

        {/* Participants row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.avatarRow}
        >
          {participants.map((p) => (
            <View key={p.id} style={styles.avatarItem}>
              <ParticipantAvatar participant={p} />
              <Text style={styles.avatarName} numberOfLines={1}>{p.displayName}</Text>
            </View>
          ))}
          {participants.length === 0 && (
            <Text style={styles.waitingText}>Waiting for players...</Text>
          )}
        </ScrollView>

        {participants.length > 0 && (
          <Text style={styles.waitingText}>
            {participants.length === 1 ? 'Waiting for more players...' : `${participants.length} players joined`}
          </Text>
        )}

        {/* Added Restaurants */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Added Restaurants</Text>
          <Pressable style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        </View>

        <FlatList
          data={options}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OptionRow option={item} />}
          contentContainerStyle={styles.optionsList}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No restaurants yet. Add one!</Text>
          }
          style={styles.optionsFlex}
        />

        {/* Start Voting button (host only) */}
        {dynamicIsHost && (
          <View style={styles.footer}>
            <Pressable
              style={[
                styles.startButton,
                (options.length === 0 || startLoading) && styles.disabled,
              ]}
              onPress={handleStartVoting}
              disabled={options.length === 0 || startLoading}
            >
              {startLoading ? (
                <ActivityIndicator color={THEME.colors.primaryForeground} />
              ) : (
                <Text style={styles.startButtonText}>Start Voting</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      {/* Add restaurant modal */}
      <Modal visible={showAddModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Restaurant</Text>
            <TextInput
              placeholder="Restaurant name *"
              placeholderTextColor={THEME.colors.mutedForeground}
              style={styles.modalInput}
              value={optionName}
              onChangeText={setOptionName}
              returnKeyType="next"
            />
            <TextInput
              placeholder="Cuisine (optional)"
              placeholderTextColor={THEME.colors.mutedForeground}
              style={styles.modalInput}
              value={optionCuisine}
              onChangeText={setOptionCuisine}
              returnKeyType="done"
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelButton} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, (!optionName.trim() || addLoading) && styles.disabled]}
                disabled={!optionName.trim() || addLoading}
                onPress={handleAddOption}
              >
                {addLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Add</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.colors.background },
  container: { flex: 1 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 20, paddingBottom: 12 },
  sessionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: THEME.colors.foreground,
  },
  avatarRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  avatarItem: { alignItems: 'center', gap: 4, maxWidth: 56 },
  avatarName: { fontSize: 11, color: THEME.colors.mutedForeground, textAlign: 'center' },
  waitingText: {
    paddingHorizontal: 20,
    fontSize: 13,
    color: THEME.colors.mutedForeground,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.foreground,
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary + '20',
    borderWidth: 1,
    borderColor: THEME.colors.primary + '60',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  optionsList: { paddingHorizontal: 20, gap: 10, paddingBottom: 16 },
  optionsFlex: { flex: 1 },
  emptyText: {
    textAlign: 'center',
    color: THEME.colors.mutedForeground,
    paddingVertical: 32,
    fontSize: 15,
  },
  footer: { padding: 20, paddingTop: 12 },
  startButton: {
    borderRadius: THEME.radius.input,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 15,
    alignItems: 'center',
  },
  startButtonText: {
    color: THEME.colors.primaryForeground,
    fontWeight: '700',
    fontSize: 16,
  },
  disabled: { opacity: 0.45 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.foreground,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: THEME.colors.foreground,
    backgroundColor: THEME.colors.background,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    paddingBottom: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: THEME.radius.input,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 15, color: THEME.colors.foreground },
  confirmButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: THEME.radius.input,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
  },
  confirmButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
