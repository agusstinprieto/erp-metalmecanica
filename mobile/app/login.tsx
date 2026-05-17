import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showPwd,  setShowPwd]  = useState(false);

  const login = async () => {
    if (!email || !password) { setError('Ingresa email y contraseña'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) setError(err.message);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.root}>
      <View style={s.card}>
        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoIcon}>
            <Ionicons name="hardware-chip" size={32} color={colors.accent} />
          </View>
          <Text style={s.logoText}>McVill ERP</Text>
          <Text style={s.logoSub}>Sistema de Gestión Industrial</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          <View style={s.field}>
            <Text style={s.label}>CORREO</Text>
            <View style={s.inputWrap}>
              <Ionicons name="mail-outline" size={16} color={colors.muted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="usuario@mcvill.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>CONTRASEÑA</Text>
            <View style={s.inputWrap}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.muted} style={s.inputIcon} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPwd}
                onSubmitEditing={login}
              />
              <TouchableOpacity onPress={() => setShowPwd(v => !v)} style={s.eyeBtn}>
                <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={14} color={colors.danger} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={s.btn} onPress={login} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>INGRESAR AL SISTEMA</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', paddingHorizontal: 24 },
  card:      { backgroundColor: colors.card, borderRadius: 24, padding: 32, borderWidth: 1, borderColor: colors.border },
  logoWrap:  { alignItems: 'center', marginBottom: 32 },
  logoIcon:  { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.accentDim, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: colors.accent + '30' },
  logoText:  { fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: 1 },
  logoSub:   { fontSize: 11, color: colors.muted, marginTop: 4, letterSpacing: 0.5 },
  form:      { gap: 16 },
  field:     { gap: 6 },
  label:     { fontSize: 9, fontWeight: '900', color: colors.muted, letterSpacing: 2 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 48 },
  inputIcon: { marginRight: 10 },
  input:     { flex: 1, color: colors.text, fontSize: 14 },
  eyeBtn:    { padding: 4 },
  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.danger + '15', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.danger + '40' },
  errorText: { color: colors.danger, fontSize: 12, flex: 1 },
  btn:       { backgroundColor: colors.accent, borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnText:   { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 2 },
});
