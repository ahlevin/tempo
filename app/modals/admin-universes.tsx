import { useMemo, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useStore } from '../../store/useStore';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';
import { CloseButton } from '../../components/CloseButton';
import { UniverseRow, upsertUniverse, upsertUniverses, deleteUniverse } from '../../lib/universes';
import { universesToCSV, csvToUniverses, diffUniverse, slugifyId, UniverseDiff } from '../../utils/universeCsv';

type Mode = 'list' | 'edit' | 'export' | 'import';

// Web-only file download; returns false on native.
function downloadCSV(filename: string, text: string): boolean {
  const g: any = globalThis as any;
  if (Platform.OS !== 'web' || !g.document) return false;
  try {
    const url = g.URL.createObjectURL(new g.Blob([text], { type: 'text/csv' }));
    const a = g.document.createElement('a');
    a.href = url; a.download = filename; a.click();
    g.URL.revokeObjectURL(url);
    return true;
  } catch { return false; }
}
async function copyText(text: string): Promise<boolean> {
  try {
    const nav: any = (globalThis as any).navigator;
    if (nav?.clipboard?.writeText) { await nav.clipboard.writeText(text); return true; }
  } catch { /* fall through */ }
  return false;
}
const renameKey = (id: string, from: string, to: string) => `${id}␟${from}␟${to}`;

