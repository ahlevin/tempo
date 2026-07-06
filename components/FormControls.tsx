import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

/** Uppercase field label, shared across the add/edit modals. */
export function FL({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize:11, fontWeight:'600', color:colors.text3,
      textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>{label}</Text>
  );
}

/** Pill toggle row used for "All-day", "Repeating Event", "Alerts & Reminders". */
export function Toggle({ label, value, onChange }: { label:string; value:boolean; onChange:(v:boolean)=>void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={() => onChange(!value)}
      style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between',
        backgroundColor:colors.glass, borderWidth:1,
        borderColor:colors.border, borderRadius:11, padding:12, marginBottom:12 }}>
      <Text style={{ fontSize:14, fontWeight:'600', color:colors.text1 }}>{label}</Text>
      <View style={{ width:40, height:22, borderRadius:11,
        backgroundColor: value ? colors.accent : (colors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)'),
        justifyContent:'center', paddingHorizontal:2 }}>
        <View style={{ width:18, height:18, borderRadius:9, backgroundColor:'#fff',
          alignSelf: value ? 'flex-end' : 'flex-start' }} />
      </View>
    </TouchableOpacity>
  );
}
