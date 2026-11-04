import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { cancelAdminRequest, getAdminRequest } from '@/api';
import { Button, Field } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { AdminPage, AdminHeader, AdminPanel, AdminSection, AdminStatus, AdminRow, AdminEmpty, AdminLoading, adminConfirm, adminCurrency, adminDate } from '@/components/admin/AdminUI';
export default function AdminRequest(){
 const{id}=useLocalSearchParams<{id:string}>();const{palette}=useTheme();const[data,setData]=useState<any>(null);const[reason,setReason]=useState('');const[busy,setBusy]=useState(false);const[loading,setLoading]=useState(true);const[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{setData(await getAdminRequest(Number(id)))}catch(e){setError(e instanceof Error?e.message:'No se pudo cargar el expediente.')}finally{setLoading(false)}},[id]);useEffect(()=>{void load()},[load]);
 const cancel=()=>{if(!reason.trim()){Alert.alert('Motivo requerido','Especifica el motivo de cancelación.');return;}adminConfirm('Cancelar servicio',`La solicitud #${id} se cancelará administrativamente. No se realiza un reembolso automático.`,async()=>{setBusy(true);try{await cancelAdminRequest(Number(id),reason);setReason('');await load();Alert.alert('Solicitud','Cancelada. Revisa por separado los pagos asociados.')}catch(e){Alert.alert('Solicitud',e instanceof Error?e.message:'No se pudo cancelar.')}finally{setBusy(false)}},true)};
 const r=data?.request;
 return <AdminPage><AdminHeader back eyebrow="EXPEDIENTE DE SERVICIO" title={r?r.servicio:'Solicitud'} description={`Folio #${id} · Seguimiento de contratación y evidencias`} action={<Button title="Actualizar" variant="secondary" icon="refresh-outline" onPress={()=>void load()} loading={loading}/>}/>
  {error?<AdminPanel><Text style={{color:palette.danger}}>{error}</Text><Button title="Reintentar" onPress={()=>void load()}/></AdminPanel>:null}
  {loading&&!data?<AdminLoading/>:r?<>
    <AdminPanel><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}><AdminStatus text={r.estado} tone={r.estado==='completado'?'success':r.estado==='cancelado'?'danger':'info'}/><AdminStatus text={`Pago: ${r.estado_pago}`} tone={r.estado_pago==='pagado'?'success':'warning'}/></View>
      <Text style={{color:palette.text,fontSize:14,lineHeight:21}}>{r.descripcion}</Text>
      <Text style={{color:palette.muted,fontSize:13}}>Ubicación: {r.direccion||'No registrada'}</Text>
      <Text style={{color:palette.text,fontWeight:'800'}}>Presupuesto: {adminCurrency(r.presupuesto)}</Text>
      <Text style={{color:palette.muted,fontSize:12}}>Cotización: {r.cotizacion_estado} · Creada {adminDate(r.fecha_creacion)}</Text>
    </AdminPanel>
    <AdminSection title="Participantes" subtitle="Cuentas vinculadas a la solicitud"><AdminPanel>
      <AdminRow iconName="person-outline" title={r.cliente_nombre||'Cliente'} description={r.cliente_email||'Sin correo'} onPress={()=>router.push(`/admin/user/${r.cliente_id}`)}/>
      <AdminRow iconName="construct-outline" title={r.trabajador_nombre?.trim()||'Profesional sin asignar'} description={r.trabajador_email||'—'} onPress={r.trabajador_id?()=>router.push(`/admin/user/${r.trabajador_id}`):undefined}/>
    </AdminPanel></AdminSection>
    {!['completado','cancelado'].includes(r.estado)?<AdminSection title="Intervención administrativa" subtitle="Requiere un motivo verificable y confirmación expresa"><AdminPanel>
       <Field label="Motivo de cancelación" multiline value={reason} onChangeText={setReason} placeholder="Describe la causa y las comprobaciones realizadas"/>
       <Button title="Cancelar esta solicitud" variant="danger" icon="close-circle-outline" loading={busy} onPress={cancel}/>
       <Text style={{color:palette.muted,fontSize:12}}>Cancelar una solicitud no implica devolver un pago automáticamente. Revisa el historial de transacciones.</Text>
    </AdminPanel></AdminSection>:null}
    <AdminSection title="Transacciones" subtitle="Estados de pago almacenados para esta solicitud">
     {data.payments?.length?<AdminPanel>{data.payments.map((p:any)=><AdminRow key={p.id} iconName="card-outline" title={`${adminCurrency(p.monto)} · ${p.metodo}`} description={`Estado ${p.estado}${p.provider_status?` · Proveedor ${p.provider_status}`:''}`} meta={p.external_reference}/>)}</AdminPanel>:<AdminEmpty iconName="card-outline" title="Sin movimientos registrados" subtitle="Todavía no hay intentos de pago vinculados."/>}
    </AdminSection>
    <AdminSection title="Evidencias de servicio" subtitle="Archivos registrados durante el proceso">
     {data.evidence?.length?<View style={{gap:10}}>{data.evidence.map((e:any)=><AdminPanel key={e.id}>{e.url?<Image source={{uri:e.url}} resizeMode="contain" style={{height:210,width:'100%',borderRadius:12,backgroundColor:palette.surface2}}/>:null}<Text style={{color:palette.muted}}>{adminDate(e.fecha)}</Text></AdminPanel>)}</View>:<AdminEmpty iconName="images-outline" title="Sin evidencias" subtitle="Todavía no se han registrado fotografías de finalización."/>}
    </AdminSection>
    <AdminSection title="Línea de tiempo" subtitle="Eventos y cambios registrados por la aplicación">
      {data.events?.length?<AdminPanel>{data.events.map((e:any)=><AdminRow key={e.id} iconName="time-outline" title={e.titulo} description={e.descripcion||''} meta={`${e.actor_nombre||e.actor_tipo} · ${adminDate(e.fecha)}`}/>)}</AdminPanel>:<AdminEmpty iconName="time-outline" title="Sin eventos" subtitle="No se registraron eventos de esta solicitud."/>}
    </AdminSection>
  </>:null}
 </AdminPage>;
}
