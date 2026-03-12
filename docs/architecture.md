# PlateVote Architecture (MVP)

## 1) Scope
This architecture is for the first working version of PlateVote:
- mobile app for iOS/Android
- create or join a session
- add restaurant options
- vote/rate options
- show one winner

This design optimizes for fast team delivery and demo reliability.

## 2) Chosen Stack
- Frontend: Expo + React Native + TypeScript
- Routing: Expo Router
- Backend: Supabase (Postgres + Realtime + Auth)
- Auth: Supabase anonymous auth (no signup friction, but each device still has a user id)
- State: local feature state + lightweight global session store

Why this stack:
- minimal backend setup
- strong realtime support
- clear upgrade path after MVP

## 3) System Architecture
```text
Mobile App (Expo)
  -> Supabase Auth (anonymous user)
  -> Supabase Postgres (sessions/options/votes)
  -> Supabase Realtime (live lobby/vote updates)
```

No custom Node server is required for MVP.

## 4) App Module Boundaries
```text
platevote/
  app/
    index.tsx                  # landing: create/join
    session/[sessionId]/
      lobby.tsx                # participants + options list
      vote.tsx                 # voting UI
      result.tsx               # winner screen
  src/
    features/
      session/
        api.ts                 # create/join/start/finish session
        types.ts
      options/
        api.ts                 # add/list restaurant options
        components/
      voting/
        api.ts                 # submit/list votes
        components/
      results/
        selectors.ts           # winner/tie-break logic
    lib/
      supabase/
        client.ts              # singleton Supabase client
      constants/
        theme.ts               # locked palette tokens
    state/
      session-store.ts         # current session, participant, phase
    utils/
      tie-break.ts
```

Architecture rule:
- UI screens do not call Supabase directly.
- Every feature owns its own API layer and types.

## 5) Data Model (Supabase)
Core entities:
- `sessions`: one decision room, host, lifecycle status
- `participants`: users in a session
- `restaurant_options`: candidate restaurants
- `votes`: participant scores per option

Relationship overview:
```text
sessions 1---* participants
sessions 1---* restaurant_options
sessions 1---* votes
restaurant_options 1---* votes
participants 1---* votes
```

Suggested columns:

### `sessions`
- `id` (uuid, pk)
- `join_code` (text, unique, 6 chars)
- `title` (text, nullable)
- `host_user_id` (uuid -> auth.users.id)
- `status` (enum: lobby, voting, completed)
- `selected_option_id` (uuid, nullable)
- `created_at`, `updated_at` (timestamptz)

### `participants`
- `id` (uuid, pk)
- `session_id` (uuid -> sessions.id)
- `user_id` (uuid -> auth.users.id)
- `display_name` (text)
- `is_host` (bool)
- `joined_at`, `last_seen_at` (timestamptz)
- unique key: (`session_id`, `user_id`)

### `restaurant_options`
- `id` (uuid, pk)
- `session_id` (uuid -> sessions.id)
- `added_by_participant_id` (uuid -> participants.id)
- `name` (text)
- `cuisine` (text, nullable)
- `price_level` (int, 1..4, nullable)
- `distance_miles` (numeric, nullable)
- `map_url` (text, nullable)
- `created_at` (timestamptz)

### `votes`
- `id` (uuid, pk)
- `session_id` (uuid -> sessions.id)
- `option_id` (uuid -> restaurant_options.id)
- `participant_id` (uuid -> participants.id)
- `score` (int, 1..5)
- `created_at`, `updated_at` (timestamptz)
- unique key: (`participant_id`, `option_id`)

## 6) Session Lifecycle
1. Host creates session -> `status = lobby`, `join_code` generated.
2. Others join by code.
3. Everyone adds options.
4. Host starts voting -> `status = voting`.
5. Participants submit scores.
6. Host finalizes -> winner computed and saved as `selected_option_id`, `status = completed`.

## 7) Winner + Tie-Break Rules
Primary score:
- highest average vote score per option

Tie-break order:
1. higher vote count
2. lower average distance (if available)
3. earliest option added

This should be implemented once in a shared selector/util so all screens show the same result.

## 8) Realtime Strategy
Subscribe by `session_id` to:
- `participants`
- `restaurant_options`
- `votes`
- `sessions` (status and selected winner changes)

Realtime events should update local store and avoid full-page reload.

## 9) Security Model (RLS)
Use Supabase Row Level Security with anonymous auth enabled.

Minimum policy intent:
- only session participants can read session rows
- users can only write participant rows tied to their `auth.uid()`
- users can only edit their own votes
- only host can transition `sessions.status` to voting/completed

Note:
- create/join actions are easiest via SQL RPC functions to keep `join_code` logic and host checks centralized.

## 10) API Surface (Feature Layer)
`session/api.ts`
- `createSession(displayName: string, title?: string)`
- `joinSession(joinCode: string, displayName: string)`
- `startVoting(sessionId: string)`
- `completeSession(sessionId: string)`
- `subscribeToSession(sessionId: string)`

`options/api.ts`
- `listOptions(sessionId: string)`
- `addOption(sessionId: string, payload)`

`voting/api.ts`
- `upsertVote(sessionId: string, optionId: string, score: 1|2|3|4|5)`
- `listVotes(sessionId: string)`

`results/selectors.ts`
- `computeWinner(options, votes): WinnerResult`

## 11) Non-Functional Targets (MVP)
- Screen transitions under 200ms on typical campus Wi-Fi
- Realtime updates visible under 1s
- Graceful fallback for dropped network
- Input validation on client and database constraints

## 12) Build Plan
Phase 1:
- scaffold Expo app and route skeleton
- set up Supabase project and tables
- implement create/join lobby flow

Phase 2:
- add options + realtime list updates
- add voting screen + upsert votes

Phase 3:
- result computation + tie-break
- polish demo flow + bug pass

## 13) Open Decisions to Lock Next
- session code format (6-char alphanumeric or 4-word phrase)
- vote model (1-5 rating vs single pick)
- login in MVP (keep anonymous only, or add optional named accounts)
