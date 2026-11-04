import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { getRequests } from '@/api';
import { Button, Empty, Screen } from '@/components/ui';
import { RequestCard } from '@/components/RequestCard';
import { useTheme } from '@/context/ThemeContext';
import type { ServiceRequest } from '@/types/api';
type Filter='todas'|'activas'|'completadas'|'canceladas';
export default function Requests(){
  const {palette}=useTheme();const [items,setItems]=useState<ServiceRequest[]>([]);const [filter,setFilter]=useState<Filter>('todas');const [loading,setLoading]=useState(true);const [error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);try{setItems(await getRequests());setError('');}catch(e){setError(e instanceof Error?e.message:'No pudimos cargar tus solicitudes.');}finally{setLoading(false)}},[]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  const counts=useMemo(()=>({todas:items.length,activas:items.filter(x=>!['completado','cancelado'].includes(x.estado)).length,completadas:items.filter(x=>x.estado==='completado').length,canceladas:items.filter(x=>x.estado==='cancelado').length}),[items]);
  const filtered=useMemo(()=>items.filter(x=>filter==='todas'||(filter==='activas'?!['completado','cancelado'].includes(x.estado):x.estado===(filter==='completadas'?'completado':'cancelado'))),[items,filter]);
  return <Screen>
    <View style={{backgroundColor:palette.surface2,borderRadius:23,padding:20,gap:12}}><View style={{flexDirection:'row',gap:12,alignItems:'center'}}><View style={{padding:12,backgroundColor:palette.surface,borderRadius:14}}><Ionicons name="document-text-outline" color={palette.primary} size={28}/></View><View style={{flex:1}}><Text style={{fontWeight:'900',fontSize:25,color:palette.text}}>Mis solicitudes</Text><Text style={{color:palette.muted}}>Cada servicio, bajo control.</Text></View></View><Button title="Crear nueva solicitud" icon="add-circle-outline" onPress={()=>router.push('/request/new')}/></View>
    <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{([['todas','Todas'],['activas','En curso'],['completadas','Completadas'],['canceladas','Canceladas']] as [Filter,string][]).map(([key,label])=><Pressable key={key} onPress={()=>setFilter(key)} style={{backgroundColor:filter===key?palette.primary:palette.surface,borderWidth:1,borderColor:filter===key?palette.primary:palette.border,borderRadius:13,paddingVertical:12,paddingHorizontal:15,gap:4,minWidth:95}}><Text style={{color:filter===key?palette.primaryText:palette.muted,fontSize:12,fontWeight:'700'}}>{label}</Text><Text style={{color:filter===key?palette.primaryText:palette.text,fontSize:23,fontWeight:'900'}}>{counts[key]}</Text></Pressable>)}</View>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{fontSize:18,fontWeight:'900',color:palette.text}}>Servicios {filter==='todas'?'registrados':filter==='activas'?'en curso':filter}</Text><Pressable accessibilityLabel="Actualizar solicitudes" onPress={()=>void load()}><Ionicons name="refresh-outline" size={21} color={palette.primary}/></Pressable></View>
    {loading?<ActivityIndicator color={palette.primary}/>:error?<View style={{gap:12}}><Text style={{color:palette.danger}}>{error}</Text><Button title="Reintentar" onPress={()=>void load()}/></View>:filtered.length?filtered.map(item=><RequestCard key={item.id} item={item} onPress={()=>router.push(`/request/${item.id}`)}/>):<Empty icon="documents-outline" title="No hay solicitudes aquí" text="Cuando haya movimientos en esta etapa, podrás consultarlos desde esta sección."/>}
  </Screen>;
}
