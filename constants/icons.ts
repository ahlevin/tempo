// Shared icon/emoji catalog for EVERY picker in the app (events, memories,
// goals, life logs, custom). Organized into labeled domain groups so the same
// broad, consistent set surfaces wherever a user chooses an icon. The chosen
// value is still stored as a single emoji string — this only widens the choices.
// Auto-assigned defaults (preset emojis, per-type defaults) are unaffected.
//
// Each icon carries generous KEYWORDS so the picker's search matches by meaning
// ("cake" → 🎂, "mountain" → 🏔️), not just group names.

export interface IconEntry {
  emoji: string;
  keywords: string[];
}

export interface IconGroup {
  label: string;
  icons: IconEntry[];
}

export const ICON_GROUPS: IconGroup[] = [
  { label: 'Travel & Places', icons: [
    { emoji: '✈️', keywords: ['plane','flight','travel','trip','airport','fly','vacation'] },
    { emoji: '🌍', keywords: ['world','globe','earth','travel','international','map'] },
    { emoji: '🗺️', keywords: ['map','travel','directions','explore','navigation'] },
    { emoji: '🧳', keywords: ['luggage','suitcase','travel','packing','trip','bag'] },
    { emoji: '🏖️', keywords: ['beach','vacation','sea','sand','summer','ocean','resort'] },
    { emoji: '🏔️', keywords: ['mountain','peak','hike','summit','nature','outdoors','snow'] },
    { emoji: '🏕️', keywords: ['camping','tent','camp','outdoors','nature','campsite'] },
    { emoji: '🗽', keywords: ['statue of liberty','new york','city','landmark','travel','usa'] },
    { emoji: '🎡', keywords: ['ferris wheel','fair','amusement','carnival','park','ride'] },
    { emoji: '🏛️', keywords: ['museum','building','landmark','history','government','classic'] },
    { emoji: '🚗', keywords: ['car','drive','road','vehicle','travel','auto'] },
    { emoji: '🚆', keywords: ['train','rail','commute','travel','transit','railway'] },
    { emoji: '⛺', keywords: ['tent','camping','camp','outdoors','campsite'] },
    { emoji: '🏝️', keywords: ['island','tropical','beach','vacation','paradise','travel'] },
    { emoji: '🧭', keywords: ['compass','navigation','direction','explore','adventure'] },
    { emoji: '🚢', keywords: ['ship','cruise','boat','sea','travel','ocean'] },
  ] },
  { label: 'Sports & Fitness', icons: [
    { emoji: '🏃', keywords: ['run','running','jog','marathon','exercise','race','fitness'] },
    { emoji: '⚽', keywords: ['soccer','football','sport','ball','game'] },
    { emoji: '🏀', keywords: ['basketball','sport','ball','game','hoops'] },
    { emoji: '⚾', keywords: ['baseball','sport','ballpark','game','mlb'] },
    { emoji: '🏈', keywords: ['football','nfl','sport','game'] },
    { emoji: '🎾', keywords: ['tennis','sport','racket','game','match'] },
    { emoji: '⛳', keywords: ['golf','sport','course','game','hole'] },
    { emoji: '🏊', keywords: ['swim','swimming','pool','sport','exercise','water'] },
    { emoji: '🚴', keywords: ['cycling','bike','biking','sport','exercise','ride'] },
    { emoji: '🏋️', keywords: ['gym','weightlifting','workout','fitness','exercise','strength','lift'] },
    { emoji: '⛷️', keywords: ['ski','skiing','snow','winter','sport','slope'] },
    { emoji: '🏂', keywords: ['snowboard','snowboarding','snow','winter','sport'] },
    { emoji: '🥾', keywords: ['hiking','hike','boots','trail','outdoors','walk'] },
    { emoji: '🧗', keywords: ['climbing','rock climbing','sport','boulder','outdoors'] },
    { emoji: '🥊', keywords: ['boxing','fight','sport','gloves','martial arts'] },
    { emoji: '🏆', keywords: ['trophy','win','award','champion','prize','achievement'] },
    { emoji: '🏅', keywords: ['medal','award','win','achievement','prize'] },
    { emoji: '🎽', keywords: ['running shirt','race','marathon','athletics','jersey','sport'] },
  ] },
  { label: 'Entertainment & Culture', icons: [
    { emoji: '🎬', keywords: ['movie','film','cinema','clapperboard','video'] },
    { emoji: '🎭', keywords: ['theater','drama','play','arts','performance','masks'] },
    { emoji: '🎵', keywords: ['music','song','note','melody','audio','tune'] },
    { emoji: '🎸', keywords: ['guitar','music','rock','band','instrument'] },
    { emoji: '🎤', keywords: ['microphone','sing','karaoke','music','concert','vocal'] },
    { emoji: '🎧', keywords: ['headphones','music','audio','listen','podcast'] },
    { emoji: '🎫', keywords: ['ticket','event','admission','concert','show'] },
    { emoji: '🎪', keywords: ['circus','tent','carnival','fair','show'] },
    { emoji: '🎨', keywords: ['art','paint','palette','creative','drawing','hobby'] },
    { emoji: '📷', keywords: ['camera','photo','photography','picture','snapshot'] },
    { emoji: '🎮', keywords: ['game','gaming','video game','controller','play'] },
    { emoji: '🎲', keywords: ['dice','game','board game','gamble','roll','chance'] },
    { emoji: '♟️', keywords: ['chess','game','strategy','board game','pawn'] },
    { emoji: '🎯', keywords: ['target','dart','goal','aim','bullseye','focus'] },
  ] },
  { label: 'Food & Drink', icons: [
    { emoji: '🍽️', keywords: ['food','dining','restaurant','meal','plate','dinner','eat'] },
    { emoji: '🍕', keywords: ['pizza','food','restaurant','dinner','italian'] },
    { emoji: '🍔', keywords: ['burger','hamburger','food','fastfood','lunch'] },
    { emoji: '🌮', keywords: ['taco','food','mexican','dinner'] },
    { emoji: '🍣', keywords: ['sushi','food','japanese','dinner','seafood'] },
    { emoji: '🍜', keywords: ['ramen','noodles','food','soup','asian','dinner'] },
    { emoji: '☕', keywords: ['coffee','cafe','drink','tea','morning','espresso'] },
    { emoji: '🍷', keywords: ['wine','drink','alcohol','dinner','glass'] },
    { emoji: '🍺', keywords: ['beer','drink','alcohol','pub','bar'] },
    { emoji: '🥂', keywords: ['champagne','celebration','drink','toast','party','cheers'] },
    { emoji: '🍹', keywords: ['cocktail','drink','tropical','bar','alcohol','party'] },
    { emoji: '🧁', keywords: ['cupcake','dessert','sweet','baking','treat'] },
    { emoji: '🍩', keywords: ['donut','doughnut','dessert','sweet','breakfast'] },
    { emoji: '🍦', keywords: ['ice cream','dessert','sweet','summer','treat'] },
  ] },
  { label: 'Family & Life', icons: [
    { emoji: '🎂', keywords: ['cake','birthday','celebration','party','dessert'] },
    { emoji: '🎉', keywords: ['party','celebration','confetti','birthday','festive'] },
    { emoji: '🎈', keywords: ['balloon','party','celebration','birthday'] },
    { emoji: '🎁', keywords: ['gift','present','birthday','celebration','holiday'] },
    { emoji: '💑', keywords: ['couple','love','relationship','anniversary','romance','date'] },
    { emoji: '👶', keywords: ['baby','newborn','child','infant','birth'] },
    { emoji: '🐶', keywords: ['dog','pet','puppy','animal'] },
    { emoji: '🐱', keywords: ['cat','pet','kitten','animal'] },
    { emoji: '🏠', keywords: ['house','home','family','property'] },
    { emoji: '🏡', keywords: ['home','house','family','garden','property'] },
    { emoji: '💍', keywords: ['ring','wedding','engagement','marriage','anniversary'] },
    { emoji: '🕊️', keywords: ['dove','memorial','peace','remembrance','bird'] },
    { emoji: '❤️', keywords: ['heart','love','like','favorite','romance'] },
    { emoji: '👨‍👩‍👧‍👦', keywords: ['family','parents','kids','children','household'] },
  ] },
  { label: 'Learning & Career', icons: [
    { emoji: '📚', keywords: ['books','study','reading','education','library','learning'] },
    { emoji: '📖', keywords: ['book','read','reading','study','learning','journal'] },
    { emoji: '🎓', keywords: ['graduation','school','education','college','degree','university'] },
    { emoji: '💼', keywords: ['work','job','business','briefcase','career','office'] },
    { emoji: '📝', keywords: ['note','notes','writing','memo','todo','list'] },
    { emoji: '💡', keywords: ['idea','light bulb','inspiration','creative','invention'] },
    { emoji: '🧠', keywords: ['brain','mind','think','learning','knowledge','memory'] },
    { emoji: '🔬', keywords: ['science','microscope','research','lab','biology','experiment'] },
    { emoji: '⚗️', keywords: ['chemistry','science','lab','experiment','flask'] },
    { emoji: '👨‍💻', keywords: ['coding','programmer','developer','tech','work','computer'] },
    { emoji: '📈', keywords: ['chart','growth','stats','progress','business','finance','trending'] },
    { emoji: '🏆', keywords: ['trophy','win','award','achievement','champion','goal'] },
    { emoji: '🎖️', keywords: ['medal','award','honor','military','achievement'] },
    { emoji: '📜', keywords: ['scroll','certificate','diploma','document','degree','history'] },
  ] },
  { label: 'Collecting & Hobbies', icons: [
    { emoji: '🃏', keywords: ['card','joker','playing cards','game','poker','collecting'] },
    { emoji: '🎴', keywords: ['cards','game','hanafuda','playing cards','collecting'] },
    { emoji: '🪙', keywords: ['coin','money','collecting','currency','gold','token'] },
    { emoji: '💎', keywords: ['gem','diamond','jewel','precious','collecting','treasure'] },
    { emoji: '🧱', keywords: ['brick','lego','building','blocks','construction','hobby'] },
    { emoji: '🎎', keywords: ['dolls','collectible','japanese','figures','hobby'] },
    { emoji: '🧸', keywords: ['teddy bear','toy','plush','stuffed animal','collectible'] },
    { emoji: '📀', keywords: ['dvd','disc','movie','media','collecting'] },
    { emoji: '💿', keywords: ['cd','disc','music','album','media','collecting'] },
    { emoji: '🖼️', keywords: ['picture','frame','art','painting','photo','gallery'] },
    { emoji: '🔖', keywords: ['bookmark','tag','save','collecting','label'] },
    { emoji: '🌿', keywords: ['herb','plant','leaf','nature','garden','green'] },
    { emoji: '🪴', keywords: ['plant','potted plant','garden','houseplant','hobby','gardening'] },
  ] },
  { label: 'Money & Home', icons: [
    { emoji: '💰', keywords: ['money','cash','savings','finance','wealth','budget'] },
    { emoji: '💵', keywords: ['dollar','cash','money','bills','finance'] },
    { emoji: '🏦', keywords: ['bank','finance','money','savings','building'] },
    { emoji: '📊', keywords: ['chart','stats','data','finance','analytics','report'] },
    { emoji: '🏠', keywords: ['house','home','property','mortgage'] },
    { emoji: '🚙', keywords: ['car','suv','vehicle','drive','auto'] },
    { emoji: '🔑', keywords: ['key','house','unlock','access','security','home'] },
    { emoji: '🛠️', keywords: ['tools','repair','fix','maintenance','diy','home'] },
    { emoji: '🧾', keywords: ['receipt','bill','invoice','expense','finance','tax'] },
    { emoji: '📅', keywords: ['calendar','date','schedule','event','planner'] },
  ] },
  { label: 'Health & Wellness', icons: [
    { emoji: '🏥', keywords: ['hospital','health','medical','doctor','clinic'] },
    { emoji: '💊', keywords: ['pill','medicine','medication','health','drug','pharmacy'] },
    { emoji: '🩺', keywords: ['stethoscope','doctor','health','medical','checkup'] },
    { emoji: '🧘', keywords: ['yoga','meditation','wellness','calm','mindfulness','zen'] },
    { emoji: '🛌', keywords: ['sleep','rest','bed','wellness','nap'] },
    { emoji: '🥗', keywords: ['salad','healthy','food','diet','nutrition','vegetables'] },
    { emoji: '💧', keywords: ['water','hydration','drink','drop','health'] },
    { emoji: '🩹', keywords: ['bandage','injury','first aid','health','heal'] },
    { emoji: '❤️‍🩹', keywords: ['healing','recovery','health','heart','wellness','mend'] },
  ] },
  { label: 'Nature & Seasons', icons: [
    { emoji: '🌸', keywords: ['blossom','flower','spring','cherry','nature','bloom'] },
    { emoji: '🍂', keywords: ['autumn','fall','leaves','season','nature'] },
    { emoji: '❄️', keywords: ['snow','snowflake','winter','cold','season'] },
    { emoji: '☀️', keywords: ['sun','sunny','summer','weather','warm','day'] },
    { emoji: '🌊', keywords: ['wave','ocean','sea','water','surf','beach'] },
    { emoji: '⛰️', keywords: ['mountain','peak','nature','outdoors','hike'] },
    { emoji: '🌲', keywords: ['tree','forest','nature','evergreen','pine','outdoors'] },
    { emoji: '🌵', keywords: ['cactus','desert','plant','nature','southwest'] },
    { emoji: '🔥', keywords: ['fire','flame','hot','burn','campfire'] },
    { emoji: '⭐', keywords: ['star','favorite','night','rating','sky'] },
    { emoji: '🌙', keywords: ['moon','night','crescent','sky','evening'] },
  ] },
  { label: 'Symbols & Misc', icons: [
    { emoji: '✅', keywords: ['check','done','complete','task','yes','success'] },
    { emoji: '⭐', keywords: ['star','favorite','rating','best'] },
    { emoji: '🔥', keywords: ['fire','hot','trending','popular'] },
    { emoji: '⚡', keywords: ['lightning','energy','fast','power','electric','bolt'] },
    { emoji: '🎯', keywords: ['target','goal','aim','focus','bullseye'] },
    { emoji: '📍', keywords: ['pin','location','place','map','marker'] },
    { emoji: '🔔', keywords: ['bell','notification','reminder','alert','ring'] },
    { emoji: '🏁', keywords: ['finish','flag','race','goal','start','checkered'] },
    { emoji: '🥇', keywords: ['gold medal','first','win','champion','award'] },
    { emoji: '🆕', keywords: ['new','badge','fresh','latest'] },
    { emoji: '♻️', keywords: ['recycle','reuse','eco','green','environment','sustainable'] },
  ] },
];

// Flat list (in group order) + total, for anywhere a plain array is convenient.
export const ALL_ICONS: string[] = ICON_GROUPS.flatMap(g => g.icons.map(i => i.emoji));
export const ICON_COUNT = ALL_ICONS.length;

// Case-insensitive substring search over keywords (and group name). Returns a
// de-duplicated, flat list of matching emojis in catalog order. An exact emoji
// query (e.g. pasting "🎂") also matches.
export function searchIcons(rawQuery: string): string[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const g of ICON_GROUPS) {
    const groupMatch = g.label.toLowerCase().includes(q);
    for (const ic of g.icons) {
      if (seen.has(ic.emoji)) continue;
      if (groupMatch || ic.emoji === rawQuery.trim() || ic.keywords.some(k => k.includes(q))) {
        seen.add(ic.emoji);
        out.push(ic.emoji);
      }
    }
  }
  return out;
}
