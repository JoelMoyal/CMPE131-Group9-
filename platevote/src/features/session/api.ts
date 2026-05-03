import { isSupabaseEnabled, requireSupabase } from '../../lib/supabase/client';
import type { SessionSummary } from './types';

function makeLocalSession(): SessionSummary {
  return {
    id: `local-${Date.now()}`,
    joinCode: 'LOCAL1',
    title: null,
    status: 'lobby',
    hostUserId: 'local-user',
  };
}

export async function createSession(
  displayName: string,
  title?: string,
): Promise<{ session: SessionSummary; participantId: string }> {
  if (!isSupabaseEnabled()) {
    return { session: makeLocalSession(), participantId: 'local-participant' };
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc('create_session_with_host', {
    p_display_name: displayName,
    p_title: title ?? null,
  });

  if (error || !data || data.length === 0) {
    throw new Error(error?.message ?? 'Unable to create session');
  }

  const row = data[0] as { session_id: string; participant_id: string; join_code: string };

  const { data: sessionData, error: sessionError } = await client
    .from('sessions')
    .select('id, join_code, title, status, host_user_id')
    .eq('id', row.session_id)
    .single();

  if (sessionError || !sessionData) {
    throw new Error(sessionError?.message ?? 'Unable to load session');
  }

  return {
    session: {
      id: sessionData.id,
      joinCode: sessionData.join_code,
      title: sessionData.title,
      status: sessionData.status,
      hostUserId: sessionData.host_user_id,
    },
    participantId: row.participant_id,
  };
}

export async function joinSession(
  joinCode: string,
  displayName: string,
): Promise<{ session: SessionSummary; participantId: string }> {
  if (!isSupabaseEnabled()) {
    return { session: makeLocalSession(), participantId: 'local-participant' };
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc('join_session_by_code', {
    p_join_code: joinCode.toUpperCase(),
    p_display_name: displayName,
  });

  if (error || !data || data.length === 0) {
    throw new Error(error?.message ?? 'Unable to join session');
  }

  const row = data[0] as { session_id: string; participant_id: string };

  const { data: sessionData, error: sessionError } = await client
    .from('sessions')
    .select('id, join_code, title, status, host_user_id')
    .eq('id', row.session_id)
    .single();

  if (sessionError || !sessionData) {
    throw new Error(sessionError?.message ?? 'Unable to load session');
  }

  return {
    session: {
      id: sessionData.id,
      joinCode: sessionData.join_code,
      title: sessionData.title,
      status: sessionData.status,
      hostUserId: sessionData.host_user_id,
    },
    participantId: row.participant_id,
  };
}

export async function startVoting(sessionId: string): Promise<void> {
  if (!isSupabaseEnabled()) return;

  const client = requireSupabase();
  const { error } = await client
    .from('sessions')
    .update({ status: 'voting' })
    .eq('id', sessionId);

  if (error) throw new Error(error.message);
}

export async function completeSession(sessionId: string): Promise<void> {
  if (!isSupabaseEnabled()) return;

  const client = requireSupabase();

  // Get the winning option from option_scores view
  const { data: scores } = await client
    .from('option_scores')
    .select('option_id')
    .eq('session_id', sessionId)
    .order('avg_score', { ascending: false })
    .order('vote_count', { ascending: false })
    .limit(1);

  const winnerId = scores?.[0]?.option_id ?? null;

  const { error } = await client
    .from('sessions')
    .update({ status: 'completed', selected_option_id: winnerId })
    .eq('id', sessionId);

  if (error) throw new Error(error.message);
}
