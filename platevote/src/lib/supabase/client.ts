import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
let runtimeSupabaseDisabled = false;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

export function isSupabaseEnabled(): boolean {
  return Boolean(supabase && !runtimeSupabaseDisabled);
}

export function isNetworkRequestFailure(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  return /network request failed|failed to fetch|fetch failed/i.test(message);
}

export function disableSupabaseForRuntime(reason?: unknown): void {
  if (!supabase || runtimeSupabaseDisabled) return;

  runtimeSupabaseDisabled = true;
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === 'string'
        ? reason
        : '';

  if (message.length > 0) {
    console.warn(`Supabase disabled for this app run: ${message}`);
    return;
  }

  console.warn('Supabase disabled for this app run.');
}

export function requireSupabase(): SupabaseClient {
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error(
      'Supabase is unavailable. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  return supabase;
}
