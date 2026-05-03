import { isSupabaseEnabled, requireSupabase } from '../../lib/supabase/client';
import type { RestaurantOption } from '../session/types';

export type AddOptionInput = {
  name: string;
  cuisine?: string;
  priceLevel?: number;
  distanceMiles?: number;
  imageUrl?: string;
};

function rowToOption(row: Record<string, unknown>): RestaurantOption {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    cuisine: (row.cuisine as string) ?? null,
    priceLevel: (row.price_level as number) ?? null,
    distanceMiles: (row.distance_miles as number) ?? null,
    imageUrl: (row.image_url as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function listOptions(sessionId: string): Promise<RestaurantOption[]> {
  if (!isSupabaseEnabled()) return [];

  const client = requireSupabase();
  const { data, error } = await client
    .from('restaurant_options')
    .select('id, session_id, name, cuisine, price_level, distance_miles, image_url, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToOption);
}

export async function addOption(
  sessionId: string,
  input: AddOptionInput,
  participantId: string,
): Promise<RestaurantOption> {
  if (!isSupabaseEnabled()) {
    return {
      id: `local-option-${Date.now()}`,
      sessionId,
      name: input.name,
      cuisine: input.cuisine ?? null,
      priceLevel: input.priceLevel ?? null,
      distanceMiles: input.distanceMiles ?? null,
      imageUrl: input.imageUrl ?? null,
      createdAt: new Date().toISOString(),
    };
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from('restaurant_options')
    .insert({
      session_id: sessionId,
      added_by_participant_id: participantId,
      name: input.name,
      cuisine: input.cuisine ?? null,
      price_level: input.priceLevel ?? null,
      distance_miles: input.distanceMiles ?? null,
      image_url: input.imageUrl ?? null,
    })
    .select('id, session_id, name, cuisine, price_level, distance_miles, image_url, created_at')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Unable to add option');
  return rowToOption(data as Record<string, unknown>);
}
