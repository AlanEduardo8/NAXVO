import { useEffect, useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { getRequest } from '@/api';
import { Badge, Button, Card, Screen, Title } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import type { RequestDetailResponse } from '@/types/api';

export default function CompletedService(){
  const {id}=useLocalSearchParams<{id:string}>();
  const requestId=Number(id);
  const {palette}=useTheme();
  const[data,setData]=useState<RequestDetailResponse|null>(null);

  useEffect(()=>{
    if(requestId<=0)return;
    getRequest(requestId).then(result=>{
      setData(result);
    }).catch((e:any)=>{Alert.alert('Servicio completado',e?.message??'No se pudo cargar el resumen.');});
  },[requestId]);

  if(!data)return <Screen><Text style={{color:palette.muted}}>Cargando resumen…</Text></Screen>;
  const r=data.request;
  const c=data.completion;
  if(!c.completed)return <Screen><Title>Servicio aún no completado</Title><Card><Text style={{color:palette.muted}}>Este resumen estará disponible cuando el cliente confirme la finalización.</Text></Card><Button title="Volver" icon="arrow-back" variant="secondary" onPress={()=>router.back()}/></Screen>;

  return <Screen>
    <View style={{alignItems:'center',gap:12,paddingVertical:8}}>
      <View style={{width:86,height:86,borderRadius:43,backgroundColor:palette.surface2,borderWidth:2,borderColor:palette.success,alignItems:'center',justifyContent:'center'}}>
        <Ionicons name="checkmark-done" size={46} color={palette.success}/>
      </View>
      <Badge text="Servicio completado" tone="success"/>
      <Text style={{color:palette.text,fontSize:28,fontWeight:'900',textAlign:'center'}}>{r.servicio}</Text>
      <Text style={{color:palette.muted,textAlign:'center'}}>Folio #{r.id} · Confirmación registrada en NAXVO</Text>
    </View>

    <Card>
      <Title subtitle="Resumen de cierre">Trabajo confirmado</Title>
      <View style={{gap:8}}>
        <Text style={{color:palette.text}}><Text style={{fontWeight:'900'}}>Estado:</Text> completado ✓</Text>
        {c.confirmed_at?<Text style={{color:palette.text}}><Text style={{fontWeight:'900'}}>Confirmado:</Text> {c.confirmed_at}</Text>:null}
        {r.fecha_completado?<Text style={{color:palette.text}}><Text style={{fontWeight:'900'}}>Fecha de cierre:</Text> {r.fecha_completado}</Text>:null}
        {r.trabajador_nombre?<Text style={{color:palette.text}}><Text style={{fontWeight:'900'}}>Profesional:</Text> {r.trabajador_nombre} {r.trabajador_apellidos||''}</Text>:null}
        {r.cliente_nombre?<Text style={{color:palette.text}}><Text style={{fontWeight:'900'}}>Cliente:</Text> {r.cliente_nombre} {r.cliente_apellidos||''}</Text>:null}
        {r.direccion?<Text style={{color:palette.text}}><Text style={{fontWeight:'900'}}>Dirección:</Text> {r.direccion}</Text>:null}
      </View>
    </Card>

    {c.notes?<Card><Text style={{color:palette.text,fontWeight:'900',fontSize:17}}>Notas finales</Text><Text style={{color:palette.muted,lineHeight:21}}>{c.notes}</Text></Card>:null}

    <Card>
      <Text style={{color:palette.text,fontWeight:'900',fontSize:17}}>Evidencias del cierre</Text>
      {c.evidences.length?<View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>{c.evidences.map(ev=>ev.url?<Image key={ev.id} source={{uri:ev.url}} style={{width:132,height:110,borderRadius:14,backgroundColor:palette.surface2}}/>:null)}</View>:<Text style={{color:palette.muted}}>El servicio fue confirmado sin fotografías de evidencia.</Text>}
    </Card>

    <Card>
      <Text style={{color:palette.text,fontWeight:'900',fontSize:17}}>Registro de actividad</Text>
      {data.events.filter(e=>['servicio_iniciado','finalizacion_solicitada','correccion_solicitada','finalizacion_confirmada'].includes(e.evento)).map(e=><View key={e.id} style={{borderLeftWidth:2,borderLeftColor:e.evento==='finalizacion_confirmada'?palette.success:palette.info,paddingLeft:12,gap:3}}><Text style={{color:palette.text,fontWeight:'800'}}>{e.titulo}</Text>{e.descripcion?<Text style={{color:palette.muted}}>{e.descripcion}</Text>:null}<Text style={{color:palette.muted,fontSize:12}}>{e.fecha}</Text></View>)}
    </Card>

    <Card>
      <View style={{flexDirection:'row',alignItems:'center',gap:10}}><Ionicons name="accessibility-outline" size={24} color={palette.info}/><Text style={{color:palette.text,fontWeight:'900',fontSize:16,flex:1}}>Confirmación accesible</Text></View>
      <Text style={{color:palette.muted,lineHeight:20}}>La finalización se identifica mediante texto, símbolo de verificación y un estado visible que no depende únicamente del color.</Text>
    </Card>

    <Button title="Volver a la solicitud" icon="arrow-back" variant="secondary" onPress={()=>router.replace(`/request/${requestId}` as any)}/>
  </Screen>;
}
