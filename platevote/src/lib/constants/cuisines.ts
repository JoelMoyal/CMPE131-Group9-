export const CUISINES = [
  { id: 'sushi',   emoji: '🍣', label: 'Sushi'   },
  { id: 'italian', emoji: '🍝', label: 'Italian' },
  { id: 'burgers', emoji: '🍔', label: 'Burgers' },
  { id: 'mexican', emoji: '🌮', label: 'Mexican' },
  { id: 'chinese', emoji: '🥡', label: 'Chinese' },
  { id: 'healthy', emoji: '🥗', label: 'Healthy' },
] as const;

export const PRICE_LEVELS = [
  { value: 1, label: '$'   },
  { value: 2, label: '$$'  },
  { value: 3, label: '$$$' },
] as const;

export const CITIES = [
  'San Jose',
  'San Francisco',
  'Oakland',
  'Berkeley',
  'Palo Alto',
  'Santa Clara',
];

export type CuisineId = typeof CUISINES[number]['id'];
