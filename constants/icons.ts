// Shared icon/emoji catalog for EVERY picker in the app (events, memories,
// goals, life logs, custom). Organized into labeled domain groups so the same
// broad, consistent set surfaces wherever a user chooses an icon. The chosen
// value is still stored as a single emoji string — this only widens the choices.
// Auto-assigned defaults (preset emojis, per-type defaults) are unaffected.

export interface IconGroup {
  label: string;
  icons: string[];
}

export const ICON_GROUPS: IconGroup[] = [
  { label: 'Travel & Places',
    icons: ['✈️','🌍','🗺️','🧳','🏖️','🏔️','🏕️','🗽','🎡','🏛️','🚗','🚆','⛺','🏝️','🧭','🚢'] },
  { label: 'Sports & Fitness',
    icons: ['🏃','⚽','🏀','⚾','🏈','🎾','⛳','🏊','🚴','🏋️','⛷️','🏂','🥾','🧗','🥊','🏆','🏅','🎽'] },
  { label: 'Entertainment & Culture',
    icons: ['🎬','🎭','🎵','🎸','🎤','🎧','🎫','🎪','🎨','📷','🎮','🎲','♟️','🎯'] },
  { label: 'Food & Drink',
    icons: ['🍽️','🍕','🍔','🌮','🍣','🍜','☕','🍷','🍺','🥂','🍹','🧁','🍩','🍦'] },
  { label: 'Family & Life',
    icons: ['🎂','🎉','🎈','🎁','💑','👶','🐶','🐱','🏠','🏡','💍','🕊️','❤️','👨‍👩‍👧‍👦'] },
  { label: 'Learning & Career',
    icons: ['📚','📖','🎓','💼','📝','💡','🧠','🔬','⚗️','👨‍💻','📈','🏆','🎖️','📜'] },
  { label: 'Collecting & Hobbies',
    icons: ['🃏','🎴','🪙','💎','🧱','🎎','🧸','📀','💿','🖼️','🔖','🌿','🪴'] },
  { label: 'Money & Home',
    icons: ['💰','💵','🏦','📊','🏠','🚙','🔑','🛠️','🧾','📅'] },
  { label: 'Health & Wellness',
    icons: ['🏥','💊','🩺','🧘','🛌','🥗','💧','🩹','❤️‍🩹'] },
  { label: 'Nature & Seasons',
    icons: ['🌸','🍂','❄️','☀️','🌊','⛰️','🌲','🌵','🔥','⭐','🌙'] },
  { label: 'Symbols & Misc',
    icons: ['✅','⭐','🔥','⚡','🎯','📍','🔔','🏁','🥇','🆕','♻️'] },
];

// Flat list (in group order) + total, for anywhere a plain array is convenient.
export const ALL_ICONS: string[] = ICON_GROUPS.flatMap(g => g.icons);
export const ICON_COUNT = ALL_ICONS.length;
