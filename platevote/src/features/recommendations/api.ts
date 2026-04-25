export type Recommendation = {
  id: string;
  name: string;
  cuisine?: string;
  priceLevel?: number;
  distanceMiles?: number;
  imageUrl?: string;
};

export type RecommendationFilters = {
  location?: string;
  cuisine?: string;
  priceLevel?: number;
};

type GooglePlaceResult = {
  place_id: string;
  name: string;
  price_level?: number;
  rating?: number;
  vicinity?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
  types?: string[];
  photos?: Array<{
    photo_reference: string;
  }>;
};

type GooglePlacesResponse = {
  status: string;
  results?: GooglePlaceResult[];
  error_message?: string;
};

const GOOGLE_PLACES_TEXT_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const SAMPLE_RECOMMENDATIONS: Recommendation[] = [
  { id: 'sample-1', name: 'Sushi Sakura', cuisine: 'Sushi', priceLevel: 3, distanceMiles: 1.4 },
  { id: 'sample-2', name: 'Mama Roma', cuisine: 'Italian', priceLevel: 2, distanceMiles: 2.1 },
  { id: 'sample-3', name: 'Golden Wok', cuisine: 'Chinese', priceLevel: 2, distanceMiles: 2.7 },
  { id: 'sample-4', name: 'Taqueria Sol', cuisine: 'Mexican', priceLevel: 1, distanceMiles: 1.8 },
  { id: 'sample-5', name: 'Green Bowl Kitchen', cuisine: 'Healthy', priceLevel: 2, distanceMiles: 1.2 },
];

function getGooglePlacesApiKey(): string | null {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  return apiKey?.trim() ? apiKey.trim() : null;
}

function buildPlacesQuery(filters: RecommendationFilters): string {
  const parts = ['restaurants'];

  if (filters.cuisine?.trim()) {
    parts.push(filters.cuisine.trim());
  }

  if (filters.location?.trim()) {
    parts.push(`in ${filters.location.trim()}`);
  }

  return parts.join(' ');
}

function inferCuisine(types?: string[]): string | undefined {
  if (!types || types.length === 0) return undefined;

  const preferredType = types.find((value) => value !== 'restaurant' && value !== 'food' && value !== 'point_of_interest');
  if (!preferredType) return undefined;

  return preferredType
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function buildPhotoUrl(photoReference: string, apiKey: string): string {
  const params = new URLSearchParams({
    maxwidth: '400',
    photo_reference: photoReference,
    key: apiKey,
  });

  return `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`;
}

function mapGooglePlaceToRecommendation(place: GooglePlaceResult, apiKey: string): Recommendation {
  return {
    id: place.place_id,
    name: place.name,
    cuisine: inferCuisine(place.types),
    priceLevel: place.price_level,
    imageUrl: place.photos?.[0]?.photo_reference
      ? buildPhotoUrl(place.photos[0].photo_reference, apiKey)
      : undefined,
  };
}

function filterRecommendations(recommendations: Recommendation[], filters: RecommendationFilters): Recommendation[] {
  return recommendations.filter((recommendation) => {
    const cuisineMatches = filters.cuisine?.trim()
      ? recommendation.cuisine?.toLowerCase().includes(filters.cuisine.trim().toLowerCase())
      : true;

    const priceMatches = typeof filters.priceLevel === 'number'
      ? recommendation.priceLevel === filters.priceLevel
      : true;

    return cuisineMatches && priceMatches;
  });
}

async function getGooglePlacesRecommendations(filters: RecommendationFilters): Promise<Recommendation[]> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) {
    return SAMPLE_RECOMMENDATIONS;
  }

  const params = new URLSearchParams({
    query: buildPlacesQuery(filters),
    type: 'restaurant',
    key: apiKey,
  });

  if (typeof filters.priceLevel === 'number') {
    params.set('minprice', String(filters.priceLevel));
    params.set('maxprice', String(filters.priceLevel));
  }

  const response = await fetch(`${GOOGLE_PLACES_TEXT_SEARCH_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Google Places request failed (${response.status})`);
  }

  const payload = (await response.json()) as GooglePlacesResponse;
  if (payload.status !== 'OK' && payload.status !== 'ZERO_RESULTS') {
    throw new Error(payload.error_message ?? `Google Places returned status ${payload.status}`);
  }

  const mapped = (payload.results ?? []).map((place) => mapGooglePlaceToRecommendation(place, apiKey));
  return filterRecommendations(mapped, filters);
}

export async function getRecommendations(
  _sessionId: string,
  filters: RecommendationFilters = {},
): Promise<Recommendation[]> {
  const recommendations = await getGooglePlacesRecommendations(filters);
  return recommendations.slice(0, 5);
}
