import { compareRankedOptions } from '../../utils/tie-break';

export type OptionForResult = {
  id: string;
  name: string;
  cuisine?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  distanceMiles?: number | null;
};

export type VoteForResult = {
  optionId: string;
  score: number;
};

export type WinnerResult = {
  id: string;
  name: string;
  cuisine?: string | null;
  imageUrl?: string | null;
  avgScore: number;
  voteCount: number;
  distanceMiles?: number | null;
  createdAt: string;
};

export function computeWinner(
  options: OptionForResult[],
  votes: VoteForResult[],
): WinnerResult | null {
  if (options.length === 0) {
    return null;
  }

  const ranked = options.map((option) => {
    const optionVotes = votes.filter((vote) => vote.optionId === option.id);
    const totalScore = optionVotes.reduce((acc, vote) => acc + vote.score, 0);

    return {
      id: option.id,
      name: option.name,
      cuisine: option.cuisine ?? null,
      imageUrl: option.imageUrl ?? null,
      avgScore: optionVotes.length ? totalScore / optionVotes.length : 0,
      voteCount: optionVotes.length,
      distanceMiles: option.distanceMiles ?? null,
      createdAt: option.createdAt,
    };
  });

  ranked.sort(compareRankedOptions);
  return ranked[0] ?? null;
}
