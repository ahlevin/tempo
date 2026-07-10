import type { ReactNode } from 'react';
import { DimensionValue, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { lightCardShadow } from '../constants/colors';
import { SwipeableRow } from './SwipeableRow';
import { FavStar } from './FavStar';

// The shared presentational shell for EVERY countdown row — standalone events,
// upcoming life-log entries, and goals — so they render as visual peers (same
// size, spacing, typography, day-number treatment, progress bar, and fav star).
export interface CountdownCardProps {
  emoji: string;
  emojiBg: string;            // emoji tile background
  accentBar: string;         // left accent bar (dark theme) + implied kind color
  title: string;
  titleMaxWidth?: DimensionValue;
  badges?: ReactNode;        // recur / alert / link / type-pill nodes on the title row
  subtitle?: ReactNode;      // the date / status line (string or nested <Text>s)
  note?: string;
  days: number | string;     // the big value (days-until, or a period score)
  daysLabel?: string;        // overrides the 'day'/'days' caption (e.g. 'of 5')
  dayColor: string;          // 30-day urgency color (crimson ≤30, else navy/teal)
  progressPct: number;       // thin progress bar, colored by dayColor
  fav: boolean;
  onFav: () => void;
  onPress: () => void;
  onDelete: () => void;
  confirmTitle: string;
  confirmMessage: string;
}

export function CountdownCard({
  emoji, emojiBg, accentBar, title, titleMaxWidth = '70%', badges, subtitle, note,
  days, daysLabel, dayColor, progressPct, fav, onFav, onPress, onDelete, confirmTitle, confirmMessage,
}: CountdownCardProps) {
  const { colors } = useTheme();
  return (
    <SwipeableRow onDelete={onDelete} confirmTitle={confirmTitle} confirmMessage={confirmMessage}>
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}
        style={{
          backgroundColor: colors.surf, borderRadius: 18, borderWidth: 1,
          borderColor: colors.border, padding: 14, paddingLeft: 16,
          marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12,
          ...(colors.isDark ? null : lightCardShadow),
        }}>
        {colors.isDark && <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: accentBar, borderRadius: 2 }} />}
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: emojiBg, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20 }}>{emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text1, maxWidth: titleMaxWidth }} numberOfLines={1}>{title}</Text>
            {badges}
          </View>
          {subtitle != null && (
            <Text style={{ fontSize: 13, color: colors.text2, marginTop: 2 }} numberOfLines={1}>{subtitle}</Text>
          )}
          {!!note && (
            <Text style={{ fontSize: 13, color: colors.text2, marginTop: 2, fontStyle: 'italic' }} numberOfLines={1}>{note}</Text>
          )}
          <View style={{ height: 2, backgroundColor: colors.track, borderRadius: 1, marginTop: 7, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${progressPct}%` as DimensionValue, backgroundColor: dayColor, borderRadius: 1 }} />
          </View>
        </View>
        <View style={{ alignItems: 'center' }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: dayColor }}>{days}</Text>
            <Text style={{ fontSize: 9, color: colors.text3, textTransform: 'uppercase' }}>{daysLabel ?? (days === 1 ? 'day' : 'days')}</Text>
          </View>
          <FavStar active={fav} onToggle={onFav} />
        </View>
      </TouchableOpacity>
    </SwipeableRow>
  );
}

// A subtle muted pill marking a derived item's KIND ("Life Log" / "Goal").
// Standalone events get none (they're the default). Same style language as
// AlertBadge/LinkBadge.
export function TypePill({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.isDark ? 'rgba(62,207,178,0.14)' : colors.tint, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 7 }}>
      <Text style={{ fontSize: 9, fontWeight: '700', color: colors.teal, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );
}
