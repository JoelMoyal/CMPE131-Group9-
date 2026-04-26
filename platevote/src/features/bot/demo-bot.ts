// demo bot - joins a session and votes randomly to simulate a second player
// used for demos when you don't have a second phone handy

import { requireSupabase, supabase } from '../../lib/supabase/client';
import { listOptions } from '../options/api';
import { upsertVote } from '../voting/api';

const BOT_NAMES = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Riley', 'Casey', 'Morgan', 'Jamie'];

function pickRandomName(): string {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
}

// joins the session as a fake participant and polls until voting starts
export async function spawnDemoBot(sessionId: string): Promise<void> {
  if (!supabase) return;

  const client = requireSupabase();
  const botName = `${pickRandomName()} (bot)`;

  // insert bot directly as a participant
  const { data: participant, error: joinError } = await client
    .from('participants')
    .insert({
      session_id: sessionId,
      user_id: `bot-${Date.now()}`,
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

  // poll every 2s waiting for voting to start
  const poll = setInterval(async () => {
    const { data: session } = await client
      .from('sessions')
      .select('status')
      .eq('id', sessionId)
      .single();

    if (session?.status === 'voting') {
      clearInterval(poll);
      await botVote(sessionId, botParticipantId);
    }
  }, 2000);

  // stop polling after 5 minutes to avoid leaks
  setTimeout(() => clearInterval(poll), 5 * 60 * 1000);
}

// bot votes on each restaurant with random yes/no
async function botVote(sessionId: string, participantId: string): Promise<void> {
  // small delay so it feels like a real person
  await delay(1500);

  const options = await listOptions(sessionId);

  for (const option of options) {
    // random vote: 60% chance of yes (score 5), 40% chance of no (score 1)
    const liked = Math.random() < 0.6;
    const score = liked ? 5 : 1;

    try {
      await upsertVote(sessionId, option.id, participantId, score as 1 | 5);
    } catch {
      // keep going if one vote fails
    }

    // wait a bit between votes so it looks natural
    await delay(800 + Math.random() * 1200);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
