// A universe definition from the `universes` table — the REMOTE OVERLAY over the
// bundled constants. Read-only in the app (writes are a later stage).
export interface UniverseRow {
  id: string;
  name: string;
  emoji: string;
  grp: string;
  items: string[];
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
        items: r.items.filter((x: unknown) => typeof x === 'string') as string[],
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
