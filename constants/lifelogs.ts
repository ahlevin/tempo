// ---------------------------------------------------------------------------
// Life-log presets. A life log is the memory type 'lifelog'; it can be a simple
// COUNT (tally of occurrences) or a COLLECTION (progress toward a set/target).
// Collection presets carry a `universe` (the full named set) so entries can be
// picked from remaining items; custom collections use only a numeric `target`.
// ---------------------------------------------------------------------------

import { EXPANDED_UNIVERSES } from './lifelogUniverses.generated';

export interface LifelogPreset {
  id: string;
  name: string;
  emoji: string;
  kind: 'count' | 'collection';
  universe?: string[]; // full named set (collection presets only)
  target?: number;     // the "Y" (defaults to universe.length for collections)
  group?: string;      // browser grouping for expanded presets (originals: undefined → "Popular")
}

// ---- Seeded universes ------------------------------------------------------

export const CONTINENTS = [
  'Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America',
];

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming',
];

// The 63 designated U.S. National Parks (not monuments/historic sites).
export const US_NATIONAL_PARKS = [
  'Acadia', 'National Park of American Samoa', 'Arches', 'Badlands', 'Big Bend', 'Biscayne',
  'Black Canyon of the Gunnison', 'Bryce Canyon', 'Canyonlands', 'Capitol Reef',
  'Carlsbad Caverns', 'Channel Islands', 'Congaree', 'Crater Lake', 'Cuyahoga Valley',
  'Death Valley', 'Denali', 'Dry Tortugas', 'Everglades', 'Gates of the Arctic',
  'Gateway Arch', 'Glacier', 'Glacier Bay', 'Grand Canyon', 'Grand Teton', 'Great Basin',
  'Great Sand Dunes', 'Great Smoky Mountains', 'Guadalupe Mountains', 'Haleakalā',
  'Hawaiʻi Volcanoes', 'Hot Springs', 'Indiana Dunes', 'Isle Royale', 'Joshua Tree',
  'Katmai', 'Kenai Fjords', 'Kings Canyon', 'Kobuk Valley', 'Lake Clark', 'Lassen Volcanic',
  'Mammoth Cave', 'Mesa Verde', 'Mount Rainier', 'New River Gorge', 'North Cascades',
  'Olympic', 'Petrified Forest', 'Pinnacles', 'Redwood', 'Rocky Mountain', 'Saguaro',
  'Sequoia', 'Shenandoah', 'Theodore Roosevelt', 'Virgin Islands', 'Voyageurs',
  'White Sands', 'Wind Cave', 'Wrangell–St. Elias', 'Yellowstone', 'Yosemite', 'Zion',
];

// The 30 current MLB ballparks, one per club (team in parens for recognition).
// A few names are recent (2025) renames/relocations — see report notes.
export const MLB_BALLPARKS = [
  'Angel Stadium (Angels)', 'American Family Field (Brewers)', 'Busch Stadium (Cardinals)',
  'Camden Yards (Orioles)', 'Chase Field (Diamondbacks)', 'Citi Field (Mets)',
  'Citizens Bank Park (Phillies)', 'Comerica Park (Tigers)', 'Coors Field (Rockies)',
  'Daikin Park (Astros)', 'Dodger Stadium (Dodgers)', 'Fenway Park (Red Sox)',
  'Globe Life Field (Rangers)', 'Great American Ball Park (Reds)', 'Kauffman Stadium (Royals)',
  'loanDepot Park (Marlins)', 'Nationals Park (Nationals)', 'Oracle Park (Giants)',
  'PNC Park (Pirates)', 'Petco Park (Padres)', 'Progressive Field (Guardians)',
  'Rate Field (White Sox)', 'Rogers Centre (Blue Jays)', 'Sutter Health Park (Athletics)',
  'T-Mobile Park (Mariners)', 'Target Field (Twins)', 'Tropicana Field (Rays)',
  'Truist Park (Braves)', 'Wrigley Field (Cubs)', 'Yankee Stadium (Yankees)',
];

// The 195 UN-recognized sovereign states (193 members + 2 observers: Holy See, Palestine).
export const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
  'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain',
  'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
  'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso',
  'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic',
  'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo (Brazzaville)',
  'Congo (Kinshasa)', 'Costa Rica', "Côte d'Ivoire", 'Croatia', 'Cuba', 'Cyprus',
  'Czechia', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji',
  'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada',
  'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Holy See', 'Honduras',
  'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
  'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco',
  'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal',
  'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea',
  'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama',
  'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
  'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia',
  'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'São Tomé and Príncipe',
  'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia',
  'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan',
  'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Tajikistan',
  'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia',
  'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates',
  'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Venezuela',
  'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
];

