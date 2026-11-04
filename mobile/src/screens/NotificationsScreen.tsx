import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getNotifications, markAllNotifications, markNotification } from '@/api';
import { ApiError } from '@/api/client';
import { Card, Empty, Screen } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';

type Notice={id:number;titulo:string;mensaje?:string;tipo?:string;fecha?:string;leida:boolean|number;solicitud_id?:number};
const iconFor=(type:string|undefined):keyof typeof Ionicons.glyphMap => type?.includes('mensaje')?'chatbubble-ellipses-outline':type?.includes('pago')?'card-outline':type?.includes('cotizacion')?'document-text-outline':type?.includes('verific')?'shield-checkmark-outline':'notifications-outline';
export default function NotificationsScreen(){
  const {palette}=useTheme();
  const [data,setData]=useState<Notice[]>([]),[unread,setUnread]=useState(0),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [error,setError]=useState(''),[selected,setSelected]=useState<Notice|null>(null);
  const [showUnread,setShowUnread]=useState(false);
  const load=useCallback(async()=>{
    try{setError('');const result=await getNotifications();setData(result.notifications);setUnread(result.unread_count);}
    catch(e){if(!(e instanceof ApiError&&e.status===401))setError(e instanceof Error?e.message:'No se pudieron cargar los avisos.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  const open=async(item:Notice)=>{
    setSelected(item);
    if(item.leida)return;
    setData(prev=>prev.map(n=>n.id===item.id?{...n,leida:1}:n));setUnread(v=>Math.max(0,v-1));
    try{await markNotification(item.id);}catch{void load();}
  };
  const markAll=async()=>{
    if(busy||!unread)return;setBusy(true);
    try{await markAllNotifications();setData(prev=>prev.map(n=>({...n,leida:1})));setUnread(0);}catch(e){setError(e instanceof Error?e.message:'No se pudieron actualizar los avisos.');}finally{setBusy(false);}
  };
  return <Screen>
    <View style={{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
      <View style={{flex:1,gap:5}}><Text style={{color:palette.text,fontSize:26,fontWeight:'900'}}>Alertas</Text><Text style={{color:palette.muted}}>Mantente al tanto de tus servicios y mensajes.</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Marcar todas las notificaciones como leídas" disabled={!unread||busy} onPress={()=>void markAll()} style={{flexDirection:'row',gap:6,alignItems:'center',opacity:unread&& !busy?1:0.45,paddingVertical:9}}><Ionicons name="checkmark-done-outline" size={18} color={palette.primary}/><Text style={{color:palette.primary,fontWeight:'800',fontSize:12}}>Marcar todas</Text></Pressable>
    </View>
    <View style={{backgroundColor:palette.surface2,padding:14,borderRadius:15,flexDirection:'row',gap:10,alignItems:'center'}}><Ionicons name="notifications-outline" size={22} color={palette.primary}/><Text style={{color:palette.text,fontWeight:'800'}}>{unread?`${unread} notificaciones sin leer`:'Estás al día'}</Text></View>
    <View style={{flexDirection:'row',gap:9,alignItems:'center'}}>
      {[{key:false,label:'Todas',count:data.length},{key:true,label:'Sin leer',count:unread}].map(tab=><Pressable key={String(tab.key)} accessibilityRole="button" onPress={()=>setShowUnread(tab.key)} style={{paddingHorizontal:16,paddingVertical:11,borderWidth:1,borderColor:showUnread===tab.key?palette.primary:palette.border,borderRadius:13,backgroundColor:showUnread===tab.key?palette.surface2:palette.surface}}><Text style={{color:showUnread===tab.key?palette.primary:palette.text,fontWeight:'800'}}>{tab.label} · {tab.count}</Text></Pressable>)}
    </View>
    {error?<Card><Text style={{color:palette.danger}}>{error}</Text><Text onPress={()=>void load()} style={{color:palette.primary,fontWeight:'800'}}>Reintentar</Text></Card>:null}
    {loading?<ActivityIndicator color={palette.primary}/>:!data.length?<Empty icon="notifications-off-outline" title="Sin alertas" text="Las novedades aparecerán aquí cuando se actualicen tus servicios."/>:!data.some(item=>!showUnread||!item.leida)?<Empty icon="checkmark-done-circle-outline" title="Todas las alertas están leídas" text="Cuando recibas nuevos mensajes, solicitudes o cotizaciones aparecerán aquí."/>:data.filter(item=>!showUnread||!item.leida).map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Abrir alerta ${item.titulo}`} onPress={()=>void open(item)} style={{backgroundColor:palette.surface,borderWidth:1,borderColor:!item.leida?palette.primary:palette.border,borderRadius:17,padding:16,flexDirection:'row',gap:12,alignItems:'center'}}>
      <View style={{height:46,width:46,backgroundColor:palette.surface2,borderRadius:15,alignItems:'center',justifyContent:'center'}}><Ionicons name={iconFor(item.tipo)} size={24} color={palette.primary}/></View>
      <View style={{flex:1,gap:4}}><Text numberOfLines={1} style={{color:palette.text,fontWeight:'900',fontSize:16}}>{item.titulo}</Text><Text numberOfLines={2} style={{color:palette.muted,fontSize:13,lineHeight:19}}>{item.mensaje||'Abre para ver los detalles.'}</Text><Text style={{color:palette.muted,fontSize:11}}>{item.fecha||''}</Text></View>
      {!item.leida?<View style={{height:9,width:9,borderRadius:5,backgroundColor:palette.primary}}/>:<Ionicons name="chevron-forward" color={palette.muted} size={20}/>}
    </Pressable>)}
    <Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={()=>setSelected(null)}>
      <View style={{flex:1,justifyContent:'center',padding:22,backgroundColor:'rgba(0,0,0,.60)'}}><View style={{borderRadius:22,backgroundColor:palette.surface,padding:20,gap:14,maxWidth:510,width:'100%',alignSelf:'center'}}>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><View style={{height:46,width:46,borderRadius:14,backgroundColor:palette.surface2,alignItems:'center',justifyContent:'center'}}><Ionicons name={iconFor(selected?.tipo)} size={24} color={palette.primary}/></View><Pressable accessibilityLabel="Cerrar alerta" onPress={()=>setSelected(null)} style={{padding:10}}><Ionicons name="close" size={25} color={palette.text}/></Pressable></View>
        <Text accessibilityRole="header" style={{color:palette.text,fontWeight:'900',fontSize:21}}>{selected?.titulo}</Text>
        <Text style={{color:palette.muted,fontSize:13}}>{selected?.fecha}</Text>
        <ScrollView style={{maxHeight:320}}><Text selectable style={{color:palette.text,fontSize:16,lineHeight:25}}>{selected?.mensaje||'No hay información adicional.'}</Text></ScrollView>
        <Pressable onPress={()=>setSelected(null)} style={{borderRadius:13,backgroundColor:palette.primary,padding:15,alignItems:'center'}}><Text style={{color:palette.primaryText,fontWeight:'800'}}>Cerrar</Text></Pressable>
      </View></View>
    </Modal>
  </Screen>;
}
