import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import {
  confirmServiceCompletion,
  getMessages,
  getRequest,
  requestCompletionCorrection,
  requestServiceCompletion,
  respondQuote,
  sendMessage,
  startService,
  submitQuote,
  uploadCompletionEvidence,
  getWorkerLiveLocation,
  stopWorkerLiveLocation,
  updateWorkerLiveLocation,
  type WorkerLiveLocation,
} from '@/api';
import { Badge, Button, Card, Field, Screen, Title } from '@/components/ui';
import { DatePickerField, TimePickerField } from '@/components/SchedulePicker';
import RequestTrackingMap from '@/components/RequestTrackingMap';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import type { CompletionState, RequestDetailResponse } from '@/types/api';

const completionLabels: Record<CompletionState,string> = {
  no_solicitada:'En ejecución', solicitada:'Esperando revisión', correccion_solicitada:'Corrección solicitada', confirmada:'Finalizado',
};
const completionTones: Record<CompletionState,'success'|'warning'|'danger'|'info'> = {
  no_solicitada:'info', solicitada:'warning', correccion_solicitada:'danger', confirmada:'success',
};

const quoteLabels:Record<string,string>={
  sin_cotizar:'Sin cotizar', pendiente:'Esperando respuesta', aceptada:'Aceptada', rechazada:'Requiere nueva propuesta', retirada:'Retirada',
};

