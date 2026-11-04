import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { getAdminDashboard } from '@/api';
import { Button } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { AdminPage, AdminHeader, AdminSection, AdminPanel, AdminMetrics, AdminNavCard, AdminRow, AdminLoading, adminCurrency, adminNumber, adminDate } from '@/components/admin/AdminUI';

export default function Dashboard(){
 const {palette}=useTheme();const[data,setData]=useState<any>(null);const[busy,setBusy]=useState(true);const[error,setError]=useState('');
 const load=useCallback(async()=>{setBusy(true);setError('');try{setData(await getAdminDashboard())}catch(e){setError(e instanceof Error?e.message:'No se pudo actualizar el centro de control.')}finally{setBusy(false)}},[]);
 useEffect(()=>{void load()},[load]);
 const users=data?.users??{}, requests=data?.requests??{}, payments=data?.payments??{};
 const total=Number(requests.total)||0, active=Number(requests.activos)||0, completed=Number(requests.completados)||0,cancelled=Number(requests.cancelados)||0;
 return <AdminPage>
   <AdminHeader title="Centro de control" description="Supervisa la operación de NAXVO, prioriza incidencias y accede a cada módulo desde un solo lugar." action={<Button title="Actualizar" icon="refresh-outline" variant="secondary" onPress={()=>void load()} loading={busy}/>}/>
   {error?<AdminPanel accent><Text style={{color:palette.danger,fontWeight:'800'}}>No se pudo obtener el resumen</Text><Text style={{color:palette.muted}}>{error}</Text><Button title="Reintentar conexión" onPress={()=>void load()}/></AdminPanel>:null}
   {busy&&!data?<AdminLoading/>:data?<>
    <AdminMetrics items={[
     {label:'Usuarios registrados',value:adminNumber(users.total),icon:'people-outline',hint:`${adminNumber(users.clientes)} clientes · ${adminNumber(users.trabajadores)} profesionales`,onPress:()=>router.push('/(admin)/users')},
     {label:'Servicios activos',value:adminNumber(active),icon:'briefcase-outline',hint:`${adminNumber(completed)} completados`,onPress:()=>router.push('/admin/requests')},
     {label:'Pagos confirmados',value:adminCurrency(payments.pagado),icon:'card-outline',hint:'Total registrado como pagado',onPress:()=>router.push('/admin/payments')},
     {label:'Requieren atención',value:adminNumber(Number(data.pending_verifications||0)+Number(data.open_reports||0)),icon:'alert-circle-outline',tone:Number(data.pending_verifications||0)+Number(data.open_reports||0)>0?'warning':'success',hint:'Verificaciones + reportes pendientes',onPress:()=>router.push('/(admin)/verifications')}
    ]}/>
    <AdminSection title="Bandeja de prioridades" subtitle="Acciones que necesitan seguimiento administrativo">
      <AdminPanel>
       <AdminRow iconName="shield-checkmark-outline" title="Verificaciones profesionales" description="Revisar documentos y solicitudes de validación" meta={`${adminNumber(data.pending_verifications)} pendientes`} onPress={()=>router.push('/(admin)/verifications')}/>
       <AdminRow iconName="flag-outline" title="Reportes y reclamaciones" description="Atender incidencias de seguridad, pagos y servicios" meta={`${adminNumber(data.open_reports)} por atender`} onPress={()=>router.push('/(admin)/reports')}/>
       <AdminRow iconName="person-remove-outline" title="Cuentas suspendidas" description="Consultar el estado y los expedientes de los usuarios" meta={`${adminNumber(users.suspendidos)} suspendidas`} onPress={()=>router.push('/(admin)/users')}/>
       <AdminRow iconName="warning-outline" title="Pagos con incidencias" description="Examinar cobros fallidos y reembolsos" meta={`${adminNumber(payments.fallidos)} fallidos · ${adminNumber(payments.reembolsados)} reembolsados`} onPress={()=>router.push('/admin/payments')}/>
      </AdminPanel>
    </AdminSection>
    <AdminSection title="Operación de servicios" subtitle="Distribución actual de solicitudes, basada en los registros de Supabase">
      <AdminPanel>
       <View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{color:palette.text,fontWeight:'800'}}>Solicitudes registradas</Text><Text style={{color:palette.primary,fontWeight:'900'}}>{adminNumber(total)}</Text></View>
       <View style={{height:13,borderRadius:12,backgroundColor:palette.surface2,overflow:'hidden',flexDirection:'row'}}>
        {[{value:active,color:palette.primary},{value:completed,color:palette.success},{value:cancelled,color:palette.danger}].map((v,i)=><View key={i} style={{width:`${total?Math.max(0,v.value/total*100):0}%`,backgroundColor:v.color}}/>)}
       </View>
       <View style={{flexDirection:'row',flexWrap:'wrap',gap:17}}>{[{title:'Activas',value:active,color:palette.primary},{title:'Completadas',value:completed,color:palette.success},{title:'Canceladas',value:cancelled,color:palette.danger}].map(x=><View key={x.title} style={{flexDirection:'row',gap:6,alignItems:'center'}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:x.color}}/><Text style={{color:palette.text,fontWeight:'700',fontSize:12}}>{x.title} · {adminNumber(x.value)}</Text></View>)}</View>
       <Text style={{fontSize:12,color:palette.muted}}>El importe de pagos es un registro operativo; no representa utilidad ni ingresos netos.</Text>
      </AdminPanel>
    </AdminSection>
    <AdminSection title="Módulos de gestión" subtitle="Herramientas de administración y supervisión">
     <View style={{gap:9}}>
      <AdminNavCard iconName="people-outline" title="Directorio de usuarios" subtitle="Clientes, trabajadores, cuentas y expedientes" to="/(admin)/users"/>
      <AdminNavCard iconName="clipboard-outline" title="Solicitudes y servicios" subtitle="Estados, asignaciones e historial de cada solicitud" to="/admin/requests"/>
      <AdminNavCard iconName="card-outline" title="Centro de pagos" subtitle="Efectivo, Mercado Pago y seguimiento de transacciones" to="/admin/payments"/>
      <AdminNavCard iconName="shield-checkmark-outline" title="Verificaciones" subtitle="Trabajadores e identidad de clientes" to="/(admin)/verifications" count={Number(data.pending_verifications)||0}/>
      <AdminNavCard iconName="flag-outline" title="Centro de reportes" subtitle="Incidencias, reclamaciones y resoluciones" to="/(admin)/reports" count={Number(data.open_reports)||0}/>
      <AdminNavCard iconName="star-outline" title="Moderación de reseñas" subtitle="Revisión de opiniones y contenido reportado" to="/admin/reviews"/>
      <AdminNavCard iconName="document-text-outline" title="Auditoría administrativa" subtitle="Historial de decisiones y acciones registradas" to="/admin/audit"/>
      <AdminNavCard iconName="pulse-outline" title="Salud y seguridad del sistema" subtitle="Conexiones, servicios y eventos de seguridad" to="/admin/system"/>
     </View>
    </AdminSection>
    <AdminSection title="Últimas solicitudes" subtitle="Actividad de servicio más reciente" action={<Button title="Ver todas" variant="ghost" onPress={()=>router.push('/admin/requests')}/> }>
     <AdminPanel>{(data.recent_requests??[]).length?(data.recent_requests??[]).map((r:any)=><AdminRow key={r.id} iconName="receipt-outline" title={`#${r.id} · ${r.servicio}`} description={`${r.cliente}${r.trabajador?` / ${r.trabajador}`:''}`} meta={`${r.estado?.replaceAll('_',' ')} · Pago: ${r.estado_pago} · ${adminDate(r.fecha_creacion)}`} onPress={()=>router.push(`/admin/request/${r.id}`)}/>):<Text style={{color:palette.muted}}>Aún no hay movimientos de servicio.</Text>}</AdminPanel>
    </AdminSection>
   </>:null}
 </AdminPage>
}
