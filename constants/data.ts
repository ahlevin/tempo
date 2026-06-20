export const EMOJIS = ['✈️','🎉','💼','❤️','🎂','🏖️','🎓','🏠','🎵','🏋️','🌍','⛷️','🎪','🚀','🎯','💍','🌸','🦋','🏆','🎭','🌊','🍾'];
export const GOAL_EMOJIS = ['🎯','🏃','💪','📚','💰','🏋️','🚴','✍️','🧘','🥗','🌱','🏊','🎸','🧠','📝','🏆','⚡','🔥','🦋','🌟','💡','🎵'];
export const MEM_EMOJIS  = ['🎂','💑','🏔️','⭐','🌍','🏃','🎓','💍','🏠','✈️','🎵','🎉','🐶','👶','🏆','🌺','🚀','🎯','🌊','🎸','🦋','💡'];

export const CATEGORIES = [
  { id:'travel',      label:'✈️ Travel' },
  { id:'celebration', label:'🎉 Celebration' },
  { id:'work',        label:'💼 Work' },
  { id:'personal',    label:'❤️ Personal' },
];

export const MEMORY_TYPES = [
  { id:'birthday',    icon:'🎂', label:'Birthday',    desc:'Person or pet' },
  { id:'anniversary', icon:'💑', label:'Anniversary', desc:'Any milestone date' },
  { id:'lifelog',     icon:'🏔️', label:'Life Log',    desc:'Track every time' },
  { id:'milestone',   icon:'⭐', label:'Milestone',   desc:'One-time achievement' },
];

export const ALERT_UNITS = [
  { value:'minutes', label:'minutes before' },
  { value:'hours',   label:'hours before' },
  { value:'days',    label:'days before' },
  { value:'weeks',   label:'weeks before' },
  { value:'months',  label:'months before' },
];

export const QUOTES = {
  bible: [
    { text:"For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", attr:"Jeremiah 29:11" },
    { text:"I can do all things through Christ who strengthens me.", attr:"Philippians 4:13" },
    { text:"The Lord is my shepherd; I shall not want.", attr:"Psalm 23:1" },
    { text:"Trust in the Lord with all your heart and lean not on your own understanding.", attr:"Proverbs 3:5" },
    { text:"Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", attr:"Joshua 1:9" },
    { text:"Come to me, all you who are weary and burdened, and I will give you rest.", attr:"Matthew 11:28" },
    { text:"And we know that in all things God works for the good of those who love him.", attr:"Romans 8:28" },
    { text:"But those who hope in the Lord will renew their strength. They will soar on wings like eagles.", attr:"Isaiah 40:31" },
  ],
  motivational: [
    { text:"The only way to do great work is to love what you do.", attr:"Steve Jobs" },
    { text:"It does not matter how slowly you go as long as you do not stop.", attr:"Confucius" },
    { text:"Success is not final, failure is not fatal: it is the courage to continue that counts.", attr:"Winston Churchill" },
    { text:"Believe you can and you're halfway there.", attr:"Theodore Roosevelt" },
    { text:"The future belongs to those who believe in the beauty of their dreams.", attr:"Eleanor Roosevelt" },
    { text:"It always seems impossible until it's done.", attr:"Nelson Mandela" },
    { text:"The secret of getting ahead is getting started.", attr:"Mark Twain" },
    { text:"You are never too old to set another goal or to dream a new dream.", attr:"C.S. Lewis" },
  ],
  jokes: [
    { text:"Why don't scientists trust atoms? Because they make up everything.", attr:"Classic" },
    { text:"I told my wife she was drawing her eyebrows too high. She looked surprised.", attr:"Dad Joke" },
    { text:"Why did the scarecrow win an award? Because he was outstanding in his field.", attr:"Classic" },
    { text:"I'm reading a book about anti-gravity. It's impossible to put down.", attr:"Book Nerd" },
    { text:"I used to hate facial hair, but then it grew on me.", attr:"Classic Pun" },
    { text:"What do you call a fake noodle? An impasta.", attr:"Food Pun" },
    { text:"Why did the bicycle fall over? It was two-tired.", attr:"Classic" },
    { text:"I'm on a seafood diet. I see food and I eat it.", attr:"Dad Joke" },
  ],
};

export const TIMEZONES = [
  { label:'(UTC-10:00) Hawaii',         value:'Pacific/Honolulu' },
  { label:'(UTC-09:00) Alaska',         value:'America/Anchorage' },
  { label:'(UTC-08:00) Pacific Time',   value:'America/Los_Angeles' },
  { label:'(UTC-07:00) Mountain Time',  value:'America/Denver' },
  { label:'(UTC-06:00) Central Time',   value:'America/Chicago' },
  { label:'(UTC-05:00) Eastern Time',   value:'America/New_York' },
  { label:'(UTC+00:00) London / UTC',   value:'Europe/London' },
  { label:'(UTC+01:00) Central Europe', value:'Europe/Paris' },
  { label:'(UTC+08:00) Singapore',      value:'Asia/Singapore' },
  { label:'(UTC+09:00) Tokyo',          value:'Asia/Tokyo' },
  { label:'(UTC+10:00) Sydney',         value:'Australia/Sydney' },
];
