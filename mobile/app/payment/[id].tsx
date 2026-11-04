import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  confirmCashPayment,
  declareCashPayment,
  getPaymentStatus,
    startMercadoPagoCheckout,
} from '@/api';
import { Badge, Button, Card, Screen, Title } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import type { PaymentState, PaymentStatusResponse } from '@/types/api';

const stateLabels: Record<PaymentState,string> = {
  creado:'Creado',
  pendiente:'Pendiente',
  procesando:'Procesando',
  pagado:'Pagado',
  fallido:'Fallido',
  cancelado:'Cancelado',
  reembolsado:'Reembolsado',
};

const stateTone: Record<PaymentState,'success'|'warning'|'danger'|'info'> = {
  creado:'info',
  pendiente:'warning',
  procesando:'warning',
  pagado:'success',
  fallido:'danger',
  cancelado:'danger',
  reembolsado:'warning',
};

export default function PaymentScreen(){
  const {id}=useLocalSearchParams<{id:string}>();
  const requestId=Number(id);
  const {user}=useAuth();
  const {palette}=useTheme();
  const[data,setData]=useState<PaymentStatusResponse|null>(null);
  const[busy,setBusy]=useState(false);
  const[opening,setOpening]=useState(false);

  const load=useCallback(async(refresh=false,notifyFailure=false)=>{
    if(!requestId)return;
    try{
      const result=await getPaymentStatus(requestId,refresh);
      setData(result);
      if(notifyFailure && refresh && result.refresh && !result.refresh.ok && result.refresh.reason!=='not_configured'){
        Alert.alert('Mercado Pago','No se pudo sincronizar el estado con Mercado Pago. Revisa la conexión e inténtalo nuevamente.');
      }
    }catch(e:any){
      Alert.alert('Pago',e?.message??'No se pudo consultar el estado del pago.');
    }
  },[requestId]);

  useEffect(()=>{void load(false)},[load]);
  useEffect(()=>{
    const sub=AppState.addEventListener('change',state=>{
      if(state==='active' && data?.method==='mercadopago' && !data.paid){void load(true,false)}
    });
    return()=>sub.remove();
  },[data?.method,data?.paid,load]);

  async function openCheckout(){
    setOpening(true);
    try{
      const checkout=await startMercadoPagoCheckout(requestId);
      await load(false);
      if(checkout.simulation){
        throw new Error('Mercado Pago no está configurado para producción o el profesional todavía no vinculó su cuenta de cobro.');
      }
      if(!checkout.checkout_url){throw new Error('El servidor no devolvió una URL de checkout.');}
      if(!/^https?:\/\//i.test(checkout.checkout_url)){throw new Error('La URL de checkout recibida no es válida.');}
      await Linking.openURL(checkout.checkout_url);
    }catch(e:any){
      Alert.alert('Mercado Pago',e?.message??'No se pudo iniciar el checkout.');
    }finally{setOpening(false)}
  }


  async function declareCash(){
    setBusy(true);
    try{
      await declareCashPayment(requestId);
      await load(false);
      Alert.alert('Efectivo registrado','Se notificó al profesional. El pago quedará confirmado cuando indique que recibió el efectivo.');
    }catch(e:any){Alert.alert('Efectivo',e?.message??'No se pudo registrar la entrega.');}
    finally{setBusy(false)}
  }

  function confirmCash(){
    Alert.alert('Confirmar efectivo recibido','Confirma únicamente si ya recibiste el monto completo del cliente.',[
      {text:'Cancelar',style:'cancel'},
      {text:'Sí, lo recibí',onPress:async()=>{
        setBusy(true);
        try{
          await confirmCashPayment(requestId);
          await load(false);
          Alert.alert('Pago confirmado','El efectivo quedó registrado como pagado en NAXVO.');
        }catch(e:any){Alert.alert('Efectivo',e?.message??'No se pudo confirmar el pago.');}
        finally{setBusy(false)}
      }},
    ]);
  }

  if(!data){return <Screen><Text style={{color:palette.muted}}>Cargando pago…</Text></Screen>}
  const amount=typeof data.amount==='number'?data.amount:0;
  const state=(data.state||'pendiente') as PaymentState;
  const methodLabel=data.method==='efectivo'?'Efectivo':'Mercado Pago';
  const isClient=user?.tipo==='cliente';
  const isWorker=user?.tipo==='trabajador';
  const canPay=data.quote_state==='aceptada' && !data.paid;
  const cashReady=['en_curso','completado'].includes(data.service_state);
  const commission=typeof data.commission_amount==='number'?data.commission_amount:Math.round(amount*10)/100;
  const workerAmount=typeof data.worker_amount==='number'?data.worker_amount:Math.round(amount*90)/100;

  return <Screen>
    <Title subtitle={`Solicitud #${requestId}`}>Pago del servicio</Title>

    <Card>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
        <Text style={{color:palette.text,fontWeight:'900',fontSize:18}}>{methodLabel}</Text>
        <Badge text={stateLabels[state]??state} tone={stateTone[state]??'info'}/>
      </View>
      <Text style={{color:palette.text,fontSize:30,fontWeight:'900'}}>${amount.toFixed(2)} MXN</Text>
      <Text style={{color:palette.muted,lineHeight:20}}>La cotización aceptada es la fuente del monto. NAXVO valida el importe y evita registrar pagos duplicados.</Text>
      {data.payment?.external_reference?<Text style={{color:palette.muted,fontSize:12}}>Referencia: {data.payment.external_reference}</Text>:null}
      {data.payment?.paid_at?<Text style={{color:palette.muted,fontSize:12}}>Confirmado: {data.payment.paid_at}</Text>:null}
    </Card>

    {data.method==='mercadopago' && data.quote_state==='aceptada'?<Card>
      <Text style={{color:palette.text,fontWeight:'900',fontSize:18}}>Distribución del pago</Text>
      <View style={{gap:8}}>
        <View style={{flexDirection:'row',justifyContent:'space-between',gap:12}}><Text style={{color:palette.muted}}>Comisión NAXVO · 10%</Text><Text style={{color:palette.text,fontWeight:'900'}}>${commission.toFixed(2)}</Text></View>
        <View style={{flexDirection:'row',justifyContent:'space-between',gap:12}}><Text style={{color:palette.muted}}>Profesional · 90%</Text><Text style={{color:palette.success,fontWeight:'900'}}>${workerAmount.toFixed(2)}</Text></View>
      </View>
      <Text style={{color:palette.muted,lineHeight:20,fontSize:12}}>El 90% corresponde al importe bruto asignado al profesional. Mercado Pago puede descontar sus propias comisiones de procesamiento según la cuenta y condiciones aplicables.</Text>
      {data.split_applied?<Badge text="Split 10/90 preparado" tone="success"/>:<Badge text="El split se aplicará al generar el checkout" tone="info"/>}
    </Card>:null}

    {data.quote_state!=='aceptada'?<Card>
      <Text style={{color:palette.text,fontWeight:'900'}}>Cotización pendiente</Text>
      <Text style={{color:palette.muted,lineHeight:20}}>El pago se habilita cuando el cliente acepta la cotización del profesional.</Text>
    </Card>:null}

    {data.method==='efectivo'?<Card>
      <Text style={{color:palette.text,fontSize:18,fontWeight:'900'}}>Flujo de efectivo</Text>
      <Text style={{color:palette.muted,lineHeight:20}}>1. El cliente entrega el monto. 2. El cliente lo registra en NAXVO. 3. El profesional confirma la recepción. Solo entonces queda como pagado.</Text>
      {data.paid?<Badge text="Efectivo confirmado por el profesional" tone="success"/>:data.cash_client_declared?<Badge text="Cliente indicó efectivo entregado" tone="warning"/>:<Badge text="Pendiente de entrega" tone="info"/>}
      {isClient && canPay && cashReady && !data.cash_client_declared?<Button title="Marcar efectivo como entregado" icon="cash-outline" onPress={declareCash} loading={busy}/>:null}
      {isClient && !data.paid && data.cash_client_declared?<Text style={{color:palette.muted}}>Esperando que el profesional confirme que recibió el efectivo.</Text>:null}
      {isWorker && canPay && cashReady && data.cash_client_declared?<Button title="Confirmar efectivo recibido" icon="checkmark-circle-outline" onPress={confirmCash} loading={busy}/>:null}
      {isWorker && canPay && cashReady && !data.cash_client_declared?<Text style={{color:palette.muted}}>El cliente todavía no ha marcado el efectivo como entregado.</Text>:null}
      {canPay && !cashReady?<Text style={{color:palette.muted}}>El registro de efectivo se habilita cuando el profesional inicia el servicio.</Text>:null}
    </Card>:null}

    {data.method==='mercadopago'?<Card>
      <Text style={{color:palette.text,fontSize:18,fontWeight:'900'}}>Checkout Mercado Pago</Text>
      {data.paid?<Text style={{color:palette.muted,lineHeight:20}}>Mercado Pago ya confirmó el pago de esta solicitud.</Text>:<Text style={{color:palette.muted,lineHeight:20}}>El checkout se crea de forma segura en una Edge Function de Supabase y se abre directamente en Mercado Pago. NAXVO nunca guarda los datos de tu tarjeta y verifica el pago con Mercado Pago antes de marcarlo como confirmado.</Text>}
      {isClient && canPay && !data.paid?<Button title={data.payment?.checkout_url?'Abrir checkout nuevamente':'Pagar con Mercado Pago'} icon="card-outline" onPress={openCheckout} loading={opening}/>:null}
      {!data.paid?<Button title="Actualizar estado del pago" variant="secondary" icon="refresh-outline" onPress={()=>void load(true,true)} disabled={busy||opening}/>:null}
      {data.payment && !data.payment.simulation?<View style={{gap:4}}>
        {data.payment.preference_id?<Text style={{color:palette.muted,fontSize:12}}>Preferencia: {data.payment.preference_id}</Text>:null}
        {data.payment.provider_payment_id?<Text style={{color:palette.muted,fontSize:12}}>Payment ID: {data.payment.provider_payment_id}</Text>:null}
        {data.payment.provider_status?<Text style={{color:palette.muted,fontSize:12}}>Proveedor: {data.payment.provider_status}{data.payment.provider_status_detail?` · ${data.payment.provider_status_detail}`:''}</Text>:null}
      </View>:null}
    </Card>:null}

    {data.paid?<Card>
      <Text style={{color:palette.success,fontWeight:'900',fontSize:18}}>✓ Pago confirmado</Text>
      <Text style={{color:palette.muted,lineHeight:20}}>Ya puedes continuar con la confirmación final del servicio cuando el trabajo esté terminado.</Text>
    </Card>:null}

    <Button title="Volver a la solicitud" variant="secondary" icon="arrow-back-outline" onPress={()=>router.replace(`/request/${requestId}` as any)}/>
  </Screen>;
}
