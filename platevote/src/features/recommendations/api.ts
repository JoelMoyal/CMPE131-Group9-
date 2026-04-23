export type Recommendation = {
  id: string;
  name: string;
  cuisine?: string;
  priceLevel?: number;
  distanceMiles?: number;
  imageUrl?: string;
};

const SAMPLE_RECOMMENDATIONS: Recommendation[] = [
  {
    id: "sample-1",
    name: "Test 1",
    cuisine: "Sushi",
    priceLevel: 3,
    distanceMiles: 2.1,
  },
  {
    id: "sample-2",
    name: "Test 2",
    cuisine: "Italian",
    priceLevel: 2,
    distanceMiles: 1.7,
  },
  {
    id: "sample-3",
    name: "Test 3",
    cuisine: "Chinese",
    priceLevel: 2,
    distanceMiles: 2.8,
  },
  {
    id: "sample-4",
    name: "Test 4",
    cuisine: "Mexican",
    priceLevel: 2,
    distanceMiles: 1.3,
  },
  {
    id: "sample-5",
    name: "Test 5",
    cuisine: "Mexican",
    priceLevel: 2,
    distanceMiles: 1.9,
  },
];

export async function getRecommendations(
  _sessionId: string,
): Promise<Recommendation[]> {
  return SAMPLE_RECOMMENDATIONS.slice(0, 5);
}
