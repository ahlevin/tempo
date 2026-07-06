import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { QUOTES } from '../constants/data';

// Icon/label + tint per quote type; `colorKey` resolves against the active palette.
const META = {
  bible:        { icon:'✝️', label:'Bible Verse',     colorKey:'teal'   as const, bg:'rgba(62,207,178,0.07)',  border:'rgba(62,207,178,0.25)' },
  motivational: { icon:'⚡', label:'Motivational',     colorKey:'accent' as const, bg:'rgba(124,106,245,0.08)', border:'rgba(124,106,245,0.25)' },
  jokes:        { icon:'😄', label:'Joke of the Day', colorKey:'amber'  as const, bg:'rgba(240,160,75,0.07)',  border:'rgba(240,160,75,0.25)' },
};

function dailyQuote(arr: any[]) {
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return arr[seed % arr.length];
}

export function QuoteCard({ type }: { type: string }) {
  const { colors } = useTheme();
  const [override, setOverride] = useState<number | null>(null);

  if (type === 'off' || !QUOTES[type as keyof typeof QUOTES]) return null;

  const arr  = QUOTES[type as keyof typeof QUOTES];
  const m    = META[type as keyof typeof META];
  const meta = { ...m, color: colors[m.colorKey] };
  const q    = override !== null ? arr[override] : dailyQuote(arr);

  function rotate() {
    const cur = override !== null ? override : arr.indexOf(dailyQuote(arr));
    setOverride((cur + 1) % arr.length);
  }

  return (
    <View style={{
      borderRadius: 18, padding: 16, marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.isDark ? meta.border : colors.border,
      backgroundColor: colors.isDark ? meta.bg : colors.surf2,
    }}>
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <Text style={{ fontSize:10, fontWeight:'700', letterSpacing:1, textTransform:'uppercase', color:meta.color }}>
          {meta.icon} {meta.label}
        </Text>
        <TouchableOpacity onPress={rotate}
          style={{ width:26, height:26, borderRadius:13,
            backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : colors.track,
            alignItems:'center', justifyContent:'center' }}>
          <Text style={{ fontSize:13, color:colors.text3 }}>↻</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ fontSize:13, lineHeight:21, color:colors.text1, fontStyle:'italic', marginBottom:8 }}>
        "{q.text}"
      </Text>
      <Text style={{ fontSize:11, fontWeight:'600', color:meta.color }}>— {q.attr}</Text>
    </View>
  );
}
