import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { Card, Badge } from './ui';
import { useTheme } from '@/context/ThemeContext';
import type { ServiceRequest } from '@/types/api';

export function RequestCard({item,actions,onPress}:{item:ServiceRequest;actions?:ReactNode;onPress?:()=>void}){
  const {palette}=useTheme();
  const tone=item.estado==='completado'?'success':item.estado==='cancelado'?'danger':item.urgencia==='emergencia'?'warning':'info';
  const finalState=item.finalizacion_estado;
  const finalBadge=finalState==='solicitada'
    ? <Badge text="Esperando revisión" tone="warning"/>
    : finalState==='correccion_solicitada'
      ? <Badge text="Corrección solicitada" tone="danger"/>
      : null;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Ver solicitud de ${item.servicio}`} disabled={!onPress} onPress={onPress}>
    <Card>
      <View style={{flexDirection:'row',justifyContent:'space-between',gap:10,alignItems:'center'}}>
        <Text style={{color:palette.text,fontWeight:'900',fontSize:17,flex:1}}>{item.servicio}</Text>
        <Badge text={item.estado||item.urgencia} tone={tone as any}/>
      </View>
      {finalBadge?<View style={{alignItems:'flex-start'}}>{finalBadge}</View>:null}
      <Text numberOfLines={3} style={{color:palette.muted,lineHeight:20}}>{item.descripcion}</Text>
      {item.ciudad?<Text style={{color:palette.text}}><Ionicons name="location-outline" size={15} color={palette.primary}/> {item.ciudad}{item.distancia_km!=null?` · ${item.distancia_km} km`:''}</Text>:null}
      {item.fecha_preferida?<Text style={{color:palette.text}}><Ionicons name="calendar-outline" size={15} color={palette.primary}/> {item.fecha_preferida} {item.hora_preferida||''}</Text>:null}
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopWidth:1,borderColor:palette.border,paddingTop:11}}><Text style={{color:palette.muted,fontSize:12}}>Solicitud #{item.id}</Text><View style={{flexDirection:'row',alignItems:'center',gap:4}}><Text style={{color:palette.primary,fontWeight:'800'}}>Ver detalles</Text><Ionicons name="chevron-forward" size={18} color={palette.primary}/></View></View>
      {actions}
    </Card>
  </Pressable>;
}
