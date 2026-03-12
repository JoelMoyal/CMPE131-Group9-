import { supabase } from '../../lib/supabase/client';
import type { RestaurantOption } from '../session/types';

export type AddOptionInput = {
  name: string;
  cuisine?: string;
  priceLevel?: number;
  distanceMiles?: number;
};

export async function listOptions(_sessionId: string): Promise<RestaurantOption[]> {
  if (!supabase) {
    return [];
  }

  // TODO: Query restaurant_options by session_id.
  return [];
}

export async function addOption(
  _sessionId: string,
  input: AddOptionInput,
): Promise<RestaurantOption> {
  if (!supabase) {
    return {
      id: `local-option-${Date.now()}`,
      sessionId: 'local-session',
      name: input.name,
      cuisine: input.cuisine ?? null,
      priceLevel: input.priceLevel ?? null,
      distanceMiles: input.distanceMiles ?? null,
      createdAt: new Date().toISOString(),
    };
  }

  // TODO: Insert new restaurant_options row.
  throw new Error('addOption is not implemented yet.');
}
