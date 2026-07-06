export type ThemeName = 'light' | 'dark';

export interface Palette {
  isDark: boolean;
  bg: string;
  surf: string;
  surf2: string;
  glass: string;
  border: string;
  accent: string;
  rose: string;
  teal: string;
  amber: string;
  text1: string;
  text2: string;
  text3: string;
}

// Dark theme — the original values, unchanged.
export const darkColors: Palette = {
  isDark: true,
  bg:      '#0A0A0F',
  surf:    '#141420',
  surf2:   '#1C1C2E',
  glass:   'rgba(255,255,255,0.055)',
  border:  'rgba(255,255,255,0.09)',
  accent:  '#7C6AF5',
  rose:    '#E8507A',
  teal:    '#3ECFB2',
  amber:   '#F0A04B',
  text1:   '#F0F0FA',
  text2:   '#A0A0C0',
  text3:   '#606080',
};

// Light theme — premium warm off-white, white cards (elevated via shadow), deepened accents.
export const lightColors: Palette = {
  isDark: false,
  bg:      '#F5F5FA',
  surf:    '#FFFFFF',
  surf2:   '#ECECF4',
  glass:   'rgba(0,0,0,0.035)',
  border:  'rgba(0,0,0,0.08)',
  accent:  '#6C5CE7',
  rose:    '#E5447A',
  teal:    '#17B89A',
  amber:   '#E08A2B',
  text1:   '#1A1A2E',
  text2:   '#55556E',
  text3:   '#9090A8',
};

export const palettes: Record<ThemeName, Palette> = { light: lightColors, dark: darkColors };

// Light mode separates cards with a soft shadow (dark mode uses borders instead).
// Spread `colors.isDark ? null : lightCardShadow` onto a card's container style.
export const lightCardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

// Legacy default export (dark) for any code path not yet theme-aware.
export const Colors = darkColors;

// Category accents / tints — shared across themes (vivid colors read on both).
export const CatColors: Record<string, string> = {
  travel:      '#3ECFB2',
  celebration: '#7C6AF5',
  work:        '#F0A04B',
  personal:    '#E8507A',
  goal:        '#3ECFB2',
};

export const CatBg: Record<string, string> = {
  travel:      'rgba(62,207,178,0.11)',
  celebration: 'rgba(124,106,245,0.11)',
  work:        'rgba(240,160,75,0.11)',
  personal:    'rgba(232,80,122,0.11)',
};