// ---- Presets ---------------------------------------------------------------

export const COLLECTION_PRESETS: LifelogPreset[] = [
  { id: 'countries',      name: 'Countries Visited',      emoji: '🌍', kind: 'collection', universe: COUNTRIES,         target: 195 },
  { id: 'us_states',      name: 'US States Visited',      emoji: '🗺️', kind: 'collection', universe: US_STATES,         target: 50 },
  { id: 'continents',     name: 'Continents Visited',     emoji: '🌎', kind: 'collection', universe: CONTINENTS,        target: 7 },
  { id: 'national_parks', name: 'National Parks Visited', emoji: '🏞️', kind: 'collection', universe: US_NATIONAL_PARKS, target: 63 },
  { id: 'mlb_ballparks',  name: 'MLB Ballparks Visited',  emoji: '⚾', kind: 'collection', universe: MLB_BALLPARKS,     target: 30 },
];

export const COUNT_PRESETS: LifelogPreset[] = [
  { id: 'hikes',       name: 'Hikes Completed',    emoji: '🥾', kind: 'count' },
  { id: 'races',       name: 'Races Completed',    emoji: '🏁', kind: 'count' },
  { id: 'games',       name: 'Games Attended',     emoji: '🎟️', kind: 'count' },
  { id: 'concerts',    name: 'Concerts Attended',  emoji: '🎵', kind: 'count' },
  { id: 'golf',        name: 'Rounds of Golf',     emoji: '⛳', kind: 'count' },
  { id: 'ski',         name: 'Ski Days',           emoji: '⛷️', kind: 'count' },
  { id: 'books',       name: 'Books Read',         emoji: '📚', kind: 'count' },
  { id: 'movies',      name: 'Movies Watched',     emoji: '🎬', kind: 'count' },
  { id: 'restaurants', name: 'Restaurants Tried',  emoji: '🍽️', kind: 'count' },
  { id: 'museums',     name: 'Museums Visited',    emoji: '🏛️', kind: 'count' },
];

export const LIFELOG_PRESETS: LifelogPreset[] = [...COLLECTION_PRESETS, ...COUNT_PRESETS];

// ---- Expanded seeded universes (ADDITIVE) ----------------------------------
// 77 bounded-universe collection presets from lifelogUniverses.generated.ts.
// Each resolves EXACTLY like the original five universes: collection kind,
// universe = items, target = items.length. The originals above are untouched;
// these are merged in only for resolution (PRESET_BY_ID) and the preset browser.
export const EXPANDED_PRESETS: LifelogPreset[] = EXPANDED_UNIVERSES.map(u => ({
  id: u.id, name: u.name, emoji: u.emoji, kind: 'collection',
  universe: u.items, target: u.items.length, group: u.group,
}));

// Expanded presets grouped for the browser, preserving the file's group order.
export const EXPANDED_GROUPS: { group: string; presets: LifelogPreset[] }[] = (() => {
  const order: string[] = [];
  const byGroup: Record<string, LifelogPreset[]> = {};
  for (const p of EXPANDED_PRESETS) {
    const g = p.group ?? 'Other';
    if (!byGroup[g]) { byGroup[g] = []; order.push(g); }
    byGroup[g].push(p);
  }
  return order.map(g => ({ group: g, presets: byGroup[g] }));
})();

// Every preset (originals + expanded), for the browser's search. Originals first.
export const ALL_LIFELOG_PRESETS: LifelogPreset[] = [...LIFELOG_PRESETS, ...EXPANDED_PRESETS];

// Resolution map covers originals AND expanded. Expanded listed first so an
// original preset ALWAYS wins on any id collision (originals are never altered).
export const PRESET_BY_ID: Record<string, LifelogPreset> =
  Object.fromEntries([...EXPANDED_PRESETS, ...LIFELOG_PRESETS].map(p => [p.id, p]));

/** The named universe for a memory's preset, or undefined (count / custom). */
export function presetUniverse(logPreset: string | undefined): string[] | undefined {
  return logPreset ? PRESET_BY_ID[logPreset]?.universe : undefined;
}
