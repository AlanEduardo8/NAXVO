import { Pressable, Text, View } from 'react-native';
import { Avatar, Badge, Card } from './ui';
import { useTheme } from '@/context/ThemeContext';
import type { ServiceOffering } from '@/types/api';

function money(value?: number | null) {
  if (value == null) return null;
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

export function ServiceCard({ item, onPress }: { item: ServiceOffering; onPress?: () => void }) {
  const { palette } = useTheme();
  const p = item.profesional;
  return <Pressable disabled={!onPress} onPress={onPress}>
    <Card>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        {p ? <Avatar uri={p.foto_url} name={p.nombre} size={52}/> : null}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: palette.text, fontWeight: '900', fontSize: 18 }}>{item.titulo}</Text>
          <Text style={{ color: palette.muted }}>{item.categoria}{p ? ` · ${p.nombre}` : ''}</Text>
        </View>
        {p?.verificado ? <Badge text="Verificado" tone="success"/> : null}
      </View>
      {item.descripcion ? <Text numberOfLines={3} style={{ color: palette.muted, lineHeight: 20 }}>{item.descripcion}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {item.precio_desde != null ? <Text style={{ color: palette.text, fontWeight: '800' }}>Desde {money(item.precio_desde)}</Text> : null}
        {item.duracion_minutos ? <Text style={{ color: palette.muted }}>⏱ {item.duracion_minutos} min</Text> : null}
        <Text style={{ color: palette.muted }}>{item.modalidad === 'ambos' ? 'Domicilio o taller' : item.modalidad === 'taller' ? 'En taller' : 'A domicilio'}</Text>
      </View>
      {p ? <Text style={{ color: palette.text }}>★ {p.calificacion_promedio.toFixed(1)}{p.ciudad ? ` · ${p.ciudad}` : ''}</Text> : null}
    </Card>
  </Pressable>;
}
