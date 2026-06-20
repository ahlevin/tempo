import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Event, Goal, Memory, UserPrefs } from './types';
import { format, addDays } from 'date-fns';

const fd = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd');
const today = () => format(new Date(), 'yyyy-MM-dd');

const SEED_EVENTS: Event[] = [
  { id:'1', name:'Hawaii Trip',         emoji:'🏖️', cat:'travel',      date:fd(34),  created:fd(-14), fav:true,  recur:null,                                          alerts:[{value:1,unit:'months'},{value:1,unit:'weeks'},{value:1,unit:'days'}] },
  { id:'2', name:"Mom's Birthday",      emoji:'🎂', cat:'celebration', date:fd(8),   created:fd(-5),  fav:true,  recur:{freq:'yearly',dow:[],endType:'never'},         alerts:[{value:1,unit:'weeks'},{value:1,unit:'days'}] },
  { id:'3', name:'Product Launch',      emoji:'🚀', cat:'work',        date:fd(61),  created:fd(-30), fav:false, recur:null,                                          alerts:[{value:2,unit:'weeks'}] },
  { id:'4', name:'Wedding Anniversary', emoji:'💍', cat:'personal',    date:fd(120), created:fd(-10), fav:true,  recur:{freq:'yearly',dow:[],endType:'never'},         alerts:[{value:1,unit:'months'},{value:1,unit:'weeks'}] },
  { id:'5', name:'Skiing Weekend',      emoji:'⛷️', cat:'travel',      date:fd(19),  created:fd(-2),  fav:false, recur:null,                                          alerts:[] },
  { id:'6', name:'Team Standup',        emoji:'💼', cat:'work',        date:fd(1),   created:fd(-60), fav:false, recur:{freq:'weekly',dow:[1,2,3,4,5],endType:'never'},alerts:[{value:30,unit:'minutes'}] },
  { id:'7', name:'Date Night',          emoji:'❤️', cat:'personal',    date:fd(5),   created:fd(-30), fav:true,  recur:{freq:'weekly',dow:[5],endType:'never'},        alerts:[{value:2,unit:'hours'},{value:1,unit:'days'}] },
];

const SEED_GOALS: Goal[] = [
  { id:'101', name:'Run 100 Miles',  emoji:'🏃', target:100,  current:34,   unit:'miles', step:1,  date:fd(90),  created:fd(-20), fav:true  },
  { id:'102', name:'Read 24 Books',  emoji:'📚', target:24,   current:7,    unit:'books', step:1,  date:fd(200), created:fd(-10), fav:false },
  { id:'103', name:'Save $5,000',    emoji:'💰', target:5000, current:1850, unit:'$',     step:50, date:fd(150), created:fd(-40), fav:true  },
];

const SEED_MEMORIES: Memory[] = [
  { id:'201', type:'birthday',    emoji:'🎂', name:"Alan's Birthday",     originDate:'1985-06-15', entries:[], note:'' },
  { id:'202', type:'anniversary', emoji:'💍', name:'Wedding Anniversary',  originDate:'2018-09-22', entries:[], note:'Our special day' },
  { id:'203', type:'lifelog',     emoji:'🏔️', name:'Half Dome Hike',       originDate:'2019-07-04', entries:[
    {date:'2019-07-04',note:'First time — solo, brutal but incredible'},
    {date:'2021-08-12',note:'With college friends'},
    {date:'2023-06-30',note:'Early start 4am, perfect conditions'},
  ], note:'' },
  { id:'204', type:'milestone',   emoji:'🎓', name:'College Graduation',   originDate:'2007-05-18', entries:[], note:'UC Berkeley, Computer Science' },
  { id:'205', type:'lifelog',     emoji:'🏃', name:'Marathon Completed',   originDate:'2020-03-01', entries:[
    {date:'2020-03-01',note:'First marathon — SF, 4:12'},
    {date:'2022-10-16',note:'Chicago Marathon, 3:58 — PR!'},
  ], note:'' },
];

interface TempoStore {
  events: Event[];
  goals: Goal[];
  memories: Memory[];
  prefs: UserPrefs;
  seeded: boolean;
  seed: () => void;
  addEvent: (e: Omit<Event,'id'|'created'>) => void;
  updateEvent: (id: string, patch: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  toggleEventFav: (id: string) => void;
  addGoal: (g: Omit<Goal,'id'|'created'|'current'>) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  nudgeGoal: (id: string, dir: 1|-1) => void;
  setGoalProgress: (id: string, value: number) => void;
  toggleGoalFav: (id: string) => void;
  addMemory: (m: Omit<Memory,'id'>) => void;
  updateMemory: (id: string, patch: Partial<Memory>) => void;
  deleteMemory: (id: string) => void;
  addLogEntry: (memId: string, entry: {date:string;note:string}) => void;
  updatePrefs: (patch: Partial<UserPrefs>) => void;
}

export const useStore = create<TempoStore>()(
  persist(
    (set, get) => ({
      events: [], goals: [], memories: [],
      prefs: { quotePref:'motivational', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, location:'' },
      seeded: false,
      seed: () => { if(get().seeded) return; set({events:SEED_EVENTS,goals:SEED_GOALS,memories:SEED_MEMORIES,seeded:true}); },
      addEvent: (e) => set(s => ({events:[...s.events,{...e,id:Date.now().toString(),created:today()}]})),
      updateEvent: (id,patch) => set(s => ({events:s.events.map(e => e.id===id?{...e,...patch}:e)})),
      deleteEvent: (id) => set(s => ({events:s.events.filter(e => e.id!==id)})),
      toggleEventFav: (id) => set(s => ({events:s.events.map(e => e.id===id?{...e,fav:!e.fav}:e)})),
      addGoal: (g) => set(s => ({goals:[...s.goals,{...g,id:Date.now().toString(),created:today(),current:0}]})),
      updateGoal: (id,patch) => set(s => ({goals:s.goals.map(g => g.id===id?{...g,...patch}:g)})),
      deleteGoal: (id) => set(s => ({goals:s.goals.filter(g => g.id!==id)})),
      nudgeGoal: (id,dir) => set(s => ({goals:s.goals.map(g => g.id!==id?g:{...g,current:Math.max(0,Math.min(g.target,g.current+dir*(g.step||1)))})})),
      setGoalProgress: (id,value) => set(s => ({goals:s.goals.map(g => g.id===id?{...g,current:Math.min(g.target,Math.max(0,value))}:g)})),
      toggleGoalFav: (id) => set(s => ({goals:s.goals.map(g => g.id===id?{...g,fav:!g.fav}:g)})),
      addMemory: (m) => set(s => ({memories:[...s.memories,{...m,id:Date.now().toString()}]})),
      updateMemory: (id,patch) => set(s => ({memories:s.memories.map(m => m.id===id?{...m,...patch}:m)})),
      deleteMemory: (id) => set(s => ({memories:s.memories.filter(m => m.id!==id)})),
      addLogEntry: (memId,entry) => set(s => ({memories:s.memories.map(m => m.id===memId?{...m,entries:[...m.entries,entry]}:m)})),
      updatePrefs: (patch) => set(s => ({prefs:{...s.prefs,...patch}})),
    }),
    { name:'tempo-storage', storage:createJSONStorage(()=>AsyncStorage) }
  )
);
