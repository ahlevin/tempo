import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { CloseButton } from '../../components/CloseButton';

// Calendar now lives as a sub-screen linked from Profile (was its own tab).
export default function CalendarScreen() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2 }} edges={['top']}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center',
        paddingHorizontal:20, paddingVertical:14 }}>
        <Text style={{ fontSize:22, fontWeight:'700', color:colors.text1 }}>Calendar</Text>
        <CloseButton />
      </View>
      <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize:48, marginBottom:16 }}>📆</Text>
        <Text style={{ fontSize:18, fontWeight:'700', color:colors.text1, marginBottom:8 }}>Coming Soon</Text>
        <Text style={{ fontSize:14, color:colors.text3, textAlign:'center', paddingHorizontal:40 }}>
          Full calendar view with sync to{'\n'}Google, Apple &amp; Outlook.
        </Text>
      </View>
    </SafeAreaView>
  );
}
