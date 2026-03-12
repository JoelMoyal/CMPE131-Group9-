import { requireSupabase, supabase } from '../../lib/supabase/client';
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
  _displayName: string,
  _title?: string,
): Promise<SessionSummary> {
  if (!supabase) {
    return makeLocalSession();
  }

  // TODO: Replace with RPC call to create session + host participant in one transaction.
  const client = requireSupabase();
  const { data, error } = await client
    .from('sessions')
    .insert({ host_user_id: (await client.auth.getUser()).data.user?.id })
    .select('id, join_code, title, status, host_user_id')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to create session');
  }

  return {
    id: data.id,
    joinCode: data.join_code,
    title: data.title,
    status: data.status,
    hostUserId: data.host_user_id,
  };
}

export async function joinSession(
  _joinCode: string,
  _displayName: string,
): Promise<SessionSummary> {
  if (!supabase) {
    return makeLocalSession();
  }

  // TODO: Replace with RPC call that validates join code and inserts participant.
  throw new Error('joinSession is not implemented yet.');
}

export async function startVoting(_sessionId: string): Promise<void> {
  if (!supabase) {
    return;
  }

  throw new Error('startVoting is not implemented yet.');
}

export async function completeSession(_sessionId: string): Promise<void> {
  if (!supabase) {
    return;
  }

  throw new Error('completeSession is not implemented yet.');
}
