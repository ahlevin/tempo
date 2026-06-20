import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';

export default function CalendarScreen() {
  return (
    <SafeAreaView style={{ flex:1, backgroundColor:Colors.bg }} edges={['top']}>
      <View style={{ paddingHorizontal:20, paddingBottom:12 }}>
        <Text style={{ fontSize:24, fontWeight:'700', color:Colors.text1 }}>Calendar</Text>
      </View>
      <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize:48, marginBottom:16 }}>📆</Text>
        <Text style={{ fontSize:18, fontWeight:'700', color:Colors.text1, marginBottom:8 }}>Coming Soon</Text>
        <Text style={{ fontSize:14, color:Colors.text3, textAlign:'center', paddingHorizontal:40 }}>
          Full calendar view with sync to{'\n'}Google, Apple & Outlook.
        </Text>
      </View>
    </SafeAreaView>
  );
}