export default function AdminUniversesModal() {
  const { colors } = useTheme();
  const isSuperuser = useStore(s => s.prefs.isSuperuser);
  const remoteUniverses = useStore(s => s.remoteUniverses);
  const loadUniverses = useStore(s => s.loadUniverses);
  const renameLogItems = useStore(s => s.renameLogItems);
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [mode, setMode] = useState<Mode>('list');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  // Edit/new working copy.
  const [editing, setEditing] = useState<UniverseRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  // Import.
  const [csvText, setCsvText] = useState('');
  const [diffs, setDiffs] = useState<UniverseDiff[] | null>(null);
  const [renameOn, setRenameOn] = useState<Record<string, boolean>>({});

  if (!isSuperuser) { router.back(); return null; }

  const fi = { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 10, color: colors.text1, fontSize: 14, marginBottom: 10 };

  const sorted = useMemo(() =>
    [...remoteUniverses].sort((a, b) => (a.grp || '').localeCompare(b.grp || '') || a.name.localeCompare(b.name)),
    [remoteUniverses]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(u => u.name.toLowerCase().includes(q) || (u.grp || '').toLowerCase().includes(q) || u.id.toLowerCase().includes(q));
  }, [sorted, search]);

  async function refresh() { setRefreshing(true); await loadUniverses(); setRefreshing(false); }

  function openEdit(u: UniverseRow) {
    setEditing({ ...u, items: [...u.items] }); setIsNew(false); setDeleteConfirmName(''); setMode('edit');
  }
  function openNew() {
    setEditing({ id: '', name: '', emoji: '📋', grp: '', items: [] }); setIsNew(true); setDeleteConfirmName(''); setMode('edit');
  }

  const existingIds = useMemo(() => new Set(remoteUniverses.map(u => u.id)), [remoteUniverses]);

  async function saveEditing() {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) { showToast('⚠️', 'Missing name', 'Give the list a name.'); return; }
    const items = editing.items.map(i => i.trim()).filter(Boolean);
    const id = isNew ? slugifyId(name, existingIds) : editing.id;
    const row: UniverseRow = { id, name, emoji: editing.emoji.trim() || '📋', grp: editing.grp.trim(), items };
    setBusy(true);
    const res = await upsertUniverse(row);
    setBusy(false);
    if (!res.ok) { showToast('⚠️', 'Save failed', res.error ?? 'Try again.'); return; }
    await loadUniverses();
    showToast('✅', isNew ? 'List created' : 'List saved', `${row.name} · ${items.length} items`);
    setMode('list');
  }

  async function doDelete() {
    if (!editing) return;
    setBusy(true);
    const res = await deleteUniverse(editing.id);
    setBusy(false);
    if (!res.ok) { showToast('⚠️', 'Delete failed', res.error ?? 'Try again.'); return; }
    await loadUniverses();
    showToast('🗑️', 'List deleted', `${editing.name} — existing user logs are untouched.`);
    setMode('list');
  }

  function buildPreview() {
    const { universes, error } = csvToUniverses(csvText);
    if (error) { showToast('⚠️', 'Bad CSV', error); return; }
    if (!universes.length) { showToast('⚠️', 'Nothing to import', 'No universe rows found.'); return; }
    const curById = new Map(remoteUniverses.map(u => [u.id, u]));
    const ds = universes.map(u => diffUniverse(u, curById.get(u.id)));
    const on: Record<string, boolean> = {};
    for (const d of ds) for (const r of d.renames) on[renameKey(d.id, r.from, r.to)] = true; // default: apply rename-safety
    setDiffs(ds); setRenameOn(on);
  }

  async function applyImport() {
    if (!diffs) return;
    setBusy(true);
    const rows: UniverseRow[] = diffs.map(d => d.incoming);
    const res = await upsertUniverses(rows);
    if (!res.ok) { setBusy(false); showToast('⚠️', 'Import failed', res.error ?? 'No changes applied.'); return; }
    // Rename-safety: update THIS user's entries for the confirmed (toggled-on) renames.
    const renames: { preset: string; from: string; to: string }[] = [];
    for (const d of diffs) for (const r of d.renames) if (renameOn[renameKey(d.id, r.from, r.to)]) renames.push({ preset: d.id, from: r.from, to: r.to });
    const changedEntries = renames.length ? renameLogItems(renames) : 0;
    await loadUniverses();
    setBusy(false);
    showToast('✅', 'Import applied', `${rows.length} lists · ${changedEntries} of your entries renamed`);
    setDiffs(null); setCsvText(''); setMode('list');
  }

  // ── Header ──────────────────────────────────────────────────────────────
  const title = mode === 'edit' ? (isNew ? 'New list' : 'Edit list')
    : mode === 'import' ? 'Import CSV' : mode === 'export' ? 'Export CSV' : 'Manage Lists';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surf2 }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            {mode !== 'list' && (
              <TouchableOpacity onPress={() => setMode('list')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 20, color: colors.accent, marginTop: -2 }}>‹</Text>
              </TouchableOpacity>
            )}
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text1 }}>{title}</Text>
          </View>
          <CloseButton />
        </View>

        {/* ── LIST ── */}
        {mode === 'list' && (
          <>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 }}>
              <ActionBtn label="＋ New" onPress={openNew} colors={colors} />
              <ActionBtn label="⬇ Export" onPress={() => setMode('export')} colors={colors} />
              <ActionBtn label="⬆ Import" onPress={() => { setDiffs(null); setMode('import'); }} colors={colors} />
            </View>
            <View style={{ paddingHorizontal: 16, marginBottom: 6 }}>
              <TextInput value={search} onChangeText={setSearch} placeholder="Search lists…" placeholderTextColor={colors.text3}
                autoCapitalize="none" style={fi} />
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}>
              <Text style={{ fontSize: 11, color: colors.text3, marginBottom: 8 }}>{remoteUniverses.length} lists · pull to refresh</Text>
              {filtered.map(u => (
                <TouchableOpacity key={u.id} onPress={() => openEdit(u)} activeOpacity={0.7}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surf,
                    borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                  <Text style={{ fontSize: 20 }}>{u.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text1 }} numberOfLines={2}>{u.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.text2, marginTop: 2 }}>{u.grp || '—'} · {u.items.length} items</Text>
                  </View>
                  <Text style={{ fontSize: 16, color: colors.text3 }}>›</Text>
                </TouchableOpacity>
              ))}
              {filtered.length === 0 && <Text style={{ fontSize: 13, color: colors.text2, textAlign: 'center', paddingVertical: 20 }}>No lists match.</Text>}
            </ScrollView>
          </>
        )}

        {/* ── EDIT / NEW ── */}
        {mode === 'edit' && editing && (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
            <FL label="Emoji" colors={colors} />
            <TextInput value={editing.emoji} onChangeText={v => setEditing({ ...editing, emoji: v })} style={{ ...fi, width: 80 }} />
            <FL label="Name" colors={colors} />
            <TextInput value={editing.name} onChangeText={v => setEditing({ ...editing, name: v })} placeholder="List name" placeholderTextColor={colors.text3} style={fi} />
            <FL label="Group" colors={colors} />
            <TextInput value={editing.grp} onChangeText={v => setEditing({ ...editing, grp: v })} placeholder="e.g. Sports Venues" placeholderTextColor={colors.text3} autoCapitalize="words" style={fi} />
            {isNew && <Text style={{ fontSize: 11, color: colors.text3, marginTop: -4, marginBottom: 10 }}>id: {editing.name.trim() ? slugifyId(editing.name, existingIds) : '(from name)'}</Text>}

            <FL label={`Items · ${editing.items.length}`} colors={colors} />
            {editing.items.map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <TextInput value={item} onChangeText={v => setEditing({ ...editing, items: editing.items.map((x, j) => j === i ? v : x) })}
                  style={{ ...fi, flex: 1, marginBottom: 0 }} placeholderTextColor={colors.text3} />
                <TouchableOpacity onPress={async () => {
                  const ok = await confirm({ title: 'Remove item?', message: `Remove “${item}”?`, confirmLabel: 'Remove', destructive: true });
                  if (ok) setEditing({ ...editing, items: editing.items.filter((_, j) => j !== i) });
                }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.isDark ? 'rgba(232,80,122,0.12)' : 'rgba(197,0,26,0.10)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.rose, fontSize: 13 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={() => setEditing({ ...editing, items: [...editing.items, ''] })}
              style={{ padding: 9, borderRadius: 9, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent, alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent }}>+ Add item</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={saveEditing} disabled={busy}
              style={{ backgroundColor: colors.accent, borderRadius: 14, padding: 15, alignItems: 'center', opacity: busy ? 0.6 : 1, marginBottom: 12 }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{busy ? 'Saving…' : (isNew ? 'Create list →' : 'Save changes →')}</Text>
            </TouchableOpacity>

            {!isNew && (
              <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }}>
                <FL label="Danger zone" colors={colors} />
                <Text style={{ fontSize: 12, color: colors.text2, marginBottom: 8 }}>
                  Deleting removes this list for ALL users' preset browser. Existing user LOGS are never touched — they keep their entries and simply fall back (no universe resolution). Type “{editing.name}” to confirm.
                </Text>
                <TextInput value={deleteConfirmName} onChangeText={setDeleteConfirmName} placeholder={editing.name} placeholderTextColor={colors.text3} style={fi} />
                <TouchableOpacity onPress={doDelete} disabled={busy || deleteConfirmName.trim() !== editing.name}
                  style={{ borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1,
                    borderColor: colors.isDark ? 'rgba(232,80,122,0.4)' : 'rgba(197,0,26,0.3)',
                    backgroundColor: colors.isDark ? 'rgba(232,80,122,0.12)' : 'rgba(197,0,26,0.08)',
                    opacity: (busy || deleteConfirmName.trim() !== editing.name) ? 0.5 : 1 }}>
                  <Text style={{ color: colors.rose, fontSize: 14, fontWeight: '700' }}>Delete this list</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {/* ── EXPORT ── */}
        {mode === 'export' && (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
            <Text style={{ fontSize: 13, color: colors.text2, marginBottom: 12 }}>
              {remoteUniverses.length} lists → one row per item (columns: universe_id, universe_name, emoji, grp, item). Edit in a spreadsheet, then paste back via Import.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {Platform.OS === 'web' && (
                <ActionBtn label="⬇ Download .csv" onPress={() => downloadCSV('universes.csv', universesToCSV(remoteUniverses)) || showToast('⚠️', 'Unavailable', 'Use the web app.')} colors={colors} grow />
              )}
              <ActionBtn label="Copy" onPress={async () => { const ok = await copyText(universesToCSV(remoteUniverses)); showToast(ok ? '✅' : '⚠️', ok ? 'Copied' : 'Select the text below', ''); }} colors={colors} grow />
            </View>
            <FL label="CSV (select to copy)" colors={colors} />
            <TextInput value={universesToCSV(remoteUniverses)} editable={false} multiline
              style={{ ...fi, minHeight: 260, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 11 }} />
          </ScrollView>
        )}

        {/* ── IMPORT ── */}
        {mode === 'import' && (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
            {!diffs ? (
              <>
                <Text style={{ fontSize: 13, color: colors.text2, marginBottom: 10 }}>
                  Paste CSV with header: universe_id, universe_name, emoji, grp, item — one row per item. Only listed universes are affected.
                </Text>
                <TextInput value={csvText} onChangeText={setCsvText} multiline placeholder="universe_id,universe_name,emoji,grp,item…"
                  placeholderTextColor={colors.text3} autoCapitalize="none" autoCorrect={false}
                  style={{ ...fi, minHeight: 220, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 11 }} />
                <TouchableOpacity onPress={buildPreview}
                  style={{ backgroundColor: colors.accent, borderRadius: 14, padding: 15, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Preview changes →</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 12, color: colors.text2, marginBottom: 12 }}>
                  Review before applying. Confirmed renames also update YOUR matching logged entries so your coverage doesn't drop. Other users keep the old string (it counts outside the universe until a future migration).
                </Text>
                {diffs.map(d => (
                  <View key={d.id} style={{ backgroundColor: colors.surf, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text1 }}>
                      {d.incoming.emoji} {d.incoming.name} {d.isNew && <Text style={{ color: colors.teal }}>· NEW</Text>}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.text3, marginBottom: 6 }}>{d.id}</Text>
                    {d.metaChanges.map((m, i) => (
                      <Text key={i} style={{ fontSize: 12, color: colors.amber, marginTop: 2 }}>{m.field}: “{m.from || '—'}” → “{m.to || '—'}”</Text>
                    ))}
                    {d.renames.map((r, i) => {
                      const k = renameKey(d.id, r.from, r.to); const on = renameOn[k];
                      return (
                        <TouchableOpacity key={'r' + i} onPress={() => setRenameOn(s => ({ ...s, [k]: !s[k] }))}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: on ? colors.teal : colors.border, backgroundColor: on ? colors.teal : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                            {on && <Text style={{ fontSize: 11, color: colors.isDark ? '#0A0A0F' : '#fff' }}>✓</Text>}
                          </View>
                          <Text style={{ flex: 1, fontSize: 12, color: colors.text1 }}>
                            <Text style={{ color: colors.teal, fontWeight: '700' }}>rename</Text> “{r.from}” → “{r.to}”
                            <Text style={{ color: colors.text3 }}>  {on ? '(updates your entries)' : '(treat as remove + add)'}</Text>
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {d.added.map((a, i) => <Text key={'a' + i} style={{ fontSize: 12, color: colors.teal, marginTop: 2 }}>+ {a}</Text>)}
                    {d.removed.map((r, i) => <Text key={'x' + i} style={{ fontSize: 12, color: colors.rose, marginTop: 2 }}>− {r}</Text>)}
                    {!d.isNew && d.metaChanges.length === 0 && d.renames.length === 0 && d.added.length === 0 && d.removed.length === 0 && (
                      <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>No changes.</Text>
                    )}
                  </View>
                ))}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <ActionBtn label="‹ Edit CSV" onPress={() => setDiffs(null)} colors={colors} grow />
                  <TouchableOpacity onPress={applyImport} disabled={busy}
                    style={{ flex: 1, backgroundColor: colors.accent, borderRadius: 12, padding: 13, alignItems: 'center', opacity: busy ? 0.6 : 1 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{busy ? 'Applying…' : `Apply ${diffs.length} →`}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ActionBtn({ label, onPress, colors, grow }: { label: string; onPress: () => void; colors: any; grow?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress}
      style={{ flex: grow ? 1 : 0, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1,
        borderColor: colors.border, backgroundColor: colors.glass, alignItems: 'center' }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text1 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function FL({ label, colors }: { label: string; colors: any }) {
  return <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</Text>;
}
