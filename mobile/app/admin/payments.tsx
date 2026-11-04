import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { getAdminPayments } from '@/api';
import { Button, Field } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { AdminPage, AdminHeader, AdminSection, AdminPanel, AdminFilters, AdminStatus, AdminMetrics, AdminPager, AdminEmpty, AdminLoading, adminCurrency, adminNumber, adminDate } from '@/components/admin/AdminUI';
const states=[{value:'',label:'Todos'},{value:'pagado',label:'Pagados'},{value:'pendiente',label:'Pendientes'},{value:'procesando',label:'Procesando'},{value:'fallido',label:'Fallidos'},{value:'cancelado',label:'Cancelados'},{value:'reembolsado',label:'Reembolsados'}];
const methods=[{value:'',label:'Todos los métodos'},{value:'mercadopago',label:'Mercado Pago / tarjeta'},{value:'efectivo',label:'Efectivo'}];
export default function AdminPayments(){
 const {palette}=useTheme();const [q,setQ]=useState('');const[state,setState]=useState('');const[method,setMethod]=useState('');const[page,setPage]=useState(1);const[data,setData]=useState<any>(null);const[loading,setLoading]=useState(false);const[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{setData(await getAdminPayments({q,estado:state,metodo:method,page}))}catch(e){setError(e instanceof Error?e.message:'No se pudieron consultar los pagos.')}finally{setLoading(false)}},[q,state,method,page]);
 useEffect(()=>{void load()},[state,method,page]);const s=data?.stats??{},result=data?.result??{};
 return <AdminPage>
  <AdminHeader back eyebrow="CONTROL FINANCIERO" title="Transacciones y pagos" description="Seguimiento operativo de efectivo y cobros procesados por Mercado Pago. Sin acceso a datos bancarios de clientes." action={<Button title="Actualizar" variant="secondary" icon="refresh-outline" onPress={()=>void load()} loading={loading}/>}/>
  {data?<AdminMetrics items={[{label:'Registrado como pagado',value:adminCurrency(s.total_pagado),icon:'cash-outline',hint:'No equivale a utilidad neta'},{label:'Intentos registrados',value:adminNumber(s.intentos),icon:'receipt-outline'},{label:'Fallidos',value:adminNumber(s.fallidos),icon:'alert-circle-outline',tone:'warning'},{label:'Reembolsados',value:adminNumber(s.reembolsados),icon:'arrow-undo-outline',tone:'info'}]}/>:null}
  <AdminPanel><Field label="Buscar transacción" value={q} onChangeText={setQ} returnKeyType="search" onSubmitEditing={()=>{setPage(1);void load()}} placeholder="Referencia, ID de pago o solicitud"/><AdminFilters items={states} value={state} onChange={v=>{setState(v);setPage(1)}}/><AdminFilters items={methods} value={method} onChange={v=>{setMethod(v);setPage(1)}}/><Button title="Aplicar filtros" icon="search-outline" onPress={()=>{setPage(1);void load()}} loading={loading}/></AdminPanel>
  <AdminSection title="Historial de transacciones" subtitle={data?`${adminNumber(result.total)} registros coinciden con la búsqueda`:'Consulta segura del historial'}>
   {error?<AdminPanel><Text style={{color:palette.danger}}>{error}</Text><Button title="Reintentar" onPress={()=>void load()}/></AdminPanel>:null}
   {loading&&!data?<AdminLoading/>:result.items?.length?result.items.map((p:any)=><AdminPanel key={p.id}>
     <View style={{flexDirection:'row',justifyContent:'space-between',gap:9,alignItems:'flex-start'}}><View style={{flex:1,gap:4}}><Text style={{fontSize:21,color:palette.text,fontWeight:'900'}}>{adminCurrency(p.monto)}</Text><Text style={{color:palette.muted,fontSize:12}}>{p.servicio} · #{p.solicitud_id}</Text></View><AdminStatus text={p.estado} tone={p.estado==='pagado'?'success':p.estado==='fallido'?'danger':'warning'}/></View>
     <Text style={{color:palette.text,fontSize:13}}>{p.cliente_nombre}{p.trabajador_nombre?.trim()?` / ${p.trabajador_nombre}`:''}</Text>
     <Text style={{color:palette.muted,fontSize:12}}>Método: {p.metodo==='mercadopago'?'Mercado Pago (incluye tarjetas)':p.metodo} · {adminDate(p.fecha_creacion)}</Text>
     <Text style={{color:palette.muted,fontSize:11}} selectable numberOfLines={2}>Referencia: {p.external_reference}</Text>
     <Button title="Abrir solicitud vinculada" icon="open-outline" variant="secondary" onPress={()=>router.push(`/admin/request/${p.solicitud_id}`)}/>
   </AdminPanel>):!loading?<AdminEmpty iconName="card-outline" title="No hay transacciones" subtitle="Prueba con otro estado o método de pago."/>:null}
   <AdminPager page={page} pages={Number(result.pages)||1} onChange={setPage}/>
  </AdminSection>
 </AdminPage>;
}
