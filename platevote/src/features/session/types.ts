export type SessionStatus = 'lobby' | 'voting' | 'completed';

export type SessionSummary = {
  id: string;
  joinCode: string;
  title: string | null;
  status: SessionStatus;
  hostUserId: string;
  enableTimeSelection: boolean;
};

export type Participant = {
  id: string;
  sessionId: string;
  userId: string;
  displayName: string;
  isHost: boolean;
};

export type RestaurantOption = {
  id: string;
  sessionId: string;
  name: string;
  cuisine: string | null;
  priceLevel: number | null;
  distanceMiles: number | null;
  imageUrl: string | null;
  createdAt: string;
};

export type SessionFilters = {
  cuisines: string[];
  priceLevel: number | null;
  maxDistanceMiles: number | null;
};

export type Vote = {
  id: string;
  sessionId: string;
  optionId: string;
  participantId: string;
  score: 1 | 2 | 3 | 4 | 5;
};

export type TimeSlot = {
  id: string;
  sessionId: string;
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  createdAt: string;
};

export type TimeAvailability = {
  id: string;
  participantId: string;
  timeSlotId: string;
  available: boolean;
  createdAt: string;
};
