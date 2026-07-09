import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Pressable } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ICON_GROUPS, ICON_COUNT, searchIcons } from '../constants/icons';

// Shared icon picker used by every add/edit surface (event, memory, goal, life
// log, custom). The form shows ONLY a compact trigger — the current icon plus a
// "Change" chip. Tapping opens a bottom DRAWER whose grouped icon list scrolls
// on its own dedicated surface, so there's no scroll-within-scroll fight with
// the form page. Selecting sets the emoji (storage is unchanged) and closes.
// `accent` themes the selection per surface (event → violet, memory → rose,
// goal/log → teal).
export function IconPicker({ value, onChange, accent }: {
  value: string; onChange: (e: string) => void; accent?: string;
}) {
  const { colors } = useTheme();
  const acc = accent ?? colors.accent;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const searching = q.trim().length > 0;
  const results = searching ? searchIcons(q) : [];

  const selBg = colors.isDark ? hexToRgba(acc, 0.15) : colors.tint;

  // A single 48px selectable tile.
  const Tile = ({ em }: { em: string }) => {
    const sel = em === value;
    return (
      <TouchableOpacity onPress={() => pick(em)}
        style={{ width: 48, height: 48, borderRadius: 12, borderWidth: 2,
          borderColor: sel ? acc : 'transparent',
          backgroundColor: sel ? selBg : colors.glass,
          alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 22 }}>{em}</Text>
      </TouchableOpacity>
    );
  };

  const pick = (em: string) => { onChange(em); setOpen(false); setQ(''); };
  const close = () => { setOpen(false); setQ(''); };

  return (
    <>
      {/* Compact trigger — no inline grid in the form. */}
      <TouchableOpacity onPress={() => setOpen(true)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14,
          padding: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
          backgroundColor: colors.glass }}>
        <View style={{ width: 52, height: 52, borderRadius: 13, borderWidth: 2, borderColor: acc,
          backgroundColor: selBg, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 26 }}>{value}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text1 }}>Tap to change icon</Text>
          <Text style={{ fontSize: 12, color: colors.text3, marginTop: 1 }}>Choose from {ICON_COUNT} icons</Text>
        </View>
        <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: selBg }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: acc }}>Change ›</Text>
        </View>
      </TouchableOpacity>

      {/* Bottom drawer — its own scroll surface, tall for comfortable browsing. */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable onPress={close} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          {/* Empty onPress stops taps inside the sheet from closing it. */}
          <Pressable onPress={() => {}} style={{ height: '80%', backgroundColor: colors.surf2,
            borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingHorizontal: 16 }}>
            <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2,
              alignSelf: 'center', marginBottom: 12 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text1 }}>Choose an Icon</Text>
              <TouchableOpacity onPress={close} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: acc }}>Done</Text>
              </TouchableOpacity>
            </View>
            <TextInput value={q} onChangeText={setQ} placeholder="Search icons…"
              placeholderTextColor={colors.text3} autoCapitalize="none" autoCorrect={false}
              style={{ backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border,
                borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: colors.text1,
                fontSize: 14, marginBottom: 12 }} />
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
              {searching ? (
                // Flat "Results" list while a query is active.
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text3,
                    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    {results.length} {results.length === 1 ? 'Result' : 'Results'}
                  </Text>
                  {results.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {results.map((em, i) => <Tile key={`r-${i}`} em={em} />)}
                    </View>
                  ) : (
                    <Text style={{ color: colors.text3, fontSize: 13, paddingVertical: 8 }}>
                      No icons match “{q.trim()}”.
                    </Text>
                  )}
                </View>
              ) : (
                // Normal grouped view when the search is empty.
                ICON_GROUPS.map(g => (
                  <View key={g.label} style={{ marginBottom: 14 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text3,
                      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{g.label}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {g.icons.map((ic, i) => <Tile key={`${g.label}-${i}`} em={ic.emoji} />)}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// Turn a #RRGGBB / #RGB accent into a translucent rgba() for the selected-tile
// tint. Falls back to the input untouched if it isn't a hex color.
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  if (full.length !== 6) return hex;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return hex;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
