import { Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/colors';

/** Uppercase field label, shared across the add/edit modals. */
export function FL({ label }: { label: string }) {
  return (
    <Text style={{ fontSize:11, fontWeight:'600', color:Colors.text3,
      textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>{label}</Text>
  );
}

/** Pill toggle row used for "All-day", "Repeating Event", "Alerts & Reminders". */
export function Toggle({ label, value, onChange }: { label:string; value:boolean; onChange:(v:boolean)=>void }) {
  return (
    <TouchableOpacity onPress={() => onChange(!value)}
      style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between',
        backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1,
        borderColor:'rgba(255,255,255,0.08)', borderRadius:11, padding:12, marginBottom:12 }}>
      <Text style={{ fontSize:14, fontWeight:'600', color:Colors.text1 }}>{label}</Text>
      <View style={{ width:40, height:22, borderRadius:11,
        backgroundColor: value ? Colors.accent : 'rgba(255,255,255,0.1)',
        justifyContent:'center', paddingHorizontal:2 }}>
        <View style={{ width:18, height:18, borderRadius:9, backgroundColor:'#fff',
          alignSelf: value ? 'flex-end' : 'flex-start' }} />
      </View>
    </TouchableOpacity>
  );
}
