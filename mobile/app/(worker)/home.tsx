import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMyServices, getNotifications, getOpportunities, getPortfolio, getRequests, setAvailability } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Badge, Button, Card, Empty, Screen } from '@/components/ui';
import { RequestCard } from '@/components/RequestCard';
import { WorkerHero, WorkerMetric, WorkerSection, WorkerShortcut } from '@/components/WorkerPanels';
import type { ServiceRequest } from '@/types/api';

type Summary={jobs:ServiceRequest[];opportunities:number;portfolio:number;services:number;unread:number};
const initial:Summary={jobs:[],opportunities:0,portfolio:0,services:0,unread:0};
export default function WorkerHome(){
  const {user,replaceUser}=useAuth();
  const {palette}=useTheme();
  const [summary,setSummary]=useState<Summary>(initial);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [toggling,setToggling]=useState(false);
  const load=useCallback(async()=>{
    setError('');
    const result=await Promise.allSettled([getRequests(),getOpportunities(),getPortfolio(),getMyServices(),getNotifications()]);
    setSummary(current=>({
      jobs:result[0].status==='fulfilled'?result[0].value:current.jobs,
      opportunities:result[1].status==='fulfilled'?result[1].value.requests.length:current.opportunities,
      portfolio:result[2].status==='fulfilled'?result[2].value.length:current.portfolio,
      services:result[3].status==='fulfilled'?result[3].value.length:current.services,
      unread:result[4].status==='fulfilled'?result[4].value.unread_count:current.unread,
    }));
    if(result.every(x=>x.status==='rejected'))setError('No se pudo actualizar el panel. Comprueba tu conexión.');
    setLoading(false);
  },[]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  if(!user)return null;
  const active=summary.jobs.filter(x=>!['completado','cancelado'].includes(x.estado));
  const finished=summary.jobs.filter(x=>x.estado==='completado');
  const firstName=user.nombre.split(' ')[0];
  async function toggle(){
    if(!user||toggling)return;
    setToggling(true);
    try{replaceUser(await setAvailability(!user.disponible));}
    catch(e){Alert.alert('Disponibilidad',e instanceof Error?e.message:'No se pudo cambiar.');}
    finally{setToggling(false);}
  }
  return <Screen>
    <WorkerHero eyebrow="Panel profesional" title={`Hola, ${firstName}`} description="Gestiona tus oportunidades, trabajos activos y publicaciones desde un solo lugar." icon="grid-outline" action={<View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:9}}>
      <Badge text={user.verificado?'Cuenta verificada':'Verificación pendiente'} tone={user.verificado?'success':'warning'}/>
      <Badge text={user.disponible?'Disponible para trabajar':'No disponible'} tone={user.disponible?'success':'warning'}/>
    </View>}/>
    {error?<Card><Text style={{color:palette.danger}}>{error}</Text><Button title="Volver a intentar" variant="secondary" icon="refresh-outline" onPress={()=>void load()}/></Card>:null}
    <WorkerSection title="Resumen de tu actividad" subtitle="Información actual de tus servicios">
      {loading?<ActivityIndicator color={palette.primary}/>:<View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
        <WorkerMetric label="Trabajos activos" value={active.length} icon="construct-outline" onPress={()=>router.push('/(worker)/jobs')}/>
        <WorkerMetric label="Oportunidades" value={summary.opportunities} icon="briefcase-outline" onPress={()=>router.push('/(worker)/opportunities')}/>
        <WorkerMetric label="Completados" value={finished.length} icon="checkmark-done-outline" onPress={()=>router.push('/(worker)/jobs')}/>
      </View>}
      <Pressable accessibilityRole="button" onPress={()=>void load()} style={{alignSelf:'flex-end',flexDirection:'row',alignItems:'center',gap:6,padding:7}}><Ionicons name="refresh-outline" size={16} color={palette.primary}/><Text style={{color:palette.primary,fontWeight:'800',fontSize:12}}>Actualizar información</Text></Pressable>
    </WorkerSection>
    <Card>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><View style={{flex:1,gap:4}}><Text style={{color:palette.text,fontWeight:'900',fontSize:18}}>Disponibilidad profesional</Text><Text style={{color:palette.muted,fontSize:13}}>{user.disponible?'Tu perfil puede aparecer entre los profesionales disponibles.':'No recibirás nuevas asignaciones mientras estés ausente.'}</Text></View><Ionicons name={user.disponible?'radio-button-on':'pause-circle-outline'} color={user.disponible?palette.success:palette.muted} size={27}/></View>
      <Button title={user.disponible?'Pausar disponibilidad':'Activar disponibilidad'} icon={user.disponible?'pause-outline':'play-outline'} onPress={()=>void toggle()} variant={user.disponible?'secondary':'primary'} loading={toggling} disabled={!user.verificado}/>
      {!user.verificado?<Text style={{color:palette.warning,fontSize:12}}>Completa la verificación profesional para activar tu disponibilidad y aceptar trabajos.</Text>:null}
    </Card>
    <WorkerSection title="Gestión rápida" subtitle="Tus herramientas principales">
      <WorkerShortcut title="Revisar oportunidades" description="Solicitudes disponibles compatibles con tu especialidad." icon="briefcase-outline" onPress={()=>router.push('/(worker)/opportunities')}/>
      <WorkerShortcut title="Administrar mis servicios" description={`${summary.services} servicios registrados. Publica, edita o pausa tu catálogo.`} icon="pricetags-outline" onPress={()=>router.push('/(worker)/services')}/>
      <WorkerShortcut title="Portafolio profesional" description={`${summary.portfolio} trabajos en tu galería. Agrega fotografías de proyectos.`} icon="images-outline" onPress={()=>router.push('/(worker)/portfolio')}/>
      <WorkerShortcut title="Notificaciones" description={summary.unread?`${summary.unread} avisos pendientes de leer.`:'Revisa novedades sobre solicitudes y mensajes.'} icon="notifications-outline" onPress={()=>router.push('/(worker)/notifications')}/>
    </WorkerSection>
    <WorkerSection title="Trabajos en curso" subtitle="Continúa donde lo dejaste" action={{label:'Ver todos',onPress:()=>router.push('/(worker)/jobs')}}>
      {active.length?active.slice(0,3).map(item=><RequestCard key={item.id} item={item} onPress={()=>router.push(`/request/${item.id}`)}/>):<Empty icon="checkmark-circle-outline" title="Sin trabajos en curso" text="Cuando aceptes una solicitud, la podrás seguir desde este apartado."/>}
    </WorkerSection>
    <WorkerSection title="Tu presencia en NAXVO" subtitle="Mantén tu perfil actualizado para transmitir confianza">
      <View style={{flexDirection:'row',gap:10}}>
        <WorkerMetric label="Servicios publicados" value={summary.services} icon="storefront-outline" onPress={()=>router.push('/(worker)/services')}/>
        <WorkerMetric label="Trabajos en portafolio" value={summary.portfolio} icon="images-outline" onPress={()=>router.push('/(worker)/portfolio')}/>
      </View>
      <Card><Text style={{color:palette.text,fontWeight:'900',fontSize:16}}>{user.profesion||'Completa tu profesión'}</Text><Text style={{color:palette.muted}}>{user.especialidad||'Especialidad por definir'}</Text><Text style={{color:palette.text,fontWeight:'700'}}>Calificación: {Number(user.calificacion_promedio||0).toFixed(1)} / 5 · Experiencia: {user.anos_experiencia??0} años</Text><Button title="Mejorar mi perfil" variant="secondary" icon="person-circle-outline" onPress={()=>router.push('/(worker)/profile')}/></Card>
      {!user.verificado?<Button title="Iniciar verificación profesional" icon="shield-checkmark-outline" onPress={()=>router.push('/verification')}/>:null}
    </WorkerSection>
  </Screen>;
}
