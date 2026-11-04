import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { getAdminReports } from '@/api';
import { Field, Button } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { AdminPage, AdminHeader, AdminSection, AdminPanel, AdminFilters, AdminStatus, AdminPager, AdminEmpty, AdminLoading, adminNumber, adminDate } from '@/components/admin/AdminUI';
const states=[{value:'',label:'Todos'},{value:'abierto',label:'Abiertos'},{value:'en_revision',label:'En revisión'},{value:'resuelto',label:'Resueltos'},{value:'descartado',label:'Descartados'}];
const cats=[{value:'',label:'Todas las categorías'},{value:'servicio',label:'Servicio'},{value:'pago',label:'Pago'},{value:'comportamiento',label:'Comportamiento'},{value:'seguridad',label:'Seguridad'},{value:'resena',label:'Reseña'},{value:'otro',label:'Otro'}];
export default function Reports(){
 const{palette}=useTheme();const[q,setQ]=useState('');const[state,setState]=useState('');const[cat,setCat]=useState('');const[page,setPage]=useState(1);const[data,setData]=useState<any>(null);const[loading,setLoading]=useState(false);const[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{setData(await getAdminReports({q,estado:state,categoria:cat,page}))}catch(e){setError(e instanceof Error?e.message:'No se pudieron cargar los reportes.')}finally{setLoading(false)}},[q,state,cat,page]);useEffect(()=>{void load()},[state,cat,page]);
 return <AdminPage>
  <AdminHeader eyebrow="MODERACIÓN Y SOPORTE" title="Centro de reportes" description="Investiga incidencias de servicio, seguridad y pagos, documenta decisiones y realiza seguimiento." action={<Button title="Actualizar" variant="secondary" icon="refresh-outline" onPress={()=>void load()} loading={loading}/>}/>
  <AdminPanel><Field label="Buscar incidencias" value={q} onChangeText={setQ} returnKeyType="search" onSubmitEditing={()=>{setPage(1);void load()}} placeholder="Folio, asunto o correo"/><AdminFilters items={states} value={state} onChange={v=>{setState(v);setPage(1)}}/><AdminFilters items={cats} value={cat} onChange={v=>{setCat(v);setPage(1)}}/><Button title="Aplicar búsqueda" onPress={()=>{setPage(1);void load()}} icon="search-outline" loading={loading}/></AdminPanel>
  <AdminSection title="Bandeja de incidencias" subtitle={data?`${adminNumber(data.total)} reportes encontrados`:'Ordenada por estado y fecha'}>
   {error?<AdminPanel><Text style={{color:palette.danger}}>{error}</Text><Button title="Reintentar" onPress={()=>void load()}/></AdminPanel>:null}
   {loading&&!data?<AdminLoading/>:data?.items?.length?data.items.map((r:any)=><AdminPanel key={r.id}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:9}}><Text style={{color:palette.text,fontWeight:'900',fontSize:16,flex:1}}>#{r.id} · {r.asunto}</Text><AdminStatus text={r.estado} tone={r.estado==='resuelto'?'success':r.estado==='abierto'?'danger':'warning'}/></View>
    <Text style={{color:palette.muted,fontSize:12}}>{r.categoria} · Reportado por {r.reportante_nombre}</Text>
    <Text style={{color:palette.text,fontSize:13,lineHeight:20}} numberOfLines={3}>{r.descripcion}</Text>
    <Text style={{color:palette.muted,fontSize:11}}>{adminDate(r.fecha_creacion)}</Text>
    <Button title="Abrir expediente del reporte" variant="secondary" icon="document-text-outline" onPress={()=>router.push(`/admin/report/${r.id}`)}/>
   </AdminPanel>):!loading?<AdminEmpty iconName="flag-outline" title="Sin incidencias" subtitle="No hay reportes que coincidan con estos filtros."/>:null}
   <AdminPager page={page} pages={Number(data?.pages)||1} onChange={setPage}/>
  </AdminSection>
 </AdminPage>;
}
