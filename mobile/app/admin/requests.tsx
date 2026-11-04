import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { getAdminRequests } from '@/api';
import { Button, Field } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { AdminPage, AdminHeader, AdminSection, AdminPanel, AdminFilters, AdminStatus, AdminPager, AdminEmpty, AdminLoading, adminNumber, adminDate } from '@/components/admin/AdminUI';
const states=[{value:'',label:'Todas'},{value:'pendiente',label:'Pendientes'},{value:'asignado',label:'Asignadas'},{value:'en_curso',label:'En curso'},{value:'completado',label:'Completadas'},{value:'cancelado',label:'Canceladas'}];
const pay=[{value:'',label:'Cualquier pago'},{value:'pendiente',label:'Pago pendiente'},{value:'pagado',label:'Pagado'},{value:'fallido',label:'Fallido'}];
export default function AdminRequests(){
 const{palette}=useTheme();const[q,setQ]=useState('');const[state,setState]=useState('');const[payment,setPayment]=useState('');const[page,setPage]=useState(1);const[data,setData]=useState<any>(null);const[loading,setLoading]=useState(false);const[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{setData(await getAdminRequests({q,estado:state,pago:payment,page}))}catch(e){setError(e instanceof Error?e.message:'No se pudieron consultar las solicitudes.')}finally{setLoading(false)}},[q,state,payment,page]);
 useEffect(()=>{void load()},[state,payment,page]);
 return <AdminPage>
  <AdminHeader back eyebrow="OPERACIÓN" title="Solicitudes y servicios" description="Da seguimiento al ciclo completo de cada contratación, sus asignaciones y su estado de pago." action={<Button title="Actualizar" variant="secondary" icon="refresh-outline" onPress={()=>void load()} loading={loading}/>}/>
  <AdminPanel>
   <Field label="Buscar solicitud" value={q} onChangeText={setQ} returnKeyType="search" onSubmitEditing={()=>{setPage(1);void load()}} placeholder="Folio, servicio, cliente o profesional"/>
   <AdminFilters items={states} value={state} onChange={v=>{setState(v);setPage(1)}}/>
   <AdminFilters items={pay} value={payment} onChange={v=>{setPayment(v);setPage(1)}}/>
   <Button title="Aplicar búsqueda" icon="search-outline" onPress={()=>{setPage(1);void load()}} loading={loading}/>
  </AdminPanel>
  <AdminSection title="Expedientes de servicio" subtitle={data?`${adminNumber(data.total)} solicitudes encontradas`:'Últimos movimientos'}>
   {error?<AdminPanel><Text style={{color:palette.danger}}>{error}</Text><Button title="Reintentar" onPress={()=>void load()}/></AdminPanel>:null}
   {loading&&!data?<AdminLoading/>:data?.items?.length?data.items.map((r:any)=><AdminPanel key={r.id}>
    <View style={{flexDirection:'row',justifyContent:'space-between',gap:7,flexWrap:'wrap'}}><Text style={{color:palette.text,fontWeight:'900',fontSize:17,flex:1}}>#{r.id} · {r.servicio}</Text><AdminStatus text={r.estado} tone={r.estado==='completado'?'success':r.estado==='cancelado'?'danger':'info'}/></View>
    <Text style={{color:palette.text,fontSize:13}}>Cliente: <Text style={{fontWeight:'800'}}>{r.cliente_nombre}</Text></Text>
    <Text style={{color:palette.muted,fontSize:13}}>Profesional: {r.trabajador_nombre?.trim()||'Sin asignar'}</Text>
    <View style={{flexDirection:'row',alignItems:'center',gap:10,flexWrap:'wrap'}}><AdminStatus text={`Pago ${r.estado_pago}`} tone={r.estado_pago==='pagado'?'success':r.estado_pago==='fallido'?'danger':'warning'}/><Text style={{color:palette.muted,fontSize:12}}>{adminDate(r.fecha_creacion)}</Text></View>
    <Button title="Revisar expediente completo" icon="document-text-outline" variant="secondary" onPress={()=>router.push(`/admin/request/${r.id}`)}/>
   </AdminPanel>):!loading?<AdminEmpty iconName="clipboard-outline" title="Sin solicitudes" subtitle="Cambia los filtros para consultar otras operaciones."/>:null}
   <AdminPager page={page} pages={Number(data?.pages)||1} onChange={setPage}/>
  </AdminSection>
 </AdminPage>;
}
