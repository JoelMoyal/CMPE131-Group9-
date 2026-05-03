import { useCallback, useEffect, useState } from 'react';
import {
  disableSupabaseForRuntime,
  isNetworkRequestFailure,
  isSupabaseEnabled,
  requireSupabase,
} from '../../../lib/supabase/client';
import { listOptions } from '../../options/api';
import { listVotes } from '../../voting/api';
import type { Participant, RestaurantOption, SessionStatus, SessionSummary, Vote } from '../types';

const POLL_INTERVAL_MS = 3000;

type SubscriptionData = {
  session: SessionSummary | null;
  participants: Participant[];
  options: RestaurantOption[];
  votes: Vote[];
  loading: boolean;
  refetchOptions: () => Promise<void>;
};

export function useSessionSubscription(sessionId: string | null): SubscriptionData {
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [options, setOptions] = useState<RestaurantOption[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!sessionId || !isSupabaseEnabled()) return;

    try {
      const client = requireSupabase();
      const [{ data: sessionData }, { data: participantData }, optionData, voteData] =
        await Promise.all([
          client
            .from('sessions')
            .select('id, join_code, title, status, host_user_id')
            .eq('id', sessionId)
            .single(),
          client
            .from('participants')
            .select('id, session_id, user_id, display_name, is_host')
            .eq('session_id', sessionId),
          listOptions(sessionId),
          listVotes(sessionId),
        ]);

      if (sessionData) {
        setSession({
          id: sessionData.id,
          joinCode: sessionData.join_code,
          title: sessionData.title,
          status: sessionData.status as SessionStatus,
          hostUserId: sessionData.host_user_id,
        });
      }

      setParticipants(
        (participantData ?? []).map((row: Record<string, unknown>) => ({
          id: row.id as string,
          sessionId: row.session_id as string,
          userId: row.user_id as string,
          displayName: row.display_name as string,
          isHost: row.is_host as boolean,
        })),
      );
      setOptions(optionData);
      setVotes(voteData);
    } catch (error: unknown) {
      if (isNetworkRequestFailure(error)) {
        disableSupabaseForRuntime(error);
        return;
      }

      console.warn(
        `Session subscription fetch failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }, [sessionId]);

  const refetchOptions = useCallback(async () => {
    if (!sessionId) return;
    const data = await listOptions(sessionId);
    setOptions(data);
  }, [sessionId]);

  // Initial load
  useEffect(() => {
    if (!sessionId || !isSupabaseEnabled()) {
      setLoading(false);
      return;
    }
    fetchAll()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId, fetchAll]);

  // Polling
  useEffect(() => {
    if (!sessionId || !isSupabaseEnabled()) return;
    const interval = setInterval(() => {
      fetchAll().catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sessionId, fetchAll]);

  return { session, participants, options, votes, loading, refetchOptions };
}
