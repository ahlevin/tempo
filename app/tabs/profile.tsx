import { ScrollView, View, Text, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../contexts/AuthContext';
import { TIMEZONES, QUOTES } from '../../constants/data';
import { catColor } from '../../constants/colors';

type QuoteType = 'bible' | 'motivational' | 'jokes' | 'off';
const QUOTE_OPTS: { id: QuoteType; icon: string; label: string; desc: string }[] = [
  { id:'bible',        icon:'✝️', label:'Bible Verse',    desc:'Daily scripture for reflection' },
  { id:'motivational', icon:'⚡', label:'Motivational',    desc:'Fuel your day with inspiration' },
  { id:'jokes',        icon:'😄', label:'Joke of the Day', desc:'Start your day with a smile' },
  { id:'off',          icon:'🔕', label:'No Quote',        desc:'Keep the home screen minimal' },
];

export default function ProfileScreen() {
  const { colors, theme, setTheme } = useTheme();
  const prefs = useStore(s => s.prefs);
  const updatePrefs = useStore(s => s.updatePrefs);
  const { user, signOut } = useAuth();
  const [locOpen, setLocOpen] = useState(false);
  const [tzOpen,  setTzOpen]  = useState(false);
  const [locVal,  setLocVal]  = useState(prefs.location || '');

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal:16, paddingBottom:120 }}
        showsVerticalScrollIndicator={false}>
        <View style={{ alignItems:'center', paddingVertical:28 }}>
          <View style={{ width:80, height:80, borderRadius:40, backgroundColor:colors.accent,
            alignItems:'center', justifyContent:'center', marginBottom:12 }}>
            <Text style={{ fontSize:34 }}>👤</Text>
          </View>
          <Text style={{ fontSize:20, fontWeight:'700', color:colors.text1 }}>
            {user?.email ? user.email.split('@')[0] : 'Your Account'}
          </Text>
          <Text style={{ fontSize:13, color:colors.text3, marginTop:4 }}>
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
                  borderColor: sel ? colors.accent : colors.border,
                  backgroundColor: sel ? (colors.isDark ? 'rgba(124,106,245,0.1)' : colors.tint) : colors.glass }}>
                <View style={{ width:44, height:44, borderRadius:13,
                  backgroundColor: colors.isDark ? 'rgba(124,106,245,0.12)' : colors.tint,
                  alignItems:'center', justifyContent:'center' }}>
                  <Text style={{ fontSize:22 }}>{opt.icon}</Text>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:15, fontWeight:'600',
                    color: sel ? colors.accent : colors.text1 }}>{opt.label}</Text>
                  <Text style={{ fontSize:12, color:colors.text3, marginTop:2 }}>{opt.desc}</Text>
                </View>
                {sel && <Text style={{ fontSize:18, color:colors.accent }}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <SLabel label="Appearance" />
        <View style={{ flexDirection:'row', gap:8, marginBottom:28 }}>
          {([
            { id:'light' as const, icon:'☀️', label:'Light' },
            { id:'dark'  as const, icon:'🌙', label:'Dark' },
          ]).map(opt => {
            const sel = theme === opt.id;
            return (
              <TouchableOpacity key={opt.id} onPress={() => setTheme(opt.id)}
                style={{ flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8,
                  paddingVertical:14, borderRadius:14, borderWidth:1.5,
                  borderColor: sel ? colors.accent : colors.border,
                  backgroundColor: sel ? (colors.isDark ? 'rgba(124,106,245,0.12)' : colors.tint) : colors.glass }}>
                <Text style={{ fontSize:18 }}>{opt.icon}</Text>
                <Text style={{ fontSize:15, fontWeight:'700',
                  color: sel ? colors.accent : colors.text1 }}>{opt.label}</Text>
                {sel && <Text style={{ fontSize:15, color:colors.accent }}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <SLabel label="Location & Time" />
        <View style={{ backgroundColor:colors.surf, borderRadius:18, borderWidth:1,
          borderColor:colors.border, overflow:'hidden', marginBottom:28 }}>
          <TouchableOpacity onPress={() => { setLocOpen(!locOpen); setTzOpen(false); }}
            style={{ flexDirection:'row', alignItems:'center', gap:14, padding:14,
              borderBottomWidth: locOpen ? 1 : 0, borderBottomColor:colors.tile }}>
            <View style={{ width:36, height:36, borderRadius:10,
              backgroundColor: colors.isDark ? 'rgba(62,207,178,0.13)' : colors.tint,
              alignItems:'center', justifyContent:'center' }}>
              <Text style={{ fontSize:18 }}>📍</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:14, fontWeight:'600', color:colors.text1 }}>Location</Text>
              <Text style={{ fontSize:12, color:colors.text3, marginTop:2 }}>
                {prefs.location || 'Not set'}
              </Text>
            </View>
            <Text style={{ color:colors.text3, fontSize:16 }}>›</Text>
          </TouchableOpacity>
          {locOpen && (
            <View style={{ padding:14, gap:8 }}>
              <TextInput value={locVal} onChangeText={setLocVal}
                placeholder="City, State or ZIP"
                placeholderTextColor={colors.text3}
                style={{ backgroundColor:colors.tile, borderWidth:1,
                  borderColor:colors.border, borderRadius:10,
                  padding:10, color:colors.text1, fontSize:14 }} />
              <TouchableOpacity
                onPress={() => { updatePrefs({ location: locVal }); setLocOpen(false); }}
                style={{ backgroundColor:colors.accent, borderRadius:11,
                  padding:10, alignItems:'center' }}>
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:13 }}>Save Location</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={() => { setTzOpen(!tzOpen); setLocOpen(false); }}
            style={{ flexDirection:'row', alignItems:'center', gap:14, padding:14 }}>
            <View style={{ width:36, height:36, borderRadius:10,
              backgroundColor: colors.isDark ? 'rgba(124,106,245,0.15)' : colors.tint,
              alignItems:'center', justifyContent:'center' }}>
              <Text style={{ fontSize:18 }}>🕐</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:14, fontWeight:'600', color:colors.text1 }}>Time Zone</Text>
              <Text style={{ fontSize:12, color:colors.text3, marginTop:2 }}>
                {TIMEZONES.find(t => t.value === prefs.timezone)?.label || prefs.timezone}
              </Text>
            </View>
            <Text style={{ color:colors.text3, fontSize:16 }}>›</Text>
          </TouchableOpacity>
          {tzOpen && (
            <View style={{ paddingHorizontal:14, paddingBottom:14, gap:6 }}>
              {TIMEZONES.map(tz => (
                <TouchableOpacity key={tz.value}
                  onPress={() => { updatePrefs({ timezone: tz.value }); setTzOpen(false); }}
                  style={{ padding:10, borderRadius:9, borderWidth:1,
                    borderColor: prefs.timezone === tz.value ? colors.accent : colors.glass,
                    backgroundColor: prefs.timezone === tz.value ? (colors.isDark ? 'rgba(124,106,245,0.15)' : colors.tint) : colors.tile }}>
                  <Text style={{ fontSize:13,
                    color: prefs.timezone === tz.value ? colors.accent : colors.text2 }}>
                    {tz.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <SLabel label="Browse" />
        <View style={{ borderRadius:18, borderWidth:1, borderColor:colors.border,
          backgroundColor:colors.surf, overflow:'hidden', marginBottom:28 }}>
          <TouchableOpacity onPress={() => router.push('/modals/favorites')}
            style={{ flexDirection:'row', alignItems:'center', gap:14, padding:14 }}>
            <View style={{ width:44, height:44, borderRadius:13,
              backgroundColor: colors.isDark ? 'rgba(240,160,75,0.16)' : colors.tint, alignItems:'center', justifyContent:'center' }}>
              <Text style={{ fontSize:20 }}>⭐</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:15, fontWeight:'600', color:colors.text1 }}>Favorites</Text>
              <Text style={{ fontSize:12, color:colors.text3, marginTop:2 }}>Your starred countdowns, goals &amp; memories</Text>
            </View>
            <Text style={{ fontSize:16, color:colors.text3 }}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/modals/calendar')}
            style={{ flexDirection:'row', alignItems:'center', gap:14, padding:14, borderTopWidth:1, borderTopColor:colors.border }}>
            <View style={{ width:44, height:44, borderRadius:13,
              backgroundColor: colors.isDark ? 'rgba(124,106,245,0.16)' : colors.tint, alignItems:'center', justifyContent:'center' }}>
              <Text style={{ fontSize:20 }}>📆</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:15, fontWeight:'600', color:colors.text1 }}>Calendar</Text>
              <Text style={{ fontSize:12, color:colors.text3, marginTop:2 }}>Coming soon</Text>
            </View>
            <Text style={{ fontSize:16, color:colors.text3 }}>›</Text>
          </TouchableOpacity>
        </View>

        <SLabel label="Countdown" />
        <TouchableOpacity onPress={() => router.push('/modals/holidays-settings')}
          style={{ flexDirection:'row', alignItems:'center', gap:14, padding:14,
            borderRadius:18, borderWidth:1, borderColor:colors.border,
            backgroundColor:colors.surf, marginBottom:28 }}>
          <View style={{ width:44, height:44, borderRadius:13,
            backgroundColor: colors.isDark ? 'rgba(46,139,87,0.16)' : colors.tint, alignItems:'center', justifyContent:'center' }}>
            <Text style={{ fontSize:20 }}>🎄</Text>
          </View>
          <View style={{ flex:1 }}>
            <Text style={{ fontSize:15, fontWeight:'600', color:colors.text1 }}>Holidays</Text>
            <Text style={{ fontSize:12, color:colors.text3, marginTop:2 }}>
              {prefs.holidays.enabled
                ? `On · ${Object.values(prefs.holidays.shown ?? {}).filter(Boolean).length} shown`
                : 'Off · tap to add US holidays'}
            </Text>
          </View>
          <Text style={{ fontSize:16, color: prefs.holidays.enabled ? catColor(colors, 'holidays') : colors.text3 }}>›</Text>
        </TouchableOpacity>

        <SLabel label="Account" />
        <TouchableOpacity onPress={() => signOut()}
          style={{ flexDirection:'row', alignItems:'center', gap:14, padding:14,
            borderRadius:14, borderWidth:1,
            borderColor: colors.isDark ? 'rgba(232,80,122,0.3)' : 'rgba(197,0,26,0.30)',
            backgroundColor: colors.isDark ? 'rgba(232,80,122,0.1)' : 'rgba(197,0,26,0.08)', marginBottom:28 }}>
          <View style={{ width:44, height:44, borderRadius:13,
            backgroundColor: colors.isDark ? 'rgba(232,80,122,0.15)' : 'rgba(197,0,26,0.12)', alignItems:'center', justifyContent:'center' }}>
            <Text style={{ fontSize:20 }}>🚪</Text>
          </View>
          <View style={{ flex:1 }}>
            <Text style={{ fontSize:15, fontWeight:'600', color:colors.rose }}>Sign Out</Text>
            <Text style={{ fontSize:12, color:colors.text3, marginTop:2 }}>Return to the login screen</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SLabel({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize:11, fontWeight:'700', letterSpacing:1,
      textTransform:'uppercase', color:colors.text3,
      marginHorizontal:4, marginBottom:10 }}>{label}</Text>
  );
}
