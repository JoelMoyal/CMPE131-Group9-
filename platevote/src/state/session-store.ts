import { create } from 'zustand';

import type { SessionStatus } from '../features/session/types';

type SessionStore = {
  sessionId: string | null;
  participantId: string | null;
  status: SessionStatus | null;
  setSession: (payload: {
    sessionId: string;
    participantId?: string | null;
    status: SessionStatus;
  }) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  participantId: null,
  status: null,
  setSession: ({ sessionId, participantId = null, status }) =>
    set({ sessionId, participantId, status }),
  clearSession: () => set({ sessionId: null, participantId: null, status: null }),
}));
