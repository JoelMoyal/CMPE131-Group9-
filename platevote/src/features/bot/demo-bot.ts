// demo bot - joins a session and votes randomly to simulate a second player
// used for demos when you don't have a second phone handy

import { createClient } from '@supabase/supabase-js';
import { listOptions } from '../options/api';

const BOT_NAMES = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Riley', 'Casey', 'Morgan', 'Jamie'];

function pickRandomName(): string {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
}

// creates a separate supabase client with its own anonymous auth
// so the bot has a different user_id than the real player
function createBotClient() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function spawnDemoBot(sessionId: string): Promise<void> {
  const botClient = createBotClient();
  if (!botClient) return;

  const botName = `${pickRandomName()} (bot)`;

  // sign in as a new anonymous user so the bot gets its own user_id
  const { error: authError } = await botClient.auth.signInAnonymously();
  if (authError) {
    console.log('Bot auth failed:', authError.message);
    return;
  }

  // get the bot's user id from its auth session
  const { data: { user } } = await botClient.auth.getUser();
  if (!user) {
    console.log('Bot: no user after auth');
    return;
  }

  // insert directly as a participant
  const { data: participant, error: joinError } = await botClient
    .from('participants')
    .insert({
      session_id: sessionId,
      user_id: user.id,
      display_name: botName,
      is_host: false,
    })
    .select('id')
    .single();

  if (joinError || !participant) {
    console.log('Bot could not join:', joinError?.message);
    return;
  }

  const botParticipantId = participant.id;
  console.log(`Bot "${botName}" joined! Waiting for voting...`);

  // poll every 2s waiting for voting to start
  const poll = setInterval(async () => {
    const { data: session } = await botClient
      .from('sessions')
      .select('status')
      .eq('id', sessionId)
      .single();

    if (session?.status === 'voting') {
      clearInterval(poll);
      await botVote(sessionId, botParticipantId, botClient);
    }
  }, 2000);

  // stop polling after 5 minutes
  setTimeout(() => clearInterval(poll), 5 * 60 * 1000);
}

// bot votes on each restaurant with random yes/no
async function botVote(
  sessionId: string,
  participantId: string,
  client: ReturnType<typeof createClient>,
): Promise<void> {
  await delay(1500);
  const options = await listOptions(sessionId);

  for (const option of options) {
    const liked = Math.random() < 0.6;
    const score = liked ? 5 : 1;

    try {
      await client
        .from('votes')
        .upsert(
          { session_id: sessionId, option_id: option.id, participant_id: participantId, score },
          { onConflict: 'participant_id,option_id' },
        );
    } catch {
      // keep going if one vote fails
    }

    // wait between votes so it looks natural
    await delay(800 + Math.random() * 1200);
  }
  console.log('Bot finished voting!');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
