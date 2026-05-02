import { create } from 'zustand';

import type { SessionStatus } from '../features/session/types';

type SessionStore = {
  sessionId: string | null;
  participantId: string | null;
  participantName: string | null;
  status: SessionStatus | null;
  joinCode: string | null;
  isHost: boolean;
  enableTimeSelection: boolean;
  selectedCuisines: string[];
  selectedPriceLevel: number | null;

  setSession: (payload: {
    sessionId: string;
    participantId?: string | null;
    participantName?: string | null;
    status: SessionStatus;
    joinCode?: string | null;
    isHost?: boolean;
    enableTimeSelection?: boolean;
  }) => void;
  setParticipantName: (name: string) => void;
  setPreferences: (cuisines: string[], priceLevel: number | null) => void;
  setStatus: (status: SessionStatus) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  participantId: null,
  participantName: null,
  status: null,
  joinCode: null,
  isHost: false,
  enableTimeSelection: false,
  selectedCuisines: [],
  selectedPriceLevel: null,

  setSession: ({ sessionId, participantId = null, participantName = null, status, joinCode = null, isHost = false, enableTimeSelection = false }) =>
    set({ sessionId, participantId, participantName, status, joinCode, isHost, enableTimeSelection }),

  setParticipantName: (name) => set({ participantName: name }),

  setPreferences: (cuisines, priceLevel) =>
    set({ selectedCuisines: cuisines, selectedPriceLevel: priceLevel }),

  setStatus: (status) => set({ status }),

  clearSession: () =>
    set({
      sessionId: null,
      participantId: null,
      participantName: null,
      status: null,
      joinCode: null,
      isHost: false,
      enableTimeSelection: false,
      selectedCuisines: [],
      selectedPriceLevel: null,
    }),
}));
