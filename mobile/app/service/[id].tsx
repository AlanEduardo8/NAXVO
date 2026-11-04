import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getService } from '@/api';
import { ApiError } from '@/api/client';
import { Avatar, Badge, Button, Card, Screen, Title } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import type { ServiceOffering } from '@/types/api';

function money(value?: number | null) {
  return value == null ? null : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

export default function ServiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { palette } = useTheme();
  const [item, setItem] = useState<ServiceOffering | null>(null);
  useEffect(() => { getService(Number(id)).then(setItem).catch(e => { Alert.alert('Servicio', e instanceof ApiError ? e.message : 'No se pudo cargar.'); router.back(); }); }, [id]);
  if (!item) return <Screen><Text style={{ color: palette.muted }}>Cargando servicio…</Text></Screen>;
  const p = item.profesional;
  return <Screen>
    <Title subtitle={item.categoria}>{item.titulo}</Title>
    <Card>
      <Text style={{ color: palette.text, lineHeight: 22 }}>{item.descripcion || 'El profesional no agregó una descripción.'}</Text>
      {item.precio_desde != null ? <Text style={{ color: palette.text, fontWeight: '900', fontSize: 18 }}>Precio de referencia: desde {money(item.precio_desde)}</Text> : null}
      {item.duracion_minutos ? <Text style={{ color: palette.muted }}>Duración estimada: {item.duracion_minutos} minutos</Text> : null}
      <Text style={{ color: palette.muted }}>Modalidad: {item.modalidad === 'ambos' ? 'domicilio o taller' : item.modalidad}</Text>
      <Text style={{ color: palette.muted }}>El monto final se confirma mediante cotización antes de iniciar.</Text>
    </Card>
    {p ? <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar uri={p.foto_url} name={p.nombre} size={64}/>
        <View style={{ flex: 1, gap: 5 }}><Text style={{ color: palette.text, fontWeight: '900', fontSize: 18 }}>{p.nombre}</Text><Text style={{ color: palette.muted }}>{p.profesion || p.especialidad}</Text><Text style={{ color: palette.text }}>★ {p.calificacion_promedio.toFixed(1)} · {p.total_servicios} servicios</Text></View>
        {p.verificado ? <Badge text="Verificado" tone="success"/> : null}
      </View>
      {p.zona_servicio || p.ciudad ? <Text style={{ color: palette.muted }}>📍 {p.zona_servicio || p.ciudad}</Text> : null}
      <Button title="Ver perfil profesional" variant="secondary" icon="person-outline" onPress={() => router.push(`/professional/${p.id}`)}/>
    </Card> : null}
    <Button title="Solicitar este servicio" icon="clipboard-outline" disabled={!p?.disponible} onPress={() => router.push({ pathname: '/request/new', params: { workerId: String(item.trabajador_id), service: item.categoria, serviceOfferingId: String(item.id), serviceTitle: item.titulo } })}/>
    {!p?.disponible ? <Text style={{ color: palette.warning, textAlign: 'center' }}>Este profesional no está recibiendo nuevas solicitudes en este momento.</Text> : null}
    
    <Button title="Volver" variant="ghost" icon="arrow-back" onPress={() => router.back()}/>
  </Screen>;
}
