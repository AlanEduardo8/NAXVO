import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { getAdminSystem } from '@/api';
import { Button } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { AdminPage, AdminHeader, AdminSection, AdminPanel, AdminMetrics, AdminRow, AdminStatus, AdminLoading, AdminEmpty, adminDate } from '@/components/admin/AdminUI';
export default function AdminSystem(){
 const{palette}=useTheme();const[data,setData]=useState<any>(null);const[loading,setLoading]=useState(false);const[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{setData(await getAdminSystem())}catch(e){setError(e instanceof Error?e.message:'No se pudo obtener el diagnóstico.')}finally{setLoading(false)}},[]);useEffect(()=>{void load()},[load]);
 const checks=data?.checks??[];const good=checks.filter((x:any)=>x.ok).length;const events=data?.security_events??[];
 return <AdminPage><AdminHeader back eyebrow="INFRAESTRUCTURA Y SEGURIDAD" title="Estado del sistema" description="Diagnóstico de las comprobaciones disponibles del backend y el historial reciente de eventos de seguridad." action={<Button title="Actualizar" variant="secondary" icon="refresh-outline" loading={loading} onPress={()=>void load()}/>}/>
  {data?<AdminMetrics items={[{label:'Comprobaciones correctas',value:`${good}/${checks.length}`,icon:'checkmark-circle-outline',tone:good===checks.length?'success':'warning'},{label:'Requieren revisión',value:checks.length-good,icon:'alert-circle-outline',tone:checks.length-good?'warning':'success'},{label:'Eventos recientes',value:events.length,icon:'shield-outline',hint:'Eventos devueltos por la API'}]}/>:null}
  {error?<AdminPanel><Text style={{color:palette.danger}}>{error}</Text><Button title="Reintentar" onPress={()=>void load()}/></AdminPanel>:null}
  {loading&&!data?<AdminLoading/>:null}
  <AdminSection title="Comprobaciones del backend" subtitle="Resultados expuestos por el endpoint de diagnóstico autorizado">
    {checks.length?<AdminPanel>{checks.map((c:any,i:number)=><AdminRow key={`${c.name}-${i}`} iconName={c.ok?'checkmark-circle-outline':'alert-circle-outline'} title={c.name||'Comprobación'} description={c.value!=null?String(c.value):''} right={<AdminStatus text={c.ok?'Correcto':'Revisar'} tone={c.ok?'success':'warning'}/>}/>)}</AdminPanel>:!loading?<AdminEmpty iconName="pulse-outline" title="Sin comprobaciones" subtitle="El backend todavía no ha devuelto un diagnóstico."/>:null}
  </AdminSection>
  <AdminSection title="Seguridad y accesos" subtitle="Registro reciente de eventos; no es un monitoreo en tiempo real">
   {events.length?<AdminPanel>{events.slice(0,40).map((e:any)=><AdminRow key={e.id} iconName="lock-closed-outline" title={`${e.tipo?.replaceAll('_',' ')} · ${e.resultado}`} description={e.detalle||e.usuario_nombre||'Evento de sistema'} meta={`${e.usuario_nombre||'Sin usuario asociado'} · ${adminDate(e.fecha)}`}/>)}</AdminPanel>:!loading?<AdminEmpty iconName="lock-closed-outline" title="Sin eventos recientes" subtitle="No hay eventos de seguridad en la respuesta."/>:null}
  </AdminSection>
  <AdminPanel><Text style={{color:palette.muted,fontSize:12,lineHeight:19}}>Este panel muestra únicamente los datos devueltos por la API de NAXVO. No garantiza por sí mismo disponibilidad de los servicios externos, ejecución de webhooks ni conciliación de pagos.</Text></AdminPanel>
 </AdminPage>;
}
