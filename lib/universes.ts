// A universe ITEM is EITHER a plain string (as always) OR a structured object
// with an optional address/city/state. Backward compatible: existing string
// universes are unchanged, and ALL name-based logic (matching, coverage, logged
// entries) keys off itemName() — a logged entry still stores just the name.
export interface UniverseItemObj { name: string; address?: string; city?: string; state?: string; }
export type UniverseItem = string | UniverseItemObj;
export interface ItemLocation { address?: string; city?: string; state?: string; }

// The canonical NAME of an item (the only thing entries store / coverage counts).
export function itemName(it: UniverseItem): string {
  return typeof it === 'string' ? it : it.name;
}
// The structured location, or undefined for a plain string / a name-only object.
export function itemLocation(it: UniverseItem): ItemLocation | undefined {
  if (typeof it === 'string') return undefined;
  const address = it.address?.trim() || undefined;
  const city = it.city?.trim() || undefined;
  const state = it.state?.trim() || undefined;
  return (address || city || state) ? { address, city, state } : undefined;
}
export function itemCityState(it: UniverseItem): string {
  const l = itemLocation(it);
  return l ? [l.city, l.state].filter(Boolean).join(', ') : '';
}
// The stored `address` is ALREADY the full "street, city, ST zip" string, so
// return it as-is when present; only fall back to joining city/state when there's
// no address (mirrors utils/lifelog entryFullAddress — avoids "…, Lynn, MA, Lynn, MA").
export function itemFullAddress(it: UniverseItem): string {
  const l = itemLocation(it);
  if (!l) return '';
  return l.address?.trim() || [l.city, l.state].filter(Boolean).join(', ');
}
// The Google-Maps query: the full address when present, else the name.
export function itemMapQuery(it: UniverseItem): string {
  return itemFullAddress(it) || itemName(it);
}
// The location for a universe item matching `name` (name-only match), or
// undefined. Used to SNAPSHOT an item's current location onto a new entry at
// log time — the entry then keeps that snapshot forever (never re-looked-up).
export function locationForName(universe: UniverseItem[] | undefined, name: string): ItemLocation | undefined {
  if (!universe) return undefined;
  const hit = universe.find(u => itemName(u).toLowerCase() === name.toLowerCase());
  return hit ? itemLocation(hit) : undefined;
}

// Normalize a raw jsonb item (string or {name,...}) → a clean UniverseItem, or
// null when malformed. Collapses a location-less object back to a plain string.
export function normalizeItem(x: unknown): UniverseItem | null {
  if (typeof x === 'string') return x;
  if (x && typeof x === 'object' && typeof (x as any).name === 'string') {
    const o = x as any;
    const address = typeof o.address === 'string' && o.address.trim() ? o.address.trim() : undefined;
    const city = typeof o.city === 'string' && o.city.trim() ? o.city.trim() : undefined;
    const state = typeof o.state === 'string' && o.state.trim() ? o.state.trim() : undefined;
    return (address || city || state) ? { name: o.name, address, city, state } : o.name;
  }
  return null;
}

// A universe definition from the `universes` table — the REMOTE OVERLAY over the
// bundled constants. Items may be plain strings or structured (with location).
export interface UniverseRow {
  id: string;
  name: string;
  emoji: string;
  grp: string;
  items: UniverseItem[];
}

// Module-level overlay keyed by id. Empty until loaded from cloud or rehydrated
// from AsyncStorage. Kept OUTSIDE the store (a leaf module) so resolution in
// constants/lifelogs.ts can read it without importing the store (no cycles).
// Resolution reads this FIRST and falls back to the bundled constants per-id.
let overlay: Record<string, UniverseRow> = {};

// Validate + index rows. Malformed rows (missing id/name/items) are dropped so
// resolution falls back to bundled for that id. Never throws; ignores non-arrays.
export function setUniverseOverlay(rows: unknown): void {
  const next: Record<string, UniverseRow> = {};
  const list = Array.isArray(rows) ? rows : [];
  for (const r of list as any[]) {
    if (r && typeof r.id === 'string' && typeof r.name === 'string' && Array.isArray(r.items)) {
      next[r.id] = {
        id: r.id,
        name: r.name,
        emoji: typeof r.emoji === 'string' ? r.emoji : '',
        grp: typeof r.grp === 'string' ? r.grp : '',
        items: (r.items as unknown[]).map(normalizeItem).filter((x): x is UniverseItem => x != null),
      };
    }
  }
  overlay = next;
}

export function remoteUniverse(id: string): UniverseRow | undefined {
  return overlay[id];
}

export function universeOverlaySize(): number {
  return Object.keys(overlay).length;
}

// One SELECT of all universe rows (~160KB, a single query). Returns [] on ANY
// error/offline (never throws) so callers silently fall back to bundled consts.
// supabase is imported lazily so the resolution path (setUniverseOverlay /
// remoteUniverse, used by constants/lifelogs.ts) carries no supabase/RN dep.
export async function fetchUniverses(): Promise<UniverseRow[]> {
  try {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase.from('universes').select('id, name, emoji, grp, items');
    if (error || !Array.isArray(data)) return [];
    return data as UniverseRow[];
  } catch {
    return [];
  }
}

// ---- Superuser writes (RLS enforces is_superuser server-side) --------------
// All return { ok, error } and never throw; a failure leaves the table (and the
// app's overlay) unchanged so the caller can toast the error and refresh.

type WriteResult = { ok: boolean; error?: string };

const toRowPayload = (rows: UniverseRow[]) =>
  rows.map(r => ({ id: r.id, name: r.name, emoji: r.emoji, grp: r.grp, items: r.items, updated_at: new Date().toISOString() }));

export async function upsertUniverses(rows: UniverseRow[]): Promise<WriteResult> {
  try {
    const { supabase } = await import('./supabase');
    const { error } = await supabase.from('universes').upsert(toRowPayload(rows));
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Network error' };
  }
}

export function upsertUniverse(row: UniverseRow): Promise<WriteResult> {
  return upsertUniverses([row]);
}

export async function deleteUniverse(id: string): Promise<WriteResult> {
  try {
    const { supabase } = await import('./supabase');
    const { error } = await supabase.from('universes').delete().eq('id', id);
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Network error' };
  }
}
