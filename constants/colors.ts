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
  // Elevation/overlay tokens (replace one-off white-alpha overlays so they stay
  // visible on light surfaces): tint = chip/circle bg, track = progress track,
  // tile = inner stat tile.
  tint: string;
  track: string;
  tile: string;
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
  tint:    'rgba(255,255,255,0.08)',
  track:   'rgba(255,255,255,0.07)',
  tile:    'rgba(255,255,255,0.05)',
};

// Light theme — "Yacht Club": navy + crimson on cool off-white.
//  - accent (navy) is the primary; teal & amber are remapped to navy (see palette
//    rule 9) so goal rings / badges read consistently on white.
//  - rose is repurposed as the crimson danger/urgency color (#C5001A).
export const lightColors: Palette = {
  isDark: false,
  bg:      '#EDF1F4',
  surf:    '#FFFFFF',
  surf2:   '#E3EAF1',
  glass:   'rgba(0,44,84,0.05)',
  border:  '#DFE4E8',
  accent:  '#002C54', // navy
  rose:    '#C5001A', // crimson (danger / urgency)
  teal:    '#002C54', // remapped -> navy
  amber:   '#002C54', // remapped -> navy
  text1:   '#0E2237',
  text2:   '#7C8B8B',
  text3:   '#ACBEBE',
  tint:    '#E3EAF1',
  track:   '#DFE4E8',
  tile:    '#E3EAF1',
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

// Theme-aware color for a "N days away" count.
//  - Dark: original urgency ramp (rose <=7, amber <=30, teal beyond).
//  - Light (Yacht Club): crimson within 30 days, navy beyond.
export function dayCountColor(colors: Palette, days: number): string {
  if (colors.isDark) {
    if (days <= 7)  return '#E8507A';
    if (days <= 30) return '#F0A04B';
    return '#3ECFB2';
  }
  return days <= 30 ? colors.rose : colors.accent;
}

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
