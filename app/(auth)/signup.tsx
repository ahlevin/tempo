import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [busy,     setBusy]     = useState(false);

  async function submit() {
    if (busy) return;
    setError(null);
    if (!email.trim() || !password) { setError('Enter your email and a password.'); return; }
    if (password.length < 6)        { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm)       { setError('Passwords do not match.'); return; }
    setBusy(true);
    const res = await signUp(email, password);
    setBusy(false);
    if (res.error) setError(res.error);
    // Email confirmation is off, so success signs the user in and the gate redirects.
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:Colors.bg }}>
      <KeyboardAvoidingView style={{ flex:1, justifyContent:'center', paddingHorizontal:24 }}
        behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ alignItems:'center', marginBottom:36 }}>
          <Text style={{ fontSize:40, fontWeight:'800', color:Colors.text1, letterSpacing:-1 }}>
            sayZay<Text style={{ color:Colors.accent }}>.</Text>
          </Text>
          <Text style={{ fontSize:14, color:Colors.text3, marginTop:6 }}>Create your account</Text>
        </View>

        <FieldLabel label="Email" />
        <TextInput value={email} onChangeText={setEmail}
          placeholder="you@email.com" placeholderTextColor={Colors.text3}
          autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
          textContentType="emailAddress" style={inputStyle} />

        <FieldLabel label="Password" />
        <TextInput value={password} onChangeText={setPassword}
          placeholder="At least 6 characters" placeholderTextColor={Colors.text3}
          secureTextEntry autoCapitalize="none" textContentType="newPassword" style={inputStyle} />

        <FieldLabel label="Confirm Password" />
        <TextInput value={confirm} onChangeText={setConfirm}
          placeholder="Re-enter password" placeholderTextColor={Colors.text3}
          secureTextEntry autoCapitalize="none" textContentType="newPassword"
          onSubmitEditing={submit} returnKeyType="go" style={inputStyle} />

        {!!error && (
          <Text style={{ color:Colors.rose, fontSize:13, marginBottom:12, marginTop:-4 }}>{error}</Text>
        )}

        <TouchableOpacity onPress={submit} disabled={busy}
          style={{ backgroundColor:Colors.accent, borderRadius:14, padding:16,
            alignItems:'center', marginTop:4, opacity: busy ? 0.7 : 1 }}>
          {busy
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color:'#fff', fontSize:16, fontWeight:'700' }}>Create Account</Text>}
        </TouchableOpacity>

        <View style={{ flexDirection:'row', justifyContent:'center', marginTop:22, gap:5 }}>
          <Text style={{ color:Colors.text3, fontSize:14 }}>Already have an account?</Text>
          <Link href="/login" style={{ color:Colors.accent, fontSize:14, fontWeight:'700' }}>
            Log in
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const inputStyle = {
  backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.1)',
  borderRadius:12, padding:14, color:Colors.text1, fontSize:15, marginBottom:16,
} as const;

function FieldLabel({ label }: { label: string }) {
  return (
    <Text style={{ fontSize:11, fontWeight:'600', color:Colors.text3,
      textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>{label}</Text>
  );
}
