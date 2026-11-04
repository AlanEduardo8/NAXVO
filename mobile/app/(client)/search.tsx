import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { getCategories, getServices, getWorkers } from '@/api';
import { Button, Empty, Field, Screen, Title } from '@/components/ui';
import { WorkerCard } from '@/components/WorkerCard';
import { ServiceCard } from '@/components/ServiceCard';
import { useTheme } from '@/context/ThemeContext';
import type { Category, ServiceOffering, Worker } from '@/types/api';

type Mode = 'workers' | 'services';
export default function Search() {
  const params = useLocalSearchParams<{ q?: string; mode?: string }>();
  const initial = typeof params.q === 'string' ? params.q : '';
  const initialMode: Mode = params.mode === 'services' ? 'services' : 'workers';
  const { palette } = useTheme();
  const [q, setQ] = useState(initial);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (query: string, selectedMode: Mode, selectedCategory: string) => {
    setLoading(true); setError('');
    try {
      if (selectedMode === 'services') {
        const s = new URLSearchParams();
        if (query.trim()) s.set('q', query.trim());
        if (selectedCategory) s.set('categoria', selectedCategory);
        setServices(await getServices(s.toString()));
      } else {
        setWorkers(await getWorkers(query.trim() ? `q=${encodeURIComponent(query.trim())}` : ''));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los resultados.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { getCategories().then(setCategories).catch(() => undefined); }, []);
  useEffect(() => {
    setQ(initial);
    setMode(initialMode);
    setCategory('');
    void load(initial, initialMode, '');
  }, [initial, initialMode, load]);

  function changeMode(value: Mode) { setMode(value); setCategory(''); void load(q, value, ''); }
  function changeCategory(value: string) { const next = category === value ? '' : value; setCategory(next); void load(q, 'services', next); }
  return <Screen>
    <Title subtitle="Explora profesionales verificados y servicios publicados. Selecciona una opción para conocer sus detalles.">Encuentra tu servicio</Title>
    <View style={{ flexDirection: 'row', backgroundColor: palette.surface2, borderRadius: 14, padding: 4, gap: 6 }}>
      {([{ key: 'workers', label: 'Profesionales', icon: 'people-outline' }, { key: 'services', label: 'Servicios', icon: 'construct-outline' }] as const).map(tab =>
        <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: mode === tab.key }} onPress={() => changeMode(tab.key)} style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderRadius: 11, backgroundColor: mode === tab.key ? palette.primary : 'transparent' }}>
          <Ionicons name={tab.icon} size={18} color={mode === tab.key ? palette.primaryText : palette.text}/><Text style={{ color: mode === tab.key ? palette.primaryText : palette.text, fontWeight: '800' }}>{tab.label}</Text>
        </Pressable>)}
    </View>
    <Field label="Buscar por palabra clave" value={q} onChangeText={setQ} onSubmitEditing={() => void load(q, mode, category)} placeholder="Plomería, instalación, Puebla…" returnKeyType="search"/>
    {mode === 'services' ? <View style={{ gap: 7 }}><Text style={{ color: palette.text, fontWeight: '800' }}>Categoría</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>{categories.map(c => <Pressable key={c.slug} onPress={() => changeCategory(c.name)} style={{ borderWidth: 1, borderColor: category === c.name ? palette.primary : palette.border, backgroundColor: category === c.name ? palette.surface2 : palette.surface, borderRadius: 22, paddingHorizontal: 13, paddingVertical: 9 }}><Text style={{ color: category === c.name ? palette.primary : palette.text, fontWeight: '700' }}>{c.name}</Text></Pressable>)}</ScrollView></View> : null}
    <Button title="Buscar" icon="search-outline" onPress={() => void load(q, mode, category)}/>
    {loading ? <ActivityIndicator size="large" color={palette.primary}/> : error ? <View style={{ gap: 10 }}><Text style={{ color: palette.danger }}>{error}</Text><Button title="Reintentar" variant="secondary" onPress={() => void load(q, mode, category)}/></View> : <>
      <Text style={{ color: palette.muted, fontWeight: '700' }}>{mode === 'services' ? `${services.length} servicios publicados` : `${workers.length} profesionales encontrados`}</Text>
      {mode === 'services' ? services.length ? services.map(item => <ServiceCard key={item.id} item={item} onPress={() => router.push(`/service/${item.id}`)}/>) : <Empty icon="storefront-outline" title="Aún no hay servicios publicados" text="Prueba otra categoría o busca un profesional. Los servicios aparecen cuando los trabajadores verificados los publican."/> : workers.length ? workers.map(worker => <WorkerCard key={worker.id} worker={worker} onPress={() => router.push(`/professional/${worker.id}`)}/>) : <Empty icon="search-outline" title="Sin profesionales encontrados" text="Prueba otro nombre, especialidad o ubicación."/>}
    </>}
  </Screen>;
}
