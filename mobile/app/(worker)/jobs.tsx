import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getRequests } from '@/api';
import { useTheme } from '@/context/ThemeContext';
import { Empty, Screen } from '@/components/ui';
import { RequestCard } from '@/components/RequestCard';
import { WorkerHero, WorkerMetric, WorkerSection } from '@/components/WorkerPanels';
import type { ServiceRequest } from '@/types/api';

type Filter='todos'|'activos'|'completados';
export default function Jobs(){
  const {palette}=useTheme();
  const [items,setItems]=useState<ServiceRequest[]>([]);
  const [filter,setFilter]=useState<Filter>('activos');
  const [search,setSearch]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const load=useCallback(async()=>{setError('');try{setItems(await getRequests())}catch(e){setError(e instanceof Error?e.message:'No se pudieron cargar los trabajos.')}finally{setLoading(false)}},[]);
  useFocusEffect(useCallback(()=>{void load()},[load]));
  const active=items.filter(x=>!['completado','cancelado'].includes(x.estado));
  const completed=items.filter(x=>x.estado==='completado');
  const filtered=useMemo(()=>items.filter(x=>(filter==='todos'||(filter==='activos'?!['completado','cancelado'].includes(x.estado):x.estado==='completado'))&&`${x.servicio} ${x.descripcion} ${x.id}`.toLowerCase().includes(search.trim().toLowerCase())),[items,filter,search]);
  return <Screen>
    <WorkerHero eyebrow="Organización de servicios" title="Mis trabajos" description="Consulta solicitudes asignadas, revisa sus avances y administra tus servicios desde un mismo lugar." icon="construct-outline"/>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>
      <WorkerMetric label="Mis solicitudes" value={items.length} icon="documents-outline"/>
      <WorkerMetric label="En curso" value={active.length} icon="time-outline"/>
      <WorkerMetric label="Terminados" value={completed.length} icon="checkmark-circle-outline"/>
    </View>
    <WorkerSection title="Organiza tus solicitudes" subtitle="Filtra por estado o busca un servicio" action={{label:'Actualizar',onPress:()=>void load()}}>
      <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{([{id:'activos',name:'En curso',count:active.length},{id:'todos',name:'Todos',count:items.length},{id:'completados',name:'Completados',count:completed.length}] as const).map(t=><Pressable key={t.id} accessibilityRole="button" onPress={()=>setFilter(t.id)} style={{paddingHorizontal:15,paddingVertical:11,borderRadius:13,borderWidth:1,borderColor:filter===t.id?palette.primary:palette.border,backgroundColor:filter===t.id?palette.surface2:palette.surface}}><Text style={{color:filter===t.id?palette.primary:palette.text,fontWeight:'800'}}>{t.name} · {t.count}</Text></Pressable>)}</View>
      <View style={{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:14,backgroundColor:palette.surface,borderColor:palette.border,borderWidth:1}}><Ionicons name="search-outline" size={21} color={palette.primary}/><TextInput accessibilityLabel="Buscar en mis trabajos" value={search} onChangeText={setSearch} placeholder="Busca por servicio, descripción o folio" placeholderTextColor={palette.muted} style={{color:palette.text,flex:1,fontSize:14}} returnKeyType="search"/></View>
    </WorkerSection>
    {error?<Text style={{color:palette.danger}}>{error}</Text>:null}
    {loading?<ActivityIndicator color={palette.primary}/>:filtered.length?filtered.map(x=><RequestCard key={x.id} item={x} onPress={()=>router.push(`/request/${x.id}`)}/>):<Empty icon="document-text-outline" title="No hay trabajos que mostrar" text="Prueba otro filtro o revisa las oportunidades disponibles."/>}
    <Pressable accessibilityRole="button" onPress={()=>router.push('/(worker)/opportunities')} style={{borderWidth:1,borderColor:palette.border,borderRadius:15,padding:16,flexDirection:'row',gap:10,alignItems:'center',backgroundColor:palette.surface2}}><Ionicons name="briefcase-outline" color={palette.primary} size={23}/><Text style={{color:palette.text,fontWeight:'800',flex:1}}>Explorar oportunidades de trabajo</Text><Ionicons name="arrow-forward-outline" size={19} color={palette.primary}/></Pressable>
  </Screen>;
}
