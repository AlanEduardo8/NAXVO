import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Brand, Button, Card, Field, PasswordField, Screen, Title } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { ApiError, apiUrl } from '@/api/client';
import { useTheme } from '@/context/ThemeContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const { palette } = useTheme();

  async function submit() {
    if (busy) return;
    const cleanEmail = email.trim();
    if (!cleanEmail || !pw) {
      setError('Escribe tu correo y contraseña.');
      return;
    }

    setError('');
    setBusy(true);
    try {
      await signIn(cleanEmail, pw);
      router.replace('/');
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'No fue posible iniciar sesión.';
      setError(message);
      console.warn('NAXVO login:', e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver al inicio" onPress={() => router.replace('/(auth)/welcome')} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 44 }}><Ionicons name="arrow-back" size={20} color={palette.primary}/><Text style={{ color: palette.primary, fontWeight: '800' }}>Volver al inicio</Text></Pressable>
      <Brand />
      <Title subtitle="Usa la misma cuenta de NAXVO web.">Bienvenido de nuevo</Title>
      <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="tu@correo.com" returnKeyType="next" />
      <PasswordField label="Contraseña" value={pw} onChangeText={setPw} placeholder="••••••••" returnKeyType="go" onSubmitEditing={() => void submit()} />

      {error ? (
        <Card>
          <Text style={{ color: palette.danger, fontWeight: '800' }}>{error}</Text>
          {Platform.OS === 'web' ? (
            <Text selectable style={{ color: palette.muted, marginTop: 6, fontSize: 12 }}>
              Supabase: {apiUrl()}
            </Text>
          ) : null}
        </Card>
      ) : null}

      <Button title="Entrar" icon="log-in-outline" onPress={submit} loading={busy} />
      <View>
        <Text onPress={() => router.push('/(auth)/register')} style={{ color: palette.primary, textAlign: 'center', fontWeight: '800' }}>
          ¿No tienes cuenta? Regístrate
        </Text>
      </View>
    </Screen>
  );
}