export default function RequestDetail(){
  const {id}=useLocalSearchParams<{id:string}>();
  const requestId=Number(id);
  const {user}=useAuth();
  const {palette}=useTheme();
  const[data,setData]=useState<RequestDetailResponse|null>(null);
  const[loading,setLoading]=useState(true);
  const[loadError,setLoadError]=useState('');
  const[messages,setMessages]=useState<any[]>([]);
  const[text,setText]=useState('');
  const[notes,setNotes]=useState('');
  const[correction,setCorrection]=useState('');
  const[quoteAmount,setQuoteAmount]=useState('');
  const[quoteDetail,setQuoteDetail]=useState('');
  const[quoteDate,setQuoteDate]=useState('');
  const[quoteTime,setQuoteTime]=useState('');
  const[quoteRejectReason,setQuoteRejectReason]=useState('');
  const[sending,setSending]=useState(false);
  const[actionBusy,setActionBusy]=useState(false);
  const[uploading,setUploading]=useState(false);
  const[liveLocation,setLiveLocation]=useState<WorkerLiveLocation|null>(null);
  const[sharingLocation,setSharingLocation]=useState(false);
  const locationSubscription=useRef<Location.LocationSubscription|null>(null);

  async function load(showLoading=false){
    if(!Number.isSafeInteger(requestId) || requestId<1){
      setData(null);
      setLoadError('El folio de la solicitud no es válido.');
      setLoading(false);
      return;
    }
    if(showLoading)setLoading(true);
    setLoadError('');
    try{
      const detail=await getRequest(requestId);
      setData(detail);
      setNotes(detail.completion.notes??'');
      const r:any=detail.request;
      if(r.presupuesto!=null)setQuoteAmount(String(r.presupuesto));
      if(r.cotizacion_detalle)setQuoteDetail(String(r.cotizacion_detalle));
      if(r.cotizacion_fecha_propuesta)setQuoteDate(String(r.cotizacion_fecha_propuesta));
      if(r.cotizacion_hora_propuesta)setQuoteTime(String(r.cotizacion_hora_propuesta).slice(0,5));
      if(r.trabajador_id)setMessages(await getMessages(requestId));
      else setMessages([]);
    }catch(e:any){
      const message=e?.message??'No se pudo cargar la solicitud.';
      setLoadError(message);
      if(showLoading)setData(null);
    }finally{
      if(showLoading)setLoading(false);
    }
  }
  useEffect(()=>{void load(true)},[requestId]);
  useEffect(()=>{
    if(requestId<=0 || !(data?.request as any)?.trabajador_id)return;
    let active=true;
    const timer=setInterval(()=>{
      getMessages(requestId).then(rows=>{if(active)setMessages(rows)}).catch(()=>undefined);
    },4500);
    return()=>{active=false;clearInterval(timer)};
  },[requestId,(data?.request as any)?.trabajador_id]);

  useEffect(()=>{
    const r:any=data?.request;
    if(requestId<=0 || !r?.trabajador_id || !['asignado','en_curso'].includes(String(r.estado))) {
      setLiveLocation(null);
      return;
    }
    let active=true;
    const refresh=()=>getWorkerLiveLocation(requestId).then(row=>{if(active)setLiveLocation(row)}).catch(()=>undefined);
    void refresh();
    const timer=setInterval(refresh,5000);
    return()=>{active=false;clearInterval(timer)};
  },[requestId,(data?.request as any)?.trabajador_id,(data?.request as any)?.estado]);

  useEffect(()=>()=>{
    locationSubscription.current?.remove();
    locationSubscription.current=null;
  },[]);

  async function startLocationSharing(){
    if(sharingLocation || !data)return;
    const r:any=data.request;
    if(user?.tipo!=='trabajador' || Number(r.trabajador_id)!==user.id){
      Alert.alert('Ubicación','Solo el profesional asignado puede compartir su ubicación.');
      return;
    }
    try{
      const permission=await Location.requestForegroundPermissionsAsync();
      if(!permission.granted){
        Alert.alert('Permiso de ubicación','Activa el permiso de ubicación mientras usas NAXVO para compartir tu trayecto con el cliente.');
        return;
      }
      const first=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
      const current=await updateWorkerLiveLocation(requestId,first.coords);
      setLiveLocation(current);
      locationSubscription.current?.remove();
      locationSubscription.current=await Location.watchPositionAsync(
        {accuracy:Location.Accuracy.High,timeInterval:8000,distanceInterval:10},
        position=>{
          updateWorkerLiveLocation(requestId,position.coords).then(setLiveLocation).catch(error=>console.warn('NAXVO tracking:',error));
        },
      );
      setSharingLocation(true);
      Alert.alert('Ubicación compartida','El cliente podrá ver tu posición mientras NAXVO permanezca abierto en este dispositivo.');
    }catch(e:any){
      Alert.alert('Ubicación',e?.message??'No se pudo iniciar el seguimiento.');
    }
  }

  async function stopLocationSharing(){
    locationSubscription.current?.remove();
    locationSubscription.current=null;
    setSharingLocation(false);
    try{
      await stopWorkerLiveLocation(requestId);
      setLiveLocation(null);
    }catch(e:any){
      Alert.alert('Ubicación',e?.message??'No se pudo detener el seguimiento.');
    }
  }

  async function send(){
    if(!text.trim())return;
    setSending(true);
    try{await sendMessage(requestId,text.trim());setText('');setMessages(await getMessages(requestId));}
    catch(e:any){Alert.alert('Mensaje',e.message??'No se pudo enviar.');}
    finally{setSending(false);}
  }

  async function sendQuote(){
    if(!quoteAmount.trim()||!quoteDate.trim()||!quoteTime.trim()){
      Alert.alert('Cotización','Indica monto, fecha y hora propuesta.');return;
    }
    setActionBusy(true);
    try{
      await submitQuote(requestId,{monto:quoteAmount.trim(),detalle:quoteDetail.trim(),fecha:quoteDate.trim(),hora:quoteTime.trim()});
      await load();
      Alert.alert('Cotización enviada','El cliente ya puede revisar y aceptar la propuesta.');
    }catch(e:any){Alert.alert('Cotización',e.message??'No se pudo enviar la cotización.');}
    finally{setActionBusy(false);}
  }

  async function answerQuote(action:'aceptar'|'rechazar'){
    if(action==='rechazar' && quoteRejectReason.trim().length<5){Alert.alert('Cotización','Escribe brevemente qué debe cambiar el profesional.');return;}
    setActionBusy(true);
    try{
      await respondQuote(requestId,action,quoteRejectReason.trim());
      setQuoteRejectReason('');
      await load();
      Alert.alert('Cotización',action==='aceptar'?'Cotización aceptada. Ya está disponible el módulo de pago.':'Solicitaste una nueva propuesta.');
    }catch(e:any){Alert.alert('Cotización',e.message??'No se pudo responder.');}
    finally{setActionBusy(false);}
  }

  async function start(){
    setActionBusy(true);
    try{await startService(requestId);await load();Alert.alert('Servicio iniciado','El trabajo ya está marcado como en curso.');}
    catch(e:any){Alert.alert('No se pudo iniciar',e.message??'Revisa el estado de la solicitud.');}
    finally{setActionBusy(false);}
  }

  async function pickEvidence(camera=false){
    if(!data || data.completion.evidences.length>=5){Alert.alert('Evidencias','Puedes adjuntar un máximo de 5 imágenes.');return;}
    if(camera){
      const permission=await ImagePicker.requestCameraPermissionsAsync();
      if(!permission.granted){Alert.alert('Cámara','Necesitamos permiso para tomar la evidencia.');return;}
    }
    const result=camera
      ? await ImagePicker.launchCameraAsync({mediaTypes:['images'],quality:.78})
      : await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:.78});
    if(result.canceled || !result.assets[0])return;
    setUploading(true);
    try{
      const asset=result.assets[0];
      await uploadCompletionEvidence(requestId,{uri:asset.uri,mimeType:asset.mimeType});
      await load();
    }catch(e:any){Alert.alert('Evidencia',e.message??'No se pudo subir la imagen.');}
    finally{setUploading(false);}
  }

  async function finish(){
    setActionBusy(true);
    try{
      await requestServiceCompletion(requestId,notes.trim());
      await load();
      Alert.alert('Trabajo enviado a revisión','El cliente recibió la confirmación. Debe quedar confirmado el pago antes de cerrar definitivamente el servicio.');
    }catch(e:any){Alert.alert('Finalización',e.message??'No se pudo marcar el trabajo como terminado.');}
    finally{setActionBusy(false);}
  }

  async function sendCorrection(){
    const reason=correction.trim();
    if(reason.length<10){Alert.alert('Corrección','Describe lo que falta o debe corregirse con al menos 10 caracteres.');return;}
    setActionBusy(true);
    try{await requestCompletionCorrection(requestId,reason);setCorrection('');await load();Alert.alert('Corrección enviada','El profesional recibió tus observaciones.');}
    catch(e:any){Alert.alert('Corrección',e.message??'No se pudo enviar.');}
    finally{setActionBusy(false);}
  }

  function confirm(){
    if(!data)return;
    if(String((data.request as any).estado_pago??'pendiente')!=='pagado'){
      Alert.alert('Pago pendiente','Primero debe quedar confirmado el pago del servicio. Abre el módulo de pago y completa el flujo.');
      return;
    }
    Alert.alert('Confirmar servicio completado','Confirma únicamente si el trabajo quedó terminado correctamente.',[
      {text:'Cancelar',style:'cancel'},
      {text:'Sí, confirmar',onPress:async()=>{
        setActionBusy(true);
        try{await confirmServiceCompletion(requestId);await load();router.push(`/completed/${requestId}` as any);}
        catch(e:any){Alert.alert('Confirmación',e.message??'No se pudo completar el servicio.');}
        finally{setActionBusy(false);}
      }},
    ]);
  }

  if(loading)return <Screen><Text style={{color:palette.muted}}>Cargando solicitud…</Text></Screen>;
  if(!data)return <Screen>
    <Title subtitle={requestId>0?`Folio #${requestId}`:'Solicitud'}>No se pudo cargar la solicitud</Title>
    <Card>
      <Text style={{color:palette.danger,fontWeight:'900'}}>La pantalla ya no quedará bloqueada en “Cargando solicitud…”.</Text>
      <Text style={{color:palette.muted,lineHeight:21}}>{loadError||'No encontramos la solicitud o tu sesión no tiene permiso para verla.'}</Text>
      <Button title="Reintentar" icon="refresh-outline" onPress={()=>void load(true)}/>
      <Button title="Volver a solicitudes" variant="secondary" icon="list-outline" onPress={()=>router.replace(user?.tipo==='trabajador'?'/(worker)/jobs' as any:'/(client)/requests' as any)}/>
      <Button title="Volver" variant="ghost" icon="arrow-back" onPress={()=>router.back()}/>
    </Card>
  </Screen>;
  const r:any=data.request;
  const c=data.completion;
  const state=(c.state??'no_solicitada') as CompletionState;
  const quoteState=String(r.cotizacion_estado??'sin_cotizar');
  const paid=String(r.estado_pago??'pendiente')==='pagado'||Boolean(r.pagado);
  const method=String(r.metodo_pago??'efectivo')==='tarjeta'?'mercadopago':String(r.metodo_pago??'efectivo');
  const canWorkerQuote=user?.tipo==='trabajador' && Number(r.trabajador_id)===user.id && ['asignado'].includes(String(r.estado)) && ['sin_cotizar','rechazada','retirada'].includes(quoteState);
  const canClientRespond=user?.tipo==='cliente' && quoteState==='pendiente';
  const destinationLat=Number(r.latitud);
  const destinationLng=Number(r.longitud);
  const destination=Number.isFinite(destinationLat)&&Number.isFinite(destinationLng)
    ? {latitude:destinationLat,longitude:destinationLng,label:String(r.direccion??'Domicilio del servicio')}
    : null;
  const trackingActive=Boolean(r.trabajador_id)&&['asignado','en_curso'].includes(String(r.estado));
  const isAssignedWorker=user?.tipo==='trabajador'&&Number(r.trabajador_id)===user.id;
  const isRequestClient=user?.tipo==='cliente'&&Number(r.cliente_id)===user.id;

  return <Screen>
    <Title subtitle={`Folio #${r.id}`}>{r.servicio}</Title>
    <Card>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
        <Text style={{color:palette.text,fontWeight:'900'}}>Estado: {r.estado}</Text>
        {r.estado==='en_curso'||r.estado==='completado'?<Badge text={completionLabels[state]} tone={completionTones[state]}/>:null}
      </View>
      <Text style={{color:palette.muted,lineHeight:21}}>{r.descripcion}</Text>
      {r.direccion?<Text style={{color:palette.text}}>📍 {r.direccion}</Text>:null}
      {r.fecha_preferida?<Text style={{color:palette.text}}>📅 {r.fecha_preferida} {r.hora_preferida||''}</Text>:null}
      {Array.isArray(r.imagenes_url) && r.imagenes_url.length?<View style={{gap:8}}><Text style={{color:palette.text,fontWeight:'800'}}>Fotos de la solicitud</Text><View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{r.imagenes_url.map((uri:string,index:number)=><Image key={`${uri}-${index}`} source={{uri}} style={{width:104,height:104,borderRadius:12,backgroundColor:palette.surface2}}/>)}</View></View>:null}
      {r.trabajador_nombre?<Text style={{color:palette.text}}>Profesional: {r.trabajador_nombre} {r.trabajador_apellidos||''}</Text>:null}
      {r.cliente_nombre && user?.tipo==='trabajador'?<Text style={{color:palette.text}}>Cliente: {r.cliente_nombre} {r.cliente_apellidos||''}</Text>:null}
    </Card>

    {trackingActive && (isAssignedWorker||isRequestClient)?<>
      <Title subtitle={isAssignedWorker?'Consulta el destino antes de salir y comparte tu trayecto cuando vayas en camino.':'Consulta la última ubicación compartida por el profesional durante su trayecto.'}>Ubicación del servicio</Title>
      <RequestTrackingMap
        destination={destination}
        worker={liveLocation}
        title={isAssignedWorker?'Ruta al domicilio':'Seguimiento del profesional'}
        subtitle={isAssignedWorker
          ? (destination?'El domicilio exacto de esta solicitud se muestra en el mapa.':'Esta solicitud no tiene coordenadas; usa la dirección escrita mientras el cliente la corrige.')
          : (liveLocation?'La posición se actualiza automáticamente aproximadamente cada 5 segundos.':'El profesional todavía no ha comenzado a compartir su ubicación.')}
      />
      {isAssignedWorker?<Card>
        <Text style={{color:palette.text,fontWeight:'900',fontSize:18}}>Compartir trayecto con el cliente</Text>
        <Text style={{color:palette.muted,lineHeight:20}}>El seguimiento funciona mientras NAXVO está abierto. Puedes detenerlo en cualquier momento y la ubicación se elimina de la solicitud.</Text>
        {sharingLocation
          ? <Button title="Detener ubicación en vivo" variant="secondary" icon="stop-circle-outline" onPress={()=>void stopLocationSharing()}/>
          : <Button title="Compartir ubicación en camino" icon="navigate-circle-outline" onPress={()=>void startLocationSharing()}/>}
      </Card>:null}
    </>:null}

    {r.trabajador_id && r.estado==='pendiente'?<Card>
      <Text style={{color:palette.text,fontWeight:'900',fontSize:18}}>Esperando aceptación del profesional</Text>
      <Text style={{color:palette.muted,lineHeight:20}}>{user?.tipo==='trabajador'?'Esta solicitud fue enviada directamente para ti. Revísala y acéptala desde Solicitudes disponibles antes de cotizar.':'El profesional seleccionado todavía debe revisar y aceptar la solicitud. Te avisaremos cuando responda.'}</Text>
      {user?.tipo==='trabajador'?<Button title="Ir a solicitudes disponibles" icon="briefcase-outline" onPress={()=>router.push('/(worker)/opportunities')}/>:null}
    </Card>:null}

    {r.trabajador_id && r.estado!=='pendiente'?<>
      <Title subtitle="El monto aceptado será el importe que NAXVO permita pagar.">Cotización</Title>
      <Card>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <Text style={{color:palette.text,fontWeight:'900',fontSize:18}}>Propuesta del profesional</Text>
          <Badge text={quoteLabels[quoteState]??quoteState} tone={quoteState==='aceptada'?'success':quoteState==='rechazada'?'danger':quoteState==='pendiente'?'warning':'info'}/>
        </View>
        {r.presupuesto!=null?<Text style={{color:palette.text,fontSize:26,fontWeight:'900'}}>${Number(r.presupuesto).toFixed(2)} MXN</Text>:null}
        {r.cotizacion_detalle?<Text style={{color:palette.muted,lineHeight:20}}>{r.cotizacion_detalle}</Text>:null}
        {r.cotizacion_fecha_propuesta?<Text style={{color:palette.text}}>Agenda propuesta: {r.cotizacion_fecha_propuesta} {String(r.cotizacion_hora_propuesta??'').slice(0,5)}</Text>:null}
        {r.cotizacion_rechazo_motivo?<Text style={{color:palette.danger}}>Motivo de cambio: {r.cotizacion_rechazo_motivo}</Text>:null}

        {canWorkerQuote?<>
          <Field label="Monto (MXN)" value={quoteAmount} onChangeText={setQuoteAmount} keyboardType="decimal-pad" placeholder="Ej. 850"/>
          <Field label="Detalle (opcional)" value={quoteDetail} onChangeText={setQuoteDetail} multiline placeholder="Materiales, alcance o condiciones…"/>
          <DatePickerField label="Fecha propuesta" value={quoteDate} onChange={setQuoteDate} required/>
          <TimePickerField label="Hora propuesta" value={quoteTime} onChange={setQuoteTime} required/>
          <Button title="Enviar cotización" icon="document-text-outline" onPress={sendQuote} loading={actionBusy}/>
        </>:null}

        {canClientRespond?<>
          <Button title="Aceptar cotización" icon="checkmark-circle-outline" onPress={()=>void answerQuote('aceptar')} loading={actionBusy}/>
          <Field label="Si necesitas cambios, explica cuáles" value={quoteRejectReason} onChangeText={setQuoteRejectReason} multiline placeholder="Ej. Cambiar fecha o explicar materiales…"/>
          <Button title="Solicitar nueva propuesta" variant="secondary" icon="refresh-outline" onPress={()=>void answerQuote('rechazar')} disabled={actionBusy}/>
        </>:null}
      </Card>
    </>:null}

    {quoteState==='aceptada'?<>
      <Title subtitle="Usa el método de pago elegido al crear la solicitud.">Pago</Title>
      <Card>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
          <Text style={{color:palette.text,fontWeight:'900',fontSize:18}}>{method==='efectivo'?'Efectivo':'Mercado Pago'}</Text>
          <Badge text={paid?'Pagado':String(r.estado_pago??'pendiente')} tone={paid?'success':'warning'}/>
        </View>
        {r.presupuesto!=null?<Text style={{color:palette.text,fontSize:25,fontWeight:'900'}}>${Number(r.presupuesto).toFixed(2)} MXN</Text>:null}
        <Text style={{color:palette.muted,lineHeight:20}}>{method==='efectivo'?'El cliente registra la entrega y el profesional confirma la recepción dentro de NAXVO.':'NAXVO retiene 10% como comisión y asigna 90% del importe al profesional antes de las comisiones propias de Mercado Pago.'}</Text>
        <Button title={paid?'Ver comprobación del pago':'Abrir módulo de pago'} variant={paid?'secondary':'primary'} icon={paid?'receipt-outline':'wallet-outline'} onPress={()=>router.push(`/payment/${requestId}` as any)}/>
      </Card>
    </>:null}

    {c.can_start?<Card>
      <Text style={{color:palette.text,fontSize:18,fontWeight:'900'}}>Comenzar trabajo</Text>
      <Text style={{color:palette.muted,lineHeight:20}}>Al iniciar, la solicitud cambiará a “en curso” y quedará registrado en la actividad del servicio.</Text>
      <Button title="Iniciar servicio" icon="play-circle-outline" onPress={start} loading={actionBusy}/>
    </Card>:null}

    {(r.estado==='en_curso'||r.estado==='completado')?<>
      <Title subtitle="Confirmación clara del cierre del trabajo.">Finalización del servicio</Title>
      <Card>
        <View style={{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <Badge text={completionLabels[state]} tone={completionTones[state]}/>
          {c.requested_at?<Text style={{color:palette.muted,fontSize:12}}>Solicitado: {c.requested_at}</Text>:null}
          {c.confirmed_at?<Text style={{color:palette.muted,fontSize:12}}>Confirmado: {c.confirmed_at}</Text>:null}
        </View>
        {c.notes?<View style={{gap:4}}><Text style={{color:palette.text,fontWeight:'800'}}>Notas del profesional</Text><Text style={{color:palette.muted,lineHeight:20}}>{c.notes}</Text></View>:null}
        {c.correction_reason?<View style={{padding:12,borderRadius:12,borderWidth:1,borderColor:palette.danger,gap:4}}><Text style={{color:palette.danger,fontWeight:'900'}}>! Corrección solicitada</Text><Text style={{color:palette.text,lineHeight:20}}>{c.correction_reason}</Text></View>:null}
        {c.evidences.length?<View style={{gap:8}}><Text style={{color:palette.text,fontWeight:'800'}}>Evidencias ({c.evidences.length}/5)</Text><View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{c.evidences.map(ev=>ev.url?<Image key={ev.id} source={{uri:ev.url}} style={{width:92,height:92,borderRadius:12,backgroundColor:palette.surface2}}/>:null)}</View></View>:<Text style={{color:palette.muted}}>Aún no hay evidencias adjuntas.</Text>}

        {c.can_request?<>
          <TextInput value={notes} onChangeText={setNotes} placeholder="Notas finales para el cliente (opcional)" placeholderTextColor={palette.muted} multiline maxLength={1200} style={{borderWidth:1,borderColor:palette.border,borderRadius:12,color:palette.text,padding:12,minHeight:86,textAlignVertical:'top'}}/>
          <View style={{flexDirection:'row',gap:8}}>
            <View style={{flex:1}}><Button title="Tomar foto" variant="secondary" icon="camera-outline" onPress={()=>void pickEvidence(true)} disabled={uploading||c.evidences.length>=5}/></View>
            <View style={{flex:1}}><Button title="Galería" variant="secondary" icon="images-outline" onPress={()=>void pickEvidence(false)} disabled={uploading||c.evidences.length>=5}/></View>
          </View>
          <Button title="Marcar trabajo como terminado" icon="checkmark-done-circle-outline" onPress={finish} loading={actionBusy}/>
        </>:null}

        {c.can_review?<>
          <Text style={{color:palette.text,fontWeight:'900'}}>¿El trabajo quedó correctamente terminado?</Text>
          {!paid?<View style={{gap:8,padding:12,borderRadius:12,borderWidth:1,borderColor:palette.warning}}><Text style={{color:palette.warning,fontWeight:'900'}}>! Pago pendiente</Text><Text style={{color:palette.muted}}>Antes de cerrar el servicio, completa el pago y asegúrate de que aparezca como confirmado.</Text><Button title="Ir al pago" variant="secondary" icon="wallet-outline" onPress={()=>router.push(`/payment/${requestId}` as any)}/></View>:null}
          <Button title="Confirmar servicio completado" icon="checkmark-circle-outline" onPress={confirm} loading={actionBusy} disabled={!paid}/>
          <TextInput value={correction} onChangeText={setCorrection} placeholder="Describe la corrección que necesita el profesional…" placeholderTextColor={palette.muted} multiline maxLength={700} style={{borderWidth:1,borderColor:palette.border,borderRadius:12,color:palette.text,padding:12,minHeight:82,textAlignVertical:'top'}}/>
          <Button title="Solicitar corrección" variant="secondary" icon="construct-outline" onPress={sendCorrection} disabled={actionBusy}/>
        </>:null}

        {c.completed?<Button title="Ver resumen de servicio completado" variant="secondary" icon="ribbon-outline" onPress={()=>router.push(`/completed/${requestId}` as any)}/>:null}
        {state==='solicitada' && user?.tipo==='trabajador'?<Text style={{color:palette.muted,lineHeight:20}}>El cliente ya recibió tu solicitud de cierre. Te avisaremos cuando confirme o solicite una corrección.</Text>:null}
      </Card>
    </>:null}

    <Title>Actividad</Title>
    {data.events?.slice(0,14).map(e=><Card key={e.id}><Text style={{color:palette.text,fontWeight:'800'}}>{e.titulo}</Text>{e.descripcion?<Text style={{color:palette.muted}}>{e.descripcion}</Text>:null}<Text style={{color:palette.muted,fontSize:12}}>{e.fecha}</Text></Card>)}

    {r.trabajador_id?<>
      <Title subtitle="Conversación vinculada a esta solicitud.">Chat</Title>
      <Card>
        {messages.length?messages.map((m:any)=><View key={m.id} style={{alignSelf:Number(m.emisor_id)===user?.id?'flex-end':'flex-start',maxWidth:'85%',backgroundColor:Number(m.emisor_id)===user?.id?palette.primary:palette.surface2,borderRadius:14,padding:10,marginBottom:8}}><Text style={{color:Number(m.emisor_id)===user?.id?palette.primaryText:palette.text}}>{m.mensaje}</Text><Text style={{color:Number(m.emisor_id)===user?.id?palette.primaryText:palette.muted,fontSize:10,marginTop:4}}>{m.fecha}</Text></View>):<Text style={{color:palette.muted}}>Todavía no hay mensajes.</Text>}
        <TextInput value={text} onChangeText={setText} placeholder="Escribe un mensaje…" placeholderTextColor={palette.muted} multiline style={{borderWidth:1,borderColor:palette.border,borderRadius:12,color:palette.text,padding:12,minHeight:48}}/>
        <Button title="Enviar mensaje" icon="send-outline" onPress={send} loading={sending}/>
      </Card>
    </>:null}
    <Button title="Volver" variant="ghost" icon="arrow-back" onPress={()=>router.back()}/>
  </Screen>;
}
