import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

// Inline editor for a user-authored checklist (logItems): add, RENAME (each row is
// editable), and remove. Controlled — the parent owns the array. Reused by the
// custom-log CREATE flow (add-memory) and the post-creation editor (edit-memory).

// Trim, drop blanks, and dedupe (case-insensitive, first wins) — apply at PERSIST
// time so typing/renaming stays unrestricted while editing.
export function cleanItems(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const v = raw.trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

export function ItemListEditor({ items, onChange, placeholder }: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState('');

  const fi = { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 12, color: colors.text1, fontSize: 15 };

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (!items.some(x => x.trim().toLowerCase() === v.toLowerCase())) onChange([...items, v]);
    setDraft('');
  };
  const rename = (i: number, v: string) => onChange(items.map((x, j) => (j === i ? v : x)));
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));

  return (
    <>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <TextInput value={it} onChangeText={v => rename(i, v)} placeholderTextColor={colors.text3}
            style={{ ...fi, flex: 1 }} />
          <TouchableOpacity onPress={() => remove(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, color: colors.text3 }}>×</Text>
          </TouchableOpacity>
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={add} returnKeyType="done"
          placeholder={placeholder ?? 'Add an item…'} placeholderTextColor={colors.text3} style={{ ...fi, flex: 1 }} />
        <TouchableOpacity onPress={add}
          style={{ paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.isDark ? '#0A0A0F' : '#fff', fontWeight: '700' }}>Add</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
