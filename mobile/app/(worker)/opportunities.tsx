import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { acceptOpportunity, declineOpportunity, getOpportunities } from '@/api';
import { ApiError } from '@/api/client';
import { Badge, Button, Card, Empty, Screen, Title } from '@/components/ui';
import { RequestCard } from '@/components/RequestCard';
import { WorkerHero, WorkerMetric, WorkerSection } from '@/components/WorkerPanels';
import { useTheme } from '@/context/ThemeContext';
import type { ServiceRequest } from '@/types/api';

function paymentLabel(value?:string|null){return value==='mercadopago'?'Mercado Pago':'Efectivo';}
function scheduleLabel(item:ServiceRequest){
  if(!item.fecha_preferida && !item.hora_preferida)return 'Horario flexible';
  return `${item.fecha_preferida||'Fecha por acordar'}${item.hora_preferida?` · ${item.hora_preferida}`:''}`;
}

export default function Opportunities(){
  const {palette}=useTheme();
  const[items,setItems]=useState<ServiceRequest[]>([]);
  const[verified,setVerified]=useState(false);
  const[selected,setSelected]=useState<ServiceRequest|null>(null);
  const[busy,setBusy]=useState(false);
  const[search,setSearch]=useState('');
  const[onlyDirect,setOnlyDirect]=useState(false);

  const load=useCallback(async()=>{
    try{
      const x=await getOpportunities();
      setItems(x.requests);
      setVerified(x.verified);
      if(selected){setSelected(x.requests.find(r=>r.id===selected.id)??null)}
    }catch(e:any){Alert.alert('Oportunidades',e?.message??'No se pudieron cargar las solicitudes.');}
  },[selected?.id]);

  useEffect(()=>{void load()},[]);

  async function accept(item:ServiceRequest){
    setBusy(true);
    try{
      await acceptOpportunity(item.id);
      setSelected(null);
      Alert.alert('Trabajo aceptado','La solicitud se agregó a tus trabajos. Ahora puedes revisar los detalles y preparar la cotización.');
      await load();
    }catch(e){Alert.alert('No se pudo aceptar',e instanceof ApiError?e.message:'Intenta de nuevo.');}
    finally{setBusy(false)}
  }

  function decline(item:ServiceRequest){
    Alert.alert('No aceptar solicitud','La solicitud directa dejará de estar reservada para ti y el cliente podrá encontrar otro profesional.',[
      {text:'Cancelar',style:'cancel'},
      {text:'No aceptar',style:'destructive',onPress:async()=>{
        setBusy(true);
        try{await declineOpportunity(item.id);setSelected(null);await load();}
        catch(e){Alert.alert('No se pudo rechazar',e instanceof ApiError?e.message:'Intenta de nuevo.');}
        finally{setBusy(false)}
      }},
    ]);
  }

  const visible=items.filter(x=>(!onlyDirect||x.directa)&&`${x.servicio} ${x.descripcion} ${x.ciudad||''}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <Screen>
    <WorkerHero eyebrow="Nuevos proyectos" title="Oportunidades" description="Encuentra solicitudes compatibles con tus habilidades. Revisa detalles y condiciones antes de aceptar un trabajo." icon="briefcase-outline"/>
    <View style={{flexDirection:'row',gap:9}}><WorkerMetric label="Disponibles" value={items.length} icon="document-text-outline"/><WorkerMetric label="Directas" value={items.filter(x=>Boolean(x.directa)).length} icon="mail-unread-outline"/></View>
    <WorkerSection title="Explorar oportunidades" subtitle="Localiza solicitudes relevantes" action={{label:'Actualizar',onPress:()=>void load()}}>
      <View style={{flexDirection:'row',alignItems:'center',backgroundColor:palette.surface,borderWidth:1,borderColor:palette.border,borderRadius:13,padding:11,gap:10}}><Ionicons name="search-outline" size={20} color={palette.primary}/><TextInput value={search} onChangeText={setSearch} placeholder="Buscar servicio o ciudad" returnKeyType="search" placeholderTextColor={palette.muted} style={{flex:1,color:palette.text}}/></View>
      <View style={{flexDirection:'row',gap:8}}>{[{id:false,label:'Todas las disponibles'},{id:true,label:'Solicitudes directas'}].map(option=><Pressable key={String(option.id)} onPress={()=>setOnlyDirect(option.id)} style={{paddingHorizontal:13,paddingVertical:11,borderRadius:12,borderWidth:1,borderColor:onlyDirect===option.id?palette.primary:palette.border,backgroundColor:onlyDirect===option.id?palette.surface2:palette.surface}}><Text style={{color:palette.text,fontWeight:'800',fontSize:12}}>{option.label}</Text></Pressable>)}</View>
    </WorkerSection>
    <Title subtitle={verified?'Abre cada solicitud, revisa los datos y acepta únicamente los trabajos que puedas atender.':'Puedes revisar oportunidades, pero la aceptación se habilita al verificar tu perfil.'}>Solicitudes disponibles</Title>
    {visible.length?visible.map(item=><RequestCard key={item.id} item={item} actions={<View style={{gap:8}}>
      {item.directa?<Badge text="Solicitud directa para ti" tone="warning"/>:null}
      <Button title="Ver solicitud completa" variant="secondary" icon="document-text-outline" onPress={()=>setSelected(item)}/>
    </View>}/>):<Empty icon="briefcase-outline" title="No hay oportunidades para este filtro" text="Prueba otra palabra o revisa más tarde para ver nuevas solicitudes compatibles."/>}

    <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={()=>!busy&&setSelected(null)}>
      <View style={{flex:1,backgroundColor:'rgba(0,0,0,.7)',justifyContent:'flex-end'}}>
        <View style={{backgroundColor:palette.background,borderTopLeftRadius:24,borderTopRightRadius:24,borderWidth:1,borderColor:palette.border,maxHeight:'88%'}}>
          <ScrollView contentContainerStyle={{padding:20,gap:14}} keyboardShouldPersistTaps="handled">
          {selected?<>
            <View style={{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
              <View style={{flex:1,gap:5}}>
                <Text style={{color:palette.primary,fontWeight:'900',fontSize:12}}>{selected.directa?'SOLICITUD DIRECTA':'OPORTUNIDAD ABIERTA'}</Text>
                <Text style={{color:palette.text,fontSize:24,fontWeight:'900'}}>{selected.servicio}</Text>
                <Text style={{color:palette.muted}}>Folio #{selected.id}</Text>
              </View>
              <Pressable disabled={busy} onPress={()=>setSelected(null)} style={{padding:6}}><Ionicons name="close" size={28} color={palette.text}/></Pressable>
            </View>

            <Card>
              <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
                <Badge text={`Urgencia ${selected.urgencia}`} tone={selected.urgencia==='emergencia'||selected.urgencia==='alta'?'warning':'info'}/>
                <Badge text={paymentLabel(selected.metodo_pago)} tone="info"/>
              </View>
              <Text style={{color:palette.text,fontWeight:'900'}}>Descripción</Text>
              <Text style={{color:palette.muted,lineHeight:21}}>{selected.descripcion}</Text>
              {selected.instrucciones?<><Text style={{color:palette.text,fontWeight:'900'}}>Instrucciones adicionales</Text><Text style={{color:palette.muted,lineHeight:21}}>{selected.instrucciones}</Text></>:null}
              {selected.imagenes_url?.length?<><Text style={{color:palette.text,fontWeight:'900'}}>Fotos del problema</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{selected.imagenes_url.map((uri,index)=><Image key={`${uri}-${index}`} source={{uri}} style={{width:132,height:132,borderRadius:12,backgroundColor:palette.surface2}}/>)}</ScrollView></>:null}
            </Card>

            <Card>
              <Text style={{color:palette.text,fontWeight:'900',fontSize:17}}>Fecha y ubicación</Text>
              <Text style={{color:palette.text}}>Fecha: {scheduleLabel(selected)}</Text>
              <Text style={{color:palette.text}}>Ubicación: {selected.direccion||[selected.colonia,selected.ciudad,selected.estado_dir].filter(Boolean).join(', ')||'Ubicación por confirmar'}</Text>
              {selected.distancia_km!=null?<Text style={{color:palette.muted}}>Aproximadamente a {selected.distancia_km} km de tu ubicación registrada.</Text>:null}
              {selected.cliente_nombre?<Text style={{color:palette.muted}}>Cliente: {selected.cliente_nombre}</Text>:null}
            </Card>

            {!verified?<Card><Text style={{color:palette.warning,fontWeight:'800'}}>Debes completar la verificación profesional antes de aceptar solicitudes.</Text></Card>:null}
            <Button title={verified?'Aceptar solicitud y cotizar':'Verificación requerida'} icon="checkmark-circle-outline" onPress={()=>void accept(selected)} disabled={!verified||busy} loading={busy}/>
            {selected.directa?<Button title="No aceptar esta solicitud" variant="danger" icon="close-circle-outline" onPress={()=>decline(selected)} disabled={busy}/>:null}
            <Button title="Cerrar" variant="ghost" onPress={()=>setSelected(null)} disabled={busy}/>
          </>:null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </Screen>;
}
