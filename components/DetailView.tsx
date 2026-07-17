import { ReactNode } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { lightCardShadow } from '../constants/colors';
import type { Alert, Link } from '../store/types';
import { linkLabel, openUrl } from '../utils/links';

// ─────────────────────────────────────────────────────────────────────────────
// Shared READ-ONLY detail scaffold used by every item type. A tap opens this
// (all content clearly visible, nothing clipped); the prominent "✏️ Edit" button
// opens the existing edit form. On-brand: dark surfaces / Yacht Club navy light.
// ─────────────────────────────────────────────────────────────────────────────

// Header: 44px round back button (left) + filled Edit button (right), then a
// scroll body. Edit is navy-filled in light, glass in dark.
export function DetailScreen({ onEdit, editLabel = '✏️ Edit', backLabel, children }:
  { onEdit?: () => void; editLabel?: string; backLabel?: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surf2 }} edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 }}>
        {backLabel ? (
          // Labeled exit (e.g. "Done") for auto-saving screens — a confident "close
          // this", not a hunt for the arrow. Auto-save already persisted the change.
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={backLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4,
              backgroundColor: colors.isDark ? colors.glass : colors.accent, borderWidth: 1, borderColor: colors.isDark ? colors.border : colors.accent }}>
            <Text style={{ fontSize: 20, lineHeight: 22, fontWeight: '700', color: colors.isDark ? colors.text1 : '#fff', marginTop: -2 }}>‹</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.isDark ? colors.text1 : '#fff' }}>{backLabel}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.isDark ? colors.glass : colors.surf, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 22, lineHeight: 24, fontWeight: '700', color: colors.text1, marginTop: -3 }}>‹</Text>
          </TouchableOpacity>
        )}
        {onEdit && (
          <TouchableOpacity onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.isDark ? colors.glass : colors.accent,
              borderWidth: 1, borderColor: colors.isDark ? colors.border : colors.accent }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.isDark ? colors.text1 : '#fff' }}>{editLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

// The white content card (soft shadow in light, border in dark).
export function DetailCard({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.surf, borderRadius: 20, borderWidth: 1,
      borderColor: colors.border, padding: 18, ...(colors.isDark ? null : lightCardShadow) }}>
      {children}
    </View>
  );
}

// Emoji tile (56px) + big title + subtitle (category/type + status).
export function DetailHeader({ emoji, tint, title, subtitle, subtitleColor }:
  { emoji: string; tint: string; title: string; subtitle?: string; subtitleColor?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 30 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text1 }}>{title}</Text>
        {!!subtitle && (
          <Text style={{ fontSize: 14, fontWeight: '600', color: subtitleColor ?? colors.text2, marginTop: 3 }}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
}

// Divider-bounded stat row: left = uppercase label + context line; right = the
// big value + a small caption (e.g. "days away", "3 of 195").
export function StatRow({ label, context, value, valueCaption, valueColor }:
  { label: string; context?: string; value: string | number; valueCaption?: string; valueColor: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 16, marginTop: 16 }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</Text>
        {!!context && <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text1, marginTop: 4 }}>{context}</Text>}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 40, fontWeight: '800', color: valueColor, letterSpacing: -1, fontVariant: ['tabular-nums'] }}>{value}</Text>
        {!!valueCaption && <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{valueCaption}</Text>}
      </View>
    </View>
  );
}

// A titled section (uppercase micro-label + arbitrary body).
export function Section({ label, children }: { label: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

// A label→value field. Value is 16px content (wraps, never clipped).
export function Field({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      {!!label && <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>{label}</Text>}
      <Text style={{ fontSize: 16, color: colors.text1, lineHeight: 22 }}>{value}</Text>
    </View>
  );
}

// A "Links" section rendering each link as a tappable row (🔗 + label/domain,
// accent color). Opens the URL cross-platform; invalid URLs fail silently.
// Renders nothing when there are no links.
export function LinksSection({ links }: { links?: Link[] }) {
  const { colors } = useTheme();
  const list = (links ?? []).filter(l => l && l.url);
  if (!list.length) return null;
  return (
    <Section label="Links">
      {list.map((l, i) => (
        <TouchableOpacity key={i} onPress={() => openUrl(l.url)} activeOpacity={0.7}
          accessibilityRole="link" accessibilityLabel={linkLabel(l)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9,
            borderTopWidth: i === 0 ? 0 : 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 15 }}>🔗</Text>
          <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: colors.accent }} numberOfLines={1}>
            {linkLabel(l)}
          </Text>
          <Text style={{ fontSize: 14, color: colors.text3 }}>↗</Text>
        </TouchableOpacity>
      ))}
    </Section>
  );
}

// Human-readable reminder summary: "10 minutes before", joined by " · ".
export function remindersText(alerts?: Alert[]): string {
  if (!alerts || alerts.length === 0) return 'None';
  return alerts.map(a => `${a.value} ${a.value === 1 ? a.unit.replace(/s$/, '') : a.unit} before`).join(' · ');
}
