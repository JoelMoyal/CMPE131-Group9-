// cuisine options shown as filter chips on the create screen
export const CUISINES = [
  { id: 'sushi',   emoji: '🍣', icon: 'fish' as const,              label: 'Sushi'   },
  { id: 'italian', emoji: '🍝', icon: 'pasta' as const,             label: 'Italian' },
  { id: 'burgers', emoji: '🍔', icon: 'hamburger' as const,         label: 'Burgers' },
  { id: 'mexican', emoji: '🌮', icon: 'taco' as const,              label: 'Mexican' },
  { id: 'chinese', emoji: '🥡', icon: 'noodles' as const,           label: 'Chinese' },
  { id: 'healthy', emoji: '🥗', icon: 'food-apple-outline' as const, label: 'Healthy' },
] as const;

export const PRICE_LEVELS = [
  { value: 1, label: '$'   },
  { value: 2, label: '$$'  },
  { value: 3, label: '$$$' },
] as const;

// bay area cities for the location picker
export const CITIES = [
  'San Jose',
  'San Francisco',
  'Oakland',
  'Berkeley',
  'Palo Alto',
  'Santa Clara',
];

export type CuisineId = typeof CUISINES[number]['id'];
