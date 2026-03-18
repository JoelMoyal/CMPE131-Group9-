import { useEffect } from 'react';
import { supabase } from '../supabase/client';

export function useAnonymousAuth() {
  useEffect(() => {
    if (!supabase) return;
    const init = async () => {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) {
        await supabase!.auth.signInAnonymously();
      }
    };
    init();
  }, []);
}
