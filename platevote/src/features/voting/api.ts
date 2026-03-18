import { requireSupabase, supabase } from '../../lib/supabase/client';
import type { Vote } from '../session/types';

export async function upsertVote(
  sessionId: string,
  optionId: string,
  participantId: string,
  score: 1 | 2 | 3 | 4 | 5,
): Promise<Vote> {
  if (!supabase) {
    return {
      id: `local-vote-${Date.now()}`,
      sessionId,
      optionId,
      participantId,
      score,
    };
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from('votes')
    .upsert(
      { session_id: sessionId, option_id: optionId, participant_id: participantId, score },
      { onConflict: 'participant_id,option_id' },
    )
    .select('id, session_id, option_id, participant_id, score')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Unable to save vote');

  return {
    id: data.id,
    sessionId: data.session_id,
    optionId: data.option_id,
    participantId: data.participant_id,
    score: data.score as 1 | 2 | 3 | 4 | 5,
  };
}

export async function listVotes(sessionId: string): Promise<Vote[]> {
  if (!supabase) return [];

  const client = requireSupabase();
  const { data, error } = await client
    .from('votes')
    .select('id, session_id, option_id, participant_id, score')
    .eq('session_id', sessionId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    optionId: row.option_id,
    participantId: row.participant_id,
    score: row.score as 1 | 2 | 3 | 4 | 5,
  }));
}
