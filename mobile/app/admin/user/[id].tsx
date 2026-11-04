import { useCallback, useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getAdminUser, setAdminUserStatus } from '@/api';
import { Avatar, Button, Field } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { AdminPage, AdminHeader, AdminSection, AdminPanel, AdminStatus, AdminMetrics, AdminRow, AdminEmpty, AdminLoading, adminConfirm, adminDate } from '@/components/admin/AdminUI';
export default function AdminUser(){
 const{id}=useLocalSearchParams<{id:string}>();const{palette}=useTheme();const[data,setData]=useState<any>(null);const[reason,setReason]=useState('');const[busy,setBusy]=useState(false);const[loading,setLoading]=useState(true);const[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{setData(await getAdminUser(Number(id)))}catch(e){setError(e instanceof Error?e.message:'No se pudo obtener el expediente.')}finally{setLoading(false)}},[id]);useEffect(()=>{void load()},[load]);
 const change=(state:'activo'|'suspendido')=>{
  if(state==='suspendido'&&!reason.trim()){Alert.alert('Motivo requerido','Especifica por qué se suspenderá esta cuenta.');return;}
  adminConfirm(state==='activo'?'Reactivar usuario':'Suspender usuario',`Se cambiará el estado de la cuenta #${id}. Esta acción puede impedir su acceso a NAXVO.`,async()=>{setBusy(true);try{await setAdminUserStatus(Number(id),state,reason.trim());setReason('');await load();Alert.alert('Cuenta',state==='activo'?'Cuenta reactivada.':'Cuenta suspendida.')}catch(e){Alert.alert('Cuenta',e instanceof Error?e.message:'No se pudo actualizar.')}finally{setBusy(false)}},state==='suspendido');
 };
 const u=data?.user;
 return <AdminPage><AdminHeader back eyebrow="EXPEDIENTE DE CUENTA" title={u?`${u.nombre} ${u.apellidos||''}`:'Usuario'} description={`Registro administrativo #${id}`} action={<Button title="Actualizar" variant="secondary" icon="refresh-outline" onPress={()=>void load()} loading={loading}/>}/>
  {error?<AdminPanel><Text style={{color:palette.danger}}>{error}</Text><Button title="Reintentar" onPress={()=>void load()}/></AdminPanel>:null}
  {loading&&!data?<AdminLoading/>:u?<>
   <AdminPanel>
    <View style={{flexDirection:'row',gap:13,alignItems:'center'}}><Avatar uri={u.foto_url} name={u.nombre||'Usuario'} size={68}/><View style={{flex:1,gap:6}}><Text style={{fontSize:17,color:palette.text,fontWeight:'900'}}>{u.nombre} {u.apellidos}</Text><Text style={{color:palette.muted,fontSize:12}}>{u.email}</Text><View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}><AdminStatus text={u.tipo}/><AdminStatus text={u.estado_cuenta} tone={u.estado_cuenta==='activo'?'success':'danger'}/></View></View></View>
    <Text style={{color:palette.muted,fontSize:12}}>Teléfono: {u.telefono||'No registrado'}</Text><Text style={{color:palette.muted,fontSize:12}}>Ubicación: {[u.ciudad,u.estado].filter(Boolean).join(', ')||'No registrada'}</Text>
    {u.tipo==='trabajador'?<><Text style={{color:palette.text,fontWeight:'800'}}>{u.profesion||u.especialidad||'Profesional'}</Text><AdminStatus text={`Verificación: ${u.verificacion_estado}`} tone={u.verificado?'success':'warning'}/><Text style={{color:palette.muted,fontSize:12}}>{u.anos_experiencia??0} años de experiencia · Calificación {Number(u.calificacion_promedio??0).toFixed(1)}/5</Text>{u.biografia?<Text style={{color:palette.text,fontSize:13}}>{u.biografia}</Text>:null}</>:null}
   </AdminPanel>
   <AdminMetrics items={[{label:'Solicitudes del cliente',value:u.solicitudes_cliente??0,icon:'clipboard-outline'},{label:'Trabajos del profesional',value:u.trabajos??0,icon:'briefcase-outline'},{label:'Reseñas recibidas',value:u.resenas??0,icon:'star-outline'}]}/>
   <AdminPanel><Text style={{color:palette.muted,fontSize:12}}>Fecha de registro: {adminDate(u.fecha_registro)}</Text><Text style={{color:palette.muted,fontSize:12}}>Último acceso: {adminDate(u.ultimo_acceso_at)}</Text></AdminPanel>
   {u.tipo!=='admin'?<AdminSection title="Control y seguridad de cuenta" subtitle="Cambios protegidos y sujetos a justificación"><AdminPanel>
    {u.estado_cuenta==='activo'?<><Text style={{color:palette.muted,fontSize:13}}>Suspender impide al usuario continuar utilizando funciones protegidas de la aplicación.</Text><Field label="Motivo de suspensión" value={reason} onChangeText={setReason} multiline placeholder="Describe de forma objetiva el motivo"/><Button title="Suspender cuenta" variant="danger" icon="ban-outline" loading={busy} onPress={()=>change('suspendido')}/></>:<><Text style={{color:palette.danger}}>Motivo anterior: {u.motivo_suspension||'No especificado'}</Text><Button title="Reactivar cuenta" icon="checkmark-circle-outline" loading={busy} onPress={()=>change('activo')}/></>}
   </AdminPanel></AdminSection>:null}
   <AdminSection title="Historial vinculado" subtitle="Últimas solicitudes asociadas a la cuenta">
    {data.requests?.length?<AdminPanel>{data.requests.map((r:any)=><AdminRow key={r.id} iconName="receipt-outline" title={`#${r.id} · ${r.servicio}`} description={`Servicio ${r.estado} · Pago ${r.estado_pago}`} onPress={()=>router.push(`/admin/request/${r.id}`)}/>)}</AdminPanel>:<AdminEmpty title="Sin solicitudes relacionadas" subtitle="Este usuario no tiene solicitudes en el historial consultado."/>}
   </AdminSection>
  </>:null}
 </AdminPage>;
}
