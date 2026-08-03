import { ScrollView, View, Text, TouchableOpacity, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { IconPicker } from '../../components/IconPicker';
import { useConfirm } from '../../components/ConfirmDialog';
import { goalKind } from '../../utils/goals';
import { ownLogCoverage } from '../../utils/challenge';
import { presetUniverse } from '../../constants/lifelogs';
import { copyToClipboard } from '../../utils/clipboard';
import { TIMEZONES, QUOTES } from '../../constants/data';
import { catColor } from '../../constants/colors';
import { BUILD_ID } from '../../constants/build';

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
  const myProfile = useStore(s => s.myProfile);
  const updateMyProfile = useStore(s => s.updateMyProfile);
  const joinChallenge = useStore(s => s.joinChallenge);
  const importCollectionCoverage = useStore(s => s.importCollectionCoverage);
  const confirm = useConfirm();
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const [locOpen, setLocOpen] = useState(false);
  const [tzOpen,  setTzOpen]  = useState(false);
  const [locVal,  setLocVal]  = useState(prefs.location || '');
  // Identity (challenge) fields.
  const [nameDraft, setNameDraft] = useState(myProfile?.displayName ?? '');
  const [nameFocused, setNameFocused] = useState(false);
  const [joinDraft, setJoinDraft] = useState('');
  const [joining, setJoining] = useState(false);
  // Keep the name field in sync when the profile loads/changes (unless editing).
  useEffect(() => { if (!nameFocused) setNameDraft(myProfile?.displayName ?? ''); }, [myProfile?.displayName, nameFocused]);

  const saveName = () => { const v = nameDraft.trim(); if (v && v !== myProfile?.displayName) updateMyProfile({ displayName: v }); };
  const copyInvite = async () => {
    const code = myProfile?.inviteCode ?? '';
    if (!code) return;
    const ok = await copyToClipboard(code);
    showToast(ok ? '✅' : '⚠️', ok ? 'Invite code copied' : 'Copy failed', ok ? code : 'Select it to copy.');
  };
  const doJoin = async () => {
    if (joining) return;
    setJoining(true);
    const res = await joinChallenge(joinDraft);
    setJoining(false);
    if (res.error) { showToast('⚠️', 'Could not join', res.error); return; }
    setJoinDraft('');
    showToast('🏆', 'Joined the challenge!', 'Find it in the Challenges tab.');
    await offerCoverageImport(res.goalId);
    router.push('/tabs/challenges');
  };

  // After joining a PRESET collection challenge, if this user has their own prior
  // coverage for that collection, offer to count it (per-person head start). Import
  // is idempotent, so re-choosing "count" never double-writes. No prompt at 0.
  const offerCoverageImport = async (goalId?: string) => {
    if (!goalId) return;
    const goal = useStore.getState().goals.find(g => g.id === goalId);
    if (!goal || goalKind(goal) !== 'collection' || !goal.linkedPreset) return;
    const size = presetUniverse(goal.linkedPreset)?.length ?? 0;
    const n = ownLogCoverage(useStore.getState().memories, goal.linkedPreset).length;
    if (n <= 0) return;
    const ok = await confirm({
      title: 'Count your existing visits?',
      message: `You've already visited ${n} of ${size} of these in your log. Count them, or start fresh?\n\nThis is per-person — each participant chooses for themselves.`,
      confirmLabel: `Count my ${n}`,
      cancelLabel: 'Start fresh',
    });
    if (!ok) return;
    const added = importCollectionCoverage(goalId, goal.linkedPreset);
    if (added > 0) showToast('✅', 'Head start counted', `Counted ${added} existing ${added === 1 ? 'visit' : 'visits'}.`);
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal:16, paddingBottom:120 }}
        showsVerticalScrollIndicator={false}>
        <View style={{ alignItems:'center', paddingVertical:24 }}>
          <View style={{ width:80, height:80, borderRadius:40, backgroundColor: colors.isDark ? colors.glass : colors.tint,
            borderWidth:1, borderColor:colors.border, alignItems:'center', justifyContent:'center', marginBottom:12 }}>
            <Text style={{ fontSize:38 }}>{myProfile?.avatarEmoji || '🙂'}</Text>
          </View>
          <TextInput value={nameDraft} onChangeText={setNameDraft}
            onFocus={() => setNameFocused(true)}
            onBlur={() => { setNameFocused(false); saveName(); }}
            onEndEditing={saveName} returnKeyType="done"
            placeholder="Your name" placeholderTextColor={colors.text3}
            style={{ fontSize:20, fontWeight:'700', color:colors.text1, textAlign:'center', minWidth:180, paddingVertical:2 }} />
          <Text style={{ fontSize:13, color:colors.text3, marginTop:4 }}>{user?.email || 'Not signed in'}</Text>
        </View>

        <SLabel label="Your avatar" />
        <View style={{ marginBottom:24 }}>
          <IconPicker value={myProfile?.avatarEmoji || '🙂'} onChange={e => updateMyProfile({ avatarEmoji: e })} accent={colors.accent} />
        </View>

        <SLabel label="Your invite code" />
        <View style={{ backgroundColor:colors.surf, borderRadius:16, borderWidth:1, borderColor:colors.border, padding:16, marginBottom:24 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <Text style={{ flex:1, fontSize:28, fontWeight:'800', color:colors.teal, letterSpacing:3 }}>
              {myProfile?.inviteCode || '—'}
            </Text>
            <TouchableOpacity onPress={copyInvite} disabled={!myProfile?.inviteCode}
              style={{ paddingVertical:9, paddingHorizontal:16, borderRadius:12, backgroundColor:colors.teal, opacity: myProfile?.inviteCode ? 1 : 0.5 }}>
              <Text style={{ fontSize:14, fontWeight:'700', color: colors.isDark ? '#0A0A0F' : '#fff' }}>Copy</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize:12, color:colors.text3, marginTop:10 }}>
            Your personal code — friends can find you by it. To join a specific challenge, use its join code below.
          </Text>
        </View>

        <SLabel label="Join a challenge" />
        <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
          <TextInput value={joinDraft} onChangeText={t => setJoinDraft(t.toUpperCase())} autoCapitalize="characters"
            placeholder="Enter join code (e.g. JCR9CS)" placeholderTextColor={colors.text3} onSubmitEditing={doJoin} returnKeyType="go"
            style={{ flex:1, backgroundColor:colors.glass, borderWidth:1, borderColor:colors.border, borderRadius:12, padding:12, color:colors.text1, fontSize:15, letterSpacing:1 }} />
          <TouchableOpacity onPress={doJoin} disabled={joining || !joinDraft.trim()}
            style={{ paddingHorizontal:18, borderRadius:12, backgroundColor:colors.accent, alignItems:'center', justifyContent:'center', opacity: joining || !joinDraft.trim() ? 0.5 : 1 }}>
            <Text style={{ fontSize:14, fontWeight:'700', color:'#fff' }}>{joining ? '…' : 'Join'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize:12, color:colors.text3, marginBottom:24, marginLeft:2 }}>
          Got a challenge code from a friend? Enter it to join their leaderboard.
        </Text>

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

        {/* Superuser only — edit the shared collection universes (RLS-gated). */}
        {prefs.isSuperuser && (
          <>
            <SLabel label="Admin" />
            <TouchableOpacity onPress={() => router.push('/modals/admin-universes')}
              style={{ flexDirection:'row', alignItems:'center', gap:14, padding:14,
                borderRadius:18, borderWidth:1, borderColor:colors.border,
                backgroundColor:colors.surf, marginBottom:28 }}>
              <View style={{ width:44, height:44, borderRadius:13,
                backgroundColor: colors.isDark ? 'rgba(124,106,245,0.16)' : colors.tint, alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:20 }}>🛠️</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:15, fontWeight:'600', color:colors.text1 }}>Manage Lists</Text>
                <Text style={{ fontSize:12, color:colors.text2, marginTop:2 }}>Edit the shared collection universes (all users)</Text>
              </View>
              <Text style={{ fontSize:16, color:colors.text3 }}>›</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Native-only on-device notification diagnostics. */}
        {Platform.OS !== 'web' && (
          <>
            <SLabel label="Developer" />
            <TouchableOpacity onPress={() => router.push('/modals/notif-debug')}
              style={{ flexDirection:'row', alignItems:'center', gap:14, padding:14,
                borderRadius:18, borderWidth:1, borderColor:colors.border,
                backgroundColor:colors.surf, marginBottom:28 }}>
              <View style={{ width:44, height:44, borderRadius:13,
                backgroundColor: colors.isDark ? 'rgba(240,160,75,0.16)' : colors.tint, alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:20 }}>🔧</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:15, fontWeight:'600', color:colors.text1 }}>Notification Debug</Text>
                <Text style={{ fontSize:12, color:colors.text3, marginTop:2 }}>On-device diagnostics for reminders</Text>
              </View>
              <Text style={{ fontSize:16, color:colors.text3 }}>›</Text>
            </TouchableOpacity>
          </>
        )}

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

        {/* Build marker — confirm a fresh deploy is live (Cloudflare can lag). */}
        <Text style={{ fontSize:11, color:colors.text3, textAlign:'center', marginTop:4 }}>
          Build {BUILD_ID}
        </Text>
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
