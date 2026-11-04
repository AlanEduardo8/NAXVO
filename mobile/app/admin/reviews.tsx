import { useCallback, useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { getAdminReviews, moderateAdminReview } from '@/api';
import { Button, Field } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { AdminPage, AdminHeader, AdminPanel, AdminSection, AdminFilters, AdminStatus, AdminPager, AdminEmpty, AdminLoading, adminConfirm, adminNumber, adminDate } from '@/components/admin/AdminUI';
const visibility=[{value:'',label:'Todas'},{value:'visible',label:'Visibles'},{value:'oculta',label:'Ocultas'}];
export default function AdminReviews(){
 const{palette}=useTheme();const[q,setQ]=useState('');const[filter,setFilter]=useState('');const[page,setPage]=useState(1);const[data,setData]=useState<any>(null);const[busy,setBusy]=useState<number|null>(null);const[loading,setLoading]=useState(false);const[error,setError]=useState('');const[reasons,setReasons]=useState<Record<number,string>>({});
 const load=useCallback(async()=>{setLoading(true);setError('');try{setData(await getAdminReviews({q,visibilidad:filter,page}))}catch(e){setError(e instanceof Error?e.message:'No se pudo consultar la moderación.')}finally{setLoading(false)}},[q,filter,page]);useEffect(()=>{void load()},[filter,page]);
 const decide=(id:number,show:boolean)=>{if(!show&&!reasons[id]?.trim()){Alert.alert('Motivo requerido','Para ocultar una reseña debes indicar el motivo.');return;}adminConfirm(show?'Restaurar opinión':'Ocultar opinión','Esta acción modifica la visibilidad pública de la reseña y se registrará en auditoría.',async()=>{setBusy(id);try{await moderateAdminReview(id,show,reasons[id]??'');await load()}catch(e){Alert.alert('Moderación',e instanceof Error?e.message:'No se pudo completar.')}finally{setBusy(null)}},!show)};
 return <AdminPage>
  <AdminHeader back eyebrow="CONFIANZA Y CONTENIDO" title="Moderación de reseñas" description="Supervisa opiniones y gestiona su visibilidad con justificación. Evita eliminar contenido legítimo sin revisión." action={<Button title="Actualizar" variant="secondary" icon="refresh-outline" loading={loading} onPress={()=>void load()}/>}/>
  <AdminPanel><Field label="Buscar opiniones" value={q} onChangeText={setQ} returnKeyType="search" onSubmitEditing={()=>{setPage(1);void load()}} placeholder="Comentario, cliente o profesional"/><AdminFilters items={visibility} value={filter} onChange={v=>{setFilter(v);setPage(1)}}/><Button title="Buscar" icon="search-outline" onPress={()=>{setPage(1);void load()}} loading={loading}/></AdminPanel>
  <AdminSection title="Historial de opiniones" subtitle={data?`${adminNumber(data.total)} reseñas`:'Revisión y restauración'}>
   {error?<AdminPanel><Text style={{color:palette.danger}}>{error}</Text></AdminPanel>:null}
   {loading&&!data?<AdminLoading/>:data?.items?.length?data.items.map((r:any)=><AdminPanel key={r.id}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:9}}><Text style={{color:palette.text,fontSize:16,fontWeight:'900',flex:1}}>{Number(r.puntuacion)||0} / 5 · {r.servicio}</Text><AdminStatus text={Number(r.visible)===1?'Visible':'Oculta'} tone={Number(r.visible)===1?'success':'warning'}/></View>
    <Text style={{color:palette.muted,fontSize:12}}>{r.cliente_nombre} / {r.trabajador_nombre} · {adminDate(r.fecha)}</Text>
    <Text style={{color:palette.text,lineHeight:21}}>{r.comentario||'Sin comentario escrito'}</Text>
    {Number(r.visible)===1?<><Field label="Justificación de la moderación" value={reasons[r.id]??''} onChangeText={v=>setReasons(p=>({...p,[r.id]:v}))} placeholder="Razón específica para ocultar la reseña" multiline/><Button title="Ocultar reseña" icon="eye-off-outline" variant="danger" loading={busy===r.id} onPress={()=>decide(r.id,false)}/></>:<Button title="Restaurar reseña" icon="eye-outline" loading={busy===r.id} onPress={()=>decide(r.id,true)}/>}
   </AdminPanel>):!loading?<AdminEmpty iconName="star-outline" title="No hay reseñas" subtitle="Cambia los filtros para consultar el historial."/>:null}
   <AdminPager page={page} pages={Number(data?.pages)||1} onChange={setPage}/>
  </AdminSection>
 </AdminPage>;
}
