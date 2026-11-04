import { useCallback, useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getAdminReport, resolveAdminReport } from '@/api';
import { Field, Button } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { AdminPage, AdminHeader, AdminSection, AdminPanel, AdminStatus, AdminRow, AdminLoading, adminConfirm, adminDate } from '@/components/admin/AdminUI';
export default function AdminReport(){
 const{id}=useLocalSearchParams<{id:string}>();const{palette}=useTheme();const[r,setR]=useState<any>(null);const[resolution,setResolution]=useState('');const[busy,setBusy]=useState(false);const[loading,setLoading]=useState(true);const[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{const x=await getAdminReport(Number(id));setR(x);setResolution(x.resolucion??'')}catch(e){setError(e instanceof Error?e.message:'No se pudo cargar el reporte.')}finally{setLoading(false)}},[id]);useEffect(()=>{void load()},[load]);
 const decide=(state:'en_revision'|'resuelto'|'descartado')=>{
  if(state!=='en_revision'&&!resolution.trim()){Alert.alert('Resolución requerida','Documenta la resolución antes de cerrar o descartar el reporte.');return;}
  adminConfirm('Actualizar reporte',`Se cambiará el estado del reporte #${id} a ${state.replaceAll('_',' ')}.`,async()=>{setBusy(true);try{await resolveAdminReport(Number(id),state,resolution.trim());await load();Alert.alert('Reporte','Decisión registrada.')}catch(e){Alert.alert('Reporte',e instanceof Error?e.message:'No se pudo actualizar.')}finally{setBusy(false)}},state==='descartado');
 };
 return <AdminPage><AdminHeader back eyebrow="EXPEDIENTE DE INCIDENCIA" title={r?.asunto||'Reporte'} description={`Reporte administrativo #${id}`} action={<Button title="Actualizar" variant="secondary" icon="refresh-outline" onPress={()=>void load()} loading={loading}/>}/>
  {error?<AdminPanel><Text style={{color:palette.danger}}>{error}</Text><Button title="Reintentar" onPress={()=>void load()}/></AdminPanel>:null}
  {loading&&!r?<AdminLoading/>:r?<>
   <AdminPanel><AdminStatus text={r.estado} tone={r.estado==='resuelto'?'success':r.estado==='abierto'?'danger':'warning'}/><Text style={{color:palette.muted,fontSize:12}}>Categoría: {r.categoria} · {adminDate(r.fecha_creacion)}</Text><Text style={{color:palette.text,lineHeight:22}}>{r.descripcion}</Text></AdminPanel>
   <AdminSection title="Participantes y referencias" subtitle="Datos de las cuentas vinculadas"><AdminPanel>
    <AdminRow iconName="person-outline" title={r.reportante_nombre||'Reportante'} description={r.reportante_email||'Sin correo'}/>
    {r.reportado_nombre?<AdminRow iconName="person-remove-outline" title={r.reportado_nombre} description={r.reportado_email||'Cuenta reportada'}/>:null}
    {r.solicitud_id?<AdminRow iconName="receipt-outline" title={`Solicitud #${r.solicitud_id}`} description="Abrir expediente del servicio" onPress={()=>router.push(`/admin/request/${r.solicitud_id}`)}/>:null}
   </AdminPanel></AdminSection>
   <AdminSection title="Resolución administrativa" subtitle="Deja constancia de la revisión antes de cerrar una incidencia"><AdminPanel>
    <Field label="Notas y resolución" value={resolution} onChangeText={setResolution} multiline placeholder="Hechos revisados, evidencias y decisión"/>
    <Button title="Poner en revisión" variant="secondary" icon="search-outline" disabled={busy} onPress={()=>decide('en_revision')}/>
    <Button title="Resolver reporte" icon="checkmark-circle-outline" disabled={busy} onPress={()=>decide('resuelto')}/>
    <Button title="Descartar con justificación" variant="danger" icon="close-circle-outline" disabled={busy} onPress={()=>decide('descartado')}/>
   </AdminPanel></AdminSection>
  </>:null}
 </AdminPage>;
}
