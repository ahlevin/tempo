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
  // text2 = secondary CONTENT (dates, subtitles, notes). Darkened to ~7:1 on the
  // near-white bg so real content is legible (was #7C8B8B ≈ 3:1, too faint).
  text2:   '#4C5A67',
  // text3 = tiny decorative uppercase micro-labels ONLY ("DAYS", stat captions).
  // Nudged a touch darker than the old #ACBEBE for legibility; never for content.
  text3:   '#8595A0',
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

// Accent color per category / kind, with distinct dark- and light-theme (Yacht
// Club) values. Dark = vivid on near-black; light = deeper/saturated so it holds
// contrast on white. Covers the 7 event categories plus goals and the recurring
// memory types (used for hero accents and the home filter pills).
export interface CatColorPair { dark: string; light: string; }
export const CatColorMap: Record<string, CatColorPair> = {
  // Event categories
  money:    { dark: '#34D399', light: '#059669' }, // green / emerald
  travel:   { dark: '#3ECFB2', light: '#0D9488' }, // teal
  work:     { dark: '#5B8DEF', light: '#2563EB' }, // blue (Work / School)
  medical:  { dark: '#FB6F84', light: '#C5001A' }, // red / crimson
  house:    { dark: '#F0A04B', light: '#B45309' }, // amber (House / Vehicle)
  holidays: { dark: '#2E8B57', light: '#1B5E20' }, // pine / forest green
  parties:  { dark: '#7C6AF5', light: '#5B4BD1' }, // violet
  // Goals + recurring memory types
  goal:        { dark: '#3ECFB2', light: '#002C54' },
  birthday:    { dark: '#E8507A', light: '#002C54' },
  anniversary: { dark: '#7C6AF5', light: '#002C54' },
  memorial:    { dark: '#8FA3B8', light: '#5B6B7A' }, // muted slate / gray-blue
};

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// Theme-aware accent for a category/kind id. Falls back to the theme accent.
export function catColor(colors: Palette, id: string): string {
  const c = CatColorMap[id];
  if (!c) return colors.accent;
  return colors.isDark ? c.dark : c.light;
}

// Theme-aware soft background (emoji circle / chip) for a category id. Light
// theme uses the neutral Yacht Club tint; dark uses a translucent accent wash.
export function catBg(colors: Palette, id: string): string {
  if (!colors.isDark) return colors.tint;
  const c = CatColorMap[id];
  return hexToRgba(c ? c.dark : '#7C6AF5', 0.12);
}

// Tinted background for the hero days-tile. Light: the neutral Yacht Club tint;
// dark: the (already theme-resolved) accent hex at ~14% opacity.
export function heroTintBg(colors: Palette, accentHex: string): string {
  if (!colors.isDark) return colors.tint;
  return /^#[0-9a-fA-F]{6}$/.test(accentHex) ? hexToRgba(accentHex, 0.14) : hexToRgba('#7C6AF5', 0.14);
}
