import { supabase } from '../../lib/supabase/client';
import type { Vote } from '../session/types';

export async function upsertVote(
  _sessionId: string,
  optionId: string,
  score: 1 | 2 | 3 | 4 | 5,
): Promise<Vote> {
  if (!supabase) {
    return {
      id: `local-vote-${Date.now()}`,
      sessionId: 'local-session',
      optionId,
      participantId: 'local-participant',
      score,
    };
  }

  // TODO: Upsert vote row by participant_id + option_id.
  throw new Error('upsertVote is not implemented yet.');
}

export async function listVotes(_sessionId: string): Promise<Vote[]> {
  if (!supabase) {
    return [];
  }

  // TODO: Query votes for session.
  return [];
}
