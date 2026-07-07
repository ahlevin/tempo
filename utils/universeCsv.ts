import type { UniverseRow } from '../lib/universes';

// ── CSV (RFC4180-ish) ────────────────────────────────────────────────────────
// Columns: universe_id, universe_name, emoji, grp, item — one row per item.

function escapeField(v: string): string {
  const s = v ?? '';
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function universesToCSV(rows: UniverseRow[]): string {
  const lines = ['universe_id,universe_name,emoji,grp,item'];
  const sorted = [...rows].sort((a, b) => (a.grp || '').localeCompare(b.grp || '') || a.name.localeCompare(b.name));
  for (const u of sorted) {
    const meta = [u.id, u.name, u.emoji, u.grp];
    if (u.items.length === 0) lines.push([...meta, ''].map(escapeField).join(','));
    else for (const item of u.items) lines.push([...meta, item].map(escapeField).join(','));
  }
  return lines.join('\n');
}

// Parse CSV text into a header + rows, honouring quotes/embedded commas/newlines.
export function parseCSV(text: string): { header: string[]; records: string[][] } {
  const t = text.replace(/\r\n?/g, '\n');
  const records: string[][] = [];
  let field = '', row: string[] = [], inQuotes = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"') { if (t[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); records.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); records.push(row); }
  const header = (records.shift() ?? []).map(h => h.trim());
  return { header, records: records.filter(r => r.some(f => f.trim() !== '')) };
}

// Build universes from CSV. Metadata (name/emoji/grp) taken from the first row of
// each id; items collected + de-duped in order. Requires the required columns.
export function csvToUniverses(text: string): { universes: UniverseRow[]; error?: string } {
  const { header, records } = parseCSV(text);
  const col = (n: string) => header.indexOf(n);
  const iId = col('universe_id'), iName = col('universe_name'), iEmoji = col('emoji'), iGrp = col('grp'), iItem = col('item');
  if (iId < 0 || iName < 0 || iItem < 0) {
    return { universes: [], error: 'Header must include: universe_id, universe_name, emoji, grp, item' };
  }
  const map = new Map<string, UniverseRow>();
  for (const r of records) {
    const id = (r[iId] ?? '').trim();
    if (!id) continue;
    if (!map.has(id)) {
      map.set(id, { id, name: (r[iName] ?? '').trim(), emoji: iEmoji >= 0 ? (r[iEmoji] ?? '').trim() : '', grp: iGrp >= 0 ? (r[iGrp] ?? '').trim() : '', items: [] });
    }
    const item = (r[iItem] ?? '').trim();
    if (item) map.get(id)!.items.push(item);
  }
  for (const u of map.values()) u.items = [...new Set(u.items)];
  return { universes: [...map.values()] };
}

// ── Similarity + rename detection ────────────────────────────────────────────

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

function dice(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const bigrams = (s: string) => { const m = new Map<string, number>(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
  const A = bigrams(a), B = bigrams(b);
  let inter = 0; for (const [g, c] of A) inter += Math.min(c, B.get(g) || 0);
  return (2 * inter) / ((a.length - 1) + (b.length - 1));
}

// 0..1 similarity: exact→1, containment→high (≥0.85), else bigram Dice.
export function similarity(a: string, b: string): number {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return Math.max(0.85, dice(na, nb));
  return dice(na, nb);
}

export interface RenamePair { from: string; to: string; score: number }

// Greedy best-match pairing of removed↔added at/above the threshold (default 0.8).
export function detectRenames(removed: string[], added: string[], threshold = 0.8):
  { renames: RenamePair[]; removed: string[]; added: string[] } {
  const pairs: { ri: number; ai: number; score: number }[] = [];
  removed.forEach((r, ri) => added.forEach((a, ai) => {
    const s = similarity(r, a);
    if (s >= threshold) pairs.push({ ri, ai, score: s });
  }));
  pairs.sort((x, y) => y.score - x.score);
  const usedR = new Set<number>(), usedA = new Set<number>();
  const renames: RenamePair[] = [];
  for (const p of pairs) {
    if (usedR.has(p.ri) || usedA.has(p.ai)) continue;
    usedR.add(p.ri); usedA.add(p.ai);
    renames.push({ from: removed[p.ri], to: added[p.ai], score: p.score });
  }
  return {
    renames,
    removed: removed.filter((_, i) => !usedR.has(i)),
    added: added.filter((_, i) => !usedA.has(i)),
  };
}

// ── Per-universe diff ────────────────────────────────────────────────────────

export interface UniverseDiff {
  id: string;
  incoming: UniverseRow;
  isNew: boolean;
  metaChanges: { field: 'name' | 'emoji' | 'grp'; from: string; to: string }[];
  added: string[];
  removed: string[];
  renames: RenamePair[];
}

export function diffUniverse(incoming: UniverseRow, current: UniverseRow | undefined): UniverseDiff {
  if (!current) {
    return { id: incoming.id, incoming, isNew: true, metaChanges: [], added: incoming.items, removed: [], renames: [] };
  }
  const metaChanges: UniverseDiff['metaChanges'] = [];
  if (incoming.name !== current.name) metaChanges.push({ field: 'name', from: current.name, to: incoming.name });
  if (incoming.emoji !== current.emoji) metaChanges.push({ field: 'emoji', from: current.emoji, to: incoming.emoji });
  if (incoming.grp !== current.grp) metaChanges.push({ field: 'grp', from: current.grp, to: incoming.grp });

  const curSet = new Set(current.items), incSet = new Set(incoming.items);
  const addedRaw = incoming.items.filter(i => !curSet.has(i));
  const removedRaw = current.items.filter(i => !incSet.has(i));
  const { renames, added, removed } = detectRenames(removedRaw, addedRaw);
  return { id: incoming.id, incoming, isNew: false, metaChanges, added, removed, renames };
}

// Slugify a name into a stable id, ensuring uniqueness against existing ids.
export function slugifyId(name: string, existing: Set<string>): string {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'list';
  if (!existing.has(base)) return base;
  let n = 2; while (existing.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}
