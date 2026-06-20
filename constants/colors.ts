export const Colors = {
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
} as const;

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
