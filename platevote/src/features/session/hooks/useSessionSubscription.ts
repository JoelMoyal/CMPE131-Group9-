import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase/client';
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
    if (!sessionId || !supabase) return;
    const client = supabase;

    const [{ data: sessionData }, { data: participantData }, optionData, voteData] =
      await Promise.all([
        client
          .from('sessions')
          .select('id, join_code, title, status, host_user_id, enable_time_selection')
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
        enableTimeSelection: sessionData.enable_time_selection,
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
  }, [sessionId]);

  const refetchOptions = useCallback(async () => {
    if (!sessionId) return;
    const data = await listOptions(sessionId);
    setOptions(data);
  }, [sessionId]);

  // Initial load
  useEffect(() => {
    if (!sessionId || !supabase) {
      setLoading(false);
      return;
    }
    fetchAll().finally(() => setLoading(false));
  }, [sessionId, fetchAll]);

  // Polling
  useEffect(() => {
    if (!sessionId || !supabase) return;
    const interval = setInterval(() => {
      fetchAll();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sessionId, fetchAll]);

  return { session, participants, options, votes, loading, refetchOptions };
}
