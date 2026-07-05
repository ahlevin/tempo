import { ScrollView, View, Text, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Colors } from '../../constants/colors';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../contexts/AuthContext';
import { TIMEZONES, QUOTES } from '../../constants/data';

type QuoteType = 'bible' | 'motivational' | 'jokes' | 'off';
const QUOTE_OPTS: { id: QuoteType; icon: string; label: string; desc: string }[] = [
  { id:'bible',        icon:'✝️', label:'Bible Verse',    desc:'Daily scripture for reflection' },
  { id:'motivational', icon:'⚡', label:'Motivational',    desc:'Fuel your day with inspiration' },
  { id:'jokes',        icon:'😄', label:'Joke of the Day', desc:'Start your day with a smile' },
  { id:'off',          icon:'🔕', label:'No Quote',        desc:'Keep the home screen minimal' },
];

export default function ProfileScreen() {
  const prefs = useStore(s => s.prefs);
  const updatePrefs = useStore(s => s.updatePrefs);
  const { user, signOut } = useAuth();
  const [locOpen, setLocOpen] = useState(false);
  const [tzOpen,  setTzOpen]  = useState(false);
  const [locVal,  setLocVal]  = useState(prefs.location || '');

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:Colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal:16, paddingBottom:120 }}
        showsVerticalScrollIndicator={false}>
        <View style={{ alignItems:'center', paddingVertical:28 }}>
          <View style={{ width:80, height:80, borderRadius:40, backgroundColor:Colors.accent,
            alignItems:'center', justifyContent:'center', marginBottom:12 }}>
            <Text style={{ fontSize:34 }}>👤</Text>
          </View>
          <Text style={{ fontSize:20, fontWeight:'700', color:Colors.text1 }}>
            {user?.email ? user.email.split('@')[0] : 'Your Account'}
          </Text>
          <Text style={{ fontSize:13, color:Colors.text3, marginTop:4 }}>
            {user?.email || 'Not signed in'}
          </Text>
        </View>

        <SLabel label="Daily Quote" />
        <View style={{ gap:8, marginBottom:28 }}>
          {QUOTE_OPTS.map(opt => {
            const sel = prefs.quotePref === opt.id;
            return (
              <TouchableOpacity key={opt.id} onPress={() => updatePrefs({ quotePref: opt.id })}
                style={{ flexDirection:'row', alignItems:'center', gap:14, padding:14,
                  borderRadius:14, borderWidth:1.5,
                  borderColor: sel ? Colors.accent : Colors.border,
                  backgroundColor: sel ? 'rgba(124,106,245,0.1)' : Colors.glass }}>
                <View style={{ width:44, height:44, borderRadius:13,
                  backgroundColor:'rgba(124,106,245,0.12)',
                  alignItems:'center', justifyContent:'center' }}>
                  <Text style={{ fontSize:22 }}>{opt.icon}</Text>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:15, fontWeight:'600',
                    color: sel ? Colors.accent : Colors.text1 }}>{opt.label}</Text>
                  <Text style={{ fontSize:12, color:Colors.text3, marginTop:2 }}>{opt.desc}</Text>
                </View>
                {sel && <Text style={{ fontSize:18, color:Colors.accent }}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <SLabel label="Location & Time" />
        <View style={{ backgroundColor:Colors.surf, borderRadius:18, borderWidth:1,
          borderColor:Colors.border, overflow:'hidden', marginBottom:28 }}>
          <TouchableOpacity onPress={() => { setLocOpen(!locOpen); setTzOpen(false); }}
            style={{ flexDirection:'row', alignItems:'center', gap:14, padding:14,
              borderBottomWidth: locOpen ? 1 : 0, borderBottomColor:'rgba(255,255,255,0.05)' }}>
            <View style={{ width:36, height:36, borderRadius:10,
              backgroundColor:'rgba(62,207,178,0.13)',
              alignItems:'center', justifyContent:'center' }}>
              <Text style={{ fontSize:18 }}>📍</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:14, fontWeight:'600', color:Colors.text1 }}>Location</Text>
              <Text style={{ fontSize:12, color:Colors.text3, marginTop:2 }}>
                {prefs.location || 'Not set'}
              </Text>
            </View>
            <Text style={{ color:Colors.text3, fontSize:16 }}>›</Text>
          </TouchableOpacity>
          {locOpen && (
            <View style={{ padding:14, gap:8 }}>
              <TextInput value={locVal} onChangeText={setLocVal}
                placeholder="City, State or ZIP"
                placeholderTextColor={Colors.text3}
                style={{ backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1,
                  borderColor:'rgba(255,255,255,0.08)', borderRadius:10,
                  padding:10, color:Colors.text1, fontSize:14 }} />
              <TouchableOpacity
                onPress={() => { updatePrefs({ location: locVal }); setLocOpen(false); }}
                style={{ backgroundColor:Colors.accent, borderRadius:11,
                  padding:10, alignItems:'center' }}>
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:13 }}>Save Location</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={() => { setTzOpen(!tzOpen); setLocOpen(false); }}
            style={{ flexDirection:'row', alignItems:'center', gap:14, padding:14 }}>
            <View style={{ width:36, height:36, borderRadius:10,
              backgroundColor:'rgba(124,106,245,0.15)',
              alignItems:'center', justifyContent:'center' }}>
              <Text style={{ fontSize:18 }}>🕐</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:14, fontWeight:'600', color:Colors.text1 }}>Time Zone</Text>
              <Text style={{ fontSize:12, color:Colors.text3, marginTop:2 }}>
                {TIMEZONES.find(t => t.value === prefs.timezone)?.label || prefs.timezone}
              </Text>
            </View>
            <Text style={{ color:Colors.text3, fontSize:16 }}>›</Text>
          </TouchableOpacity>
          {tzOpen && (
            <View style={{ paddingHorizontal:14, paddingBottom:14, gap:6 }}>
              {TIMEZONES.map(tz => (
                <TouchableOpacity key={tz.value}
                  onPress={() => { updatePrefs({ timezone: tz.value }); setTzOpen(false); }}
                  style={{ padding:10, borderRadius:9, borderWidth:1,
                    borderColor: prefs.timezone === tz.value ? Colors.accent : 'rgba(255,255,255,0.06)',
                    backgroundColor: prefs.timezone === tz.value ? 'rgba(124,106,245,0.15)' : 'rgba(255,255,255,0.03)' }}>
                  <Text style={{ fontSize:13,
                    color: prefs.timezone === tz.value ? Colors.accent : Colors.text2 }}>
                    {tz.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <SLabel label="Account" />
        <TouchableOpacity onPress={() => signOut()}
          style={{ flexDirection:'row', alignItems:'center', gap:14, padding:14,
            borderRadius:14, borderWidth:1, borderColor:'rgba(232,80,122,0.3)',
            backgroundColor:'rgba(232,80,122,0.1)', marginBottom:28 }}>
          <View style={{ width:44, height:44, borderRadius:13,
            backgroundColor:'rgba(232,80,122,0.15)', alignItems:'center', justifyContent:'center' }}>
            <Text style={{ fontSize:20 }}>🚪</Text>
          </View>
          <View style={{ flex:1 }}>
            <Text style={{ fontSize:15, fontWeight:'600', color:Colors.rose }}>Sign Out</Text>
            <Text style={{ fontSize:12, color:Colors.text3, marginTop:2 }}>Return to the login screen</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SLabel({ label }: { label: string }) {
  return (
    <Text style={{ fontSize:11, fontWeight:'700', letterSpacing:1,
      textTransform:'uppercase', color:Colors.text3,
      marginHorizontal:4, marginBottom:10 }}>{label}</Text>
  );
}
