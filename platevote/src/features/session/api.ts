import { requireSupabase, supabase } from '../../lib/supabase/client';
import type { SessionSummary, TimeSlot, TimeAvailability } from './types';

function makeLocalSession(): SessionSummary {
  return {
    id: `local-${Date.now()}`,
    joinCode: 'LOCAL1',
    title: null,
    status: 'lobby',
    hostUserId: 'local-user',
    enableTimeSelection: false,
  };
}

export async function createSession(
  displayName: string,
  title?: string,
  enableTimeSelection = false,
): Promise<{ session: SessionSummary; participantId: string }> {
  if (!supabase) {
    return { session: makeLocalSession(), participantId: 'local-participant' };
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc('create_session_with_host', {
    p_display_name: displayName,
    p_title: title ?? null,
    p_enable_time_selection: enableTimeSelection,
  });

  if (error || !data || data.length === 0) {
    throw new Error(error?.message ?? 'Unable to create session');
  }

  const row = data[0] as { session_id: string; participant_id: string; join_code: string };

  const { data: sessionData, error: sessionError } = await client
    .from('sessions')
    .select('id, join_code, title, status, host_user_id, enable_time_selection')
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
      enableTimeSelection: sessionData.enable_time_selection,
    },
    participantId: row.participant_id,
  };
}

export async function joinSession(
  joinCode: string,
  displayName: string,
): Promise<{ session: SessionSummary; participantId: string }> {
  if (!supabase) {
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
    .select('id, join_code, title, status, host_user_id, enable_time_selection')
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
      enableTimeSelection: sessionData.enable_time_selection,
    },
    participantId: row.participant_id,
  };
}

export async function startVoting(sessionId: string): Promise<void> {
  if (!supabase) return;

  const client = requireSupabase();
  const { error } = await client
    .from('sessions')
    .update({ status: 'voting' })
    .eq('id', sessionId);

  if (error) throw new Error(error.message);
}

export async function completeSession(sessionId: string): Promise<void> {
  if (!supabase) return;

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
export async function createTimeSlots(
  sessionId: string,
  timeSlots: Array<{ startTime: string; endTime: string }>,
): Promise<TimeSlot[]> {
  if (!supabase) return [];

  const client = requireSupabase();
  const { data, error } = await client
    .from('time_slots')
    .insert(
      timeSlots.map((slot) => ({
        session_id: sessionId,
        start_time: slot.startTime,
        end_time: slot.endTime,
      })),
    )
    .select('id, session_id, start_time, end_time, created_at');

  if (error || !data) throw new Error(error?.message ?? 'Unable to create time slots');

  return data.map((row: any) => ({
    id: row.id,
    sessionId: row.session_id,
    startTime: row.start_time,
    endTime: row.end_time,
    createdAt: row.created_at,
  }));
}

export async function getTimeSlots(sessionId: string): Promise<TimeSlot[]> {
  if (!supabase) return [];

  const client = requireSupabase();
  const { data, error } = await client
    .from('time_slots')
    .select('id, session_id, start_time, end_time, created_at')
    .eq('session_id', sessionId)
    .order('start_time', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    sessionId: row.session_id,
    startTime: row.start_time,
    endTime: row.end_time,
    createdAt: row.created_at,
  }));
}

export async function setTimeAvailability(
  participantId: string,
  timeSlotId: string,
  available: boolean,
): Promise<TimeAvailability> {
  if (!supabase) {
    return {
      id: 'local',
      participantId,
      timeSlotId,
      available,
      createdAt: new Date().toISOString(),
    };
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from('time_availability')
    .upsert(
      {
        participant_id: participantId,
        time_slot_id: timeSlotId,
        available,
      },
      { onConflict: 'participant_id,time_slot_id' },
    )
    .select('id, participant_id, time_slot_id, available, created_at')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Unable to save availability');

  return {
    id: data.id,
    participantId: data.participant_id,
    timeSlotId: data.time_slot_id,
    available: data.available,
    createdAt: data.created_at,
  };
}

export async function getTimeAvailability(
  sessionId: string,
): Promise<Record<string, TimeAvailability[]>> {
  if (!supabase) return {};

  const client = requireSupabase();
  const { data, error } = await client
    .from('time_availability')
    .select('id, participant_id, time_slot_id, available, created_at')
    .in(
      'time_slot_id',
      (await getTimeSlots(sessionId)).map((ts) => ts.id),
    );

  if (error) throw new Error(error.message);

  const result: Record<string, TimeAvailability[]> = {};
  for (const row of data ?? []) {
    if (!result[row.time_slot_id]) {
      result[row.time_slot_id] = [];
    }
    result[row.time_slot_id].push({
      id: row.id,
      participantId: row.participant_id,
      timeSlotId: row.time_slot_id,
      available: row.available,
      createdAt: row.created_at,
    });
  }

  return result;
}