import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [busy,     setBusy]     = useState(false);

  const inputStyle = {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14, color: colors.text1, fontSize: 15, marginBottom: 16,
  } as const;

  async function submit() {
    if (busy) return;
    setError(null);
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setBusy(true);
    const res = await signIn(email, password);
    setBusy(false);
    if (res.error) setError(res.error);
    // On success the auth gate redirects into the app automatically.
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.bg }}>
      <KeyboardAvoidingView style={{ flex:1, justifyContent:'center', paddingHorizontal:24 }}
        behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ alignItems:'center', marginBottom:36 }}>
          <Text style={{ fontSize:40, fontWeight:'800', color:colors.text1, letterSpacing:-1 }}>
            sayZay<Text style={{ color:colors.accent }}>.</Text>
          </Text>
          <Text style={{ fontSize:14, color:colors.text3, marginTop:6 }}>Welcome back</Text>
        </View>

        <FieldLabel label="Email" />
        <TextInput value={email} onChangeText={setEmail}
          placeholder="you@email.com" placeholderTextColor={colors.text3}
          autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
          textContentType="emailAddress" style={inputStyle} />

        <FieldLabel label="Password" />
        <TextInput value={password} onChangeText={setPassword}
          placeholder="••••••••" placeholderTextColor={colors.text3}
          secureTextEntry autoCapitalize="none" textContentType="password"
          onSubmitEditing={submit} returnKeyType="go" style={inputStyle} />

        {!!error && (
          <Text style={{ color:colors.rose, fontSize:13, marginBottom:12, marginTop:-4 }}>{error}</Text>
        )}

        <TouchableOpacity onPress={submit} disabled={busy}
          style={{ backgroundColor:colors.accent, borderRadius:14, padding:16,
            alignItems:'center', marginTop:4, opacity: busy ? 0.7 : 1 }}>
          {busy
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color:'#fff', fontSize:16, fontWeight:'700' }}>Log In</Text>}
        </TouchableOpacity>

        <Text style={{ color:colors.text3, fontSize:13, textAlign:'center', marginTop:22 }}>
          Accounts are currently invite-only.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize:11, fontWeight:'600', color:colors.text3,
      textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>{label}</Text>
  );
}
