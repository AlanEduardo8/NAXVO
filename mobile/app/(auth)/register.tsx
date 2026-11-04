import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Brand, Button, Card, Field, PasswordField, Screen, Title } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { getCategories } from '@/api';
import { ApiError, apiUrl } from '@/api/client';
import type { Category } from '@/types/api';

export default function Register() {
  const params = useLocalSearchParams<{ tipo?: string }>();
  const initialRole = params.tipo === 'trabajador' ? 'trabajador' : 'cliente';
  const { palette } = useTheme();
  const { signUp } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<any>({
    tipo: initialRole,
    nombre: '', apellidos: '', email: '', password: '', telefono: '',
    profesion: '', especialidad: '', especialidades: '', anos_experiencia: '0',
    ciudad: '', estado: '', zona_servicio: '', biografia: '', experiencia: '',
  });

  useEffect(() => {
    getCategories().then(setCats).catch(e => console.warn('NAXVO categorías:', e));
  }, []);

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  async function submit() {
    if (busy) return;

    const cleanName = form.nombre.trim();
    const cleanEmail = form.email.trim();
    if (cleanName.length < 2) return setError('Escribe un nombre válido.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return setError('Escribe un correo electrónico válido.');
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) {
      return setError('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.');
    }
    if (form.tipo === 'trabajador') {
      if (form.profesion.trim().length < 2) return setError('Indica tu profesión u oficio principal.');
      if (!form.especialidad) return setError('Selecciona una categoría principal.');
      if (!/^\d+$/.test(form.anos_experiencia) || Number(form.anos_experiencia) > 70) return setError('Indica tus años de experiencia entre 0 y 70.');
      if (form.ciudad.trim().length < 2) return setError('Indica la ciudad donde trabajas.');
      if (form.estado.trim().length < 2) return setError('Indica el estado donde trabajas.');
      if (form.zona_servicio.trim().length < 2) return setError('Describe brevemente tu zona de servicio.');
    }

    setError('');
    setBusy(true);
    try {
      await signUp({ ...form, nombre: cleanName, email: cleanEmail });
      router.replace('/');
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'No fue posible crear la cuenta.';
      setError(message);
      console.warn('NAXVO registro:', e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver al inicio" onPress={() => router.replace('/(auth)/welcome')} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 44 }}><Ionicons name="arrow-back" size={20} color={palette.primary}/><Text style={{ color: palette.primary, fontWeight: '800' }}>Volver al inicio</Text></Pressable>
      <Brand />
      <Title subtitle="Elige cómo usarás NAXVO. Los trabajadores pueden entrar mientras su verificación está en revisión.">Crear cuenta</Title>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {['cliente', 'trabajador'].map(role => (
          <Pressable key={role} onPress={() => set('tipo', role)} style={{ flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: form.tipo === role ? palette.primary : palette.border, backgroundColor: form.tipo === role ? palette.surface2 : palette.surface }}>
            <Text style={{ textAlign: 'center', fontWeight: '900', color: palette.text }}>{role === 'cliente' ? 'Cliente' : 'Profesional'}</Text>
          </Pressable>
        ))}
      </View>

      <Field label="Nombre" value={form.nombre} onChangeText={v => set('nombre', v)} maxLength={100} />
      <Field label="Apellidos" value={form.apellidos} onChangeText={v => set('apellidos', v)} maxLength={100} />
      <Field label="Correo" value={form.email} onChangeText={v => set('email', v)} autoCapitalize="none" keyboardType="email-address" maxLength={100} />
      <Field label="Teléfono" value={form.telefono} onChangeText={v => set('telefono', v)} keyboardType="phone-pad" maxLength={20} />
      <PasswordField label="Contraseña" value={form.password} onChangeText={v => set('password', v)} placeholder="8+ caracteres, mayúscula, minúscula y número" returnKeyType="go" onSubmitEditing={() => form.tipo === 'cliente' && void submit()} />

      {form.tipo === 'trabajador' ? (
        <Card>
          <Text style={{ color: palette.text, fontWeight: '900', fontSize: 17 }}>Perfil profesional</Text>
          <Field label="Profesión u oficio" value={form.profesion} onChangeText={v => set('profesion', v)} placeholder="Ej. Electricista residencial" maxLength={120} />
          <Text style={{ color: palette.text, fontWeight: '700' }}>Categoría principal</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {cats.map(c => (
              <Pressable key={c.slug} onPress={() => set('especialidad', c.name)} style={{ borderWidth: 1, borderColor: form.especialidad === c.name ? palette.primary : palette.border, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: palette.surface2 }}>
                <Text style={{ color: palette.text }}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
          <Field label="Especialidades" value={form.especialidades} onChangeText={v => set('especialidades', v)} placeholder="Tableros, iluminación, instalaciones…" maxLength={600} />
          <Field label="Años de experiencia" value={form.anos_experiencia} onChangeText={v => set('anos_experiencia', v)} keyboardType="number-pad" />
          <Field label="Ciudad" value={form.ciudad} onChangeText={v => set('ciudad', v)} maxLength={100} />
          <Field label="Estado" value={form.estado} onChangeText={v => set('estado', v)} maxLength={100} />
          <Field label="Zona de servicio" value={form.zona_servicio} onChangeText={v => set('zona_servicio', v)} maxLength={180} />
          <Field label="Presentación profesional" value={form.biografia} onChangeText={v => set('biografia', v)} multiline maxLength={1200} />
          <Field label="Experiencia" value={form.experiencia} onChangeText={v => set('experiencia', v)} multiline returnKeyType="go" submitBehavior="submit" onSubmitEditing={() => void submit()} maxLength={2000} />
        </Card>
      ) : null}

      {error ? (
        <Card>
          <Text style={{ color: palette.danger, fontWeight: '800' }}>{error}</Text>
          {Platform.OS === 'web' ? (
            <Text selectable style={{ color: palette.muted, marginTop: 6, fontSize: 12 }}>Supabase: {apiUrl()}</Text>
          ) : null}
        </Card>
      ) : null}

      <Button title="Crear mi cuenta" icon="person-add-outline" onPress={submit} loading={busy} />
      <Text onPress={() => router.push('/(auth)/login')} style={{ color: palette.primary, textAlign: 'center', fontWeight: '800' }}>Ya tengo una cuenta</Text>
    </Screen>
  );
}
