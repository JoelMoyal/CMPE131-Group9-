export type RankedOption = {
  id: string;
  name: string;
  avgScore: number;
  voteCount: number;
  distanceMiles?: number | null;
  createdAt: string;
};

export function compareRankedOptions(a: RankedOption, b: RankedOption): number {
  if (b.avgScore !== a.avgScore) {
    return b.avgScore - a.avgScore;
  }

  if (b.voteCount !== a.voteCount) {
    return b.voteCount - a.voteCount;
  }

  const aDistance = a.distanceMiles ?? Number.POSITIVE_INFINITY;
  const bDistance = b.distanceMiles ?? Number.POSITIVE_INFINITY;
  if (aDistance !== bDistance) {
    return aDistance - bDistance;
  }

  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}
