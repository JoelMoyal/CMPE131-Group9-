import { useEffect } from 'react';
import {
  disableSupabaseForRuntime,
  isNetworkRequestFailure,
  isSupabaseEnabled,
  requireSupabase,
} from '../supabase/client';

export function useAnonymousAuth() {
  useEffect(() => {
    if (!isSupabaseEnabled()) return;

    let cancelled = false;

    const init = async () => {
      try {
        const client = requireSupabase();
        const {
          data: { session },
        } = await client.auth.getSession();

        if (!session && !cancelled) {
          await client.auth.signInAnonymously();
        }
      } catch (error: unknown) {
        if (isNetworkRequestFailure(error)) {
          disableSupabaseForRuntime(error);
          return;
        }

        console.warn(
          `Anonymous auth initialization failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, []);
}
