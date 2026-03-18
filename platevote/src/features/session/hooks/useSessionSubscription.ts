import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { listOptions } from '../../options/api';
import { listVotes } from '../../voting/api';
import type { Participant, RestaurantOption, SessionStatus, SessionSummary, Vote } from '../types';

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

  const refetchOptions = async () => {
    if (!sessionId) return;
    const data = await listOptions(sessionId);
    setOptions(data);
  };

  useEffect(() => {
    if (!sessionId || !supabase) {
      setLoading(false);
      return;
    }

    const client = supabase;

    // Initial data load
    const loadInitial = async () => {
      try {
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
      } finally {
        setLoading(false);
      }
    };

    loadInitial();

    // Realtime subscriptions
    const channel = client
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row?.id) {
            setSession({
              id: row.id as string,
              joinCode: row.join_code as string,
              title: (row.title as string) ?? null,
              status: row.status as SessionStatus,
              hostUserId: row.host_user_id as string,
            });
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as Record<string, unknown>;
            setParticipants((prev) => [
              ...prev.filter((p) => p.id !== (row.id as string)),
              {
                id: row.id as string,
                sessionId: row.session_id as string,
                userId: row.user_id as string,
                displayName: row.display_name as string,
                isHost: row.is_host as boolean,
              },
            ]);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurant_options',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as Record<string, unknown>;
            setOptions((prev) => [
              ...prev,
              {
                id: row.id as string,
                sessionId: row.session_id as string,
                name: row.name as string,
                cuisine: (row.cuisine as string) ?? null,
                priceLevel: (row.price_level as number) ?? null,
                distanceMiles: (row.distance_miles as number) ?? null,
                imageUrl: (row.image_url as string) ?? null,
                createdAt: row.created_at as string,
              },
            ]);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as Record<string, unknown>;
            setVotes((prev) => [
              ...prev.filter(
                (v) =>
                  !(v.participantId === (row.participant_id as string) && v.optionId === (row.option_id as string)),
              ),
              {
                id: row.id as string,
                sessionId: row.session_id as string,
                optionId: row.option_id as string,
                participantId: row.participant_id as string,
                score: row.score as 1 | 2 | 3 | 4 | 5,
              },
            ]);
          }
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [sessionId]);

  return { session, participants, options, votes, loading, refetchOptions };
}
