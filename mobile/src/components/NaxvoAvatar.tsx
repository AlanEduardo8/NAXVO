import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { askHelpBot } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useAssistant } from '@/context/AssistantContext';
import { useTheme } from '@/context/ThemeContext';
import { canUseBrowserDictation, readAssistantText, startBrowserDictation, startVoiceConversation, stopAssistantSpeech } from '@/lib/assistantSpeech';
import { getAssistantContext } from '@/lib/assistantContext';
import { ApiError } from '@/api/client';
import * as Speech from 'expo-speech';

type Message = { id: number; from:'user'|'bot'; text:string };
function AvatarFace({large=false,reduced=false}:{large?:boolean;reduced?:boolean}) {
  const float=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    if(reduced){float.setValue(0);return;}
    const animation=Animated.loop(Animated.sequence([
      Animated.timing(float,{toValue:-4,duration:1200,useNativeDriver:true}),
      Animated.timing(float,{toValue:0,duration:1200,useNativeDriver:true}),
    ]));animation.start();return()=>animation.stop();
  },[float,reduced]);
  const size=large?74:59;
  return <Animated.View style={{width:size,height:size+6,alignItems:'center',justifyContent:'flex-end',transform:[{translateY:float}]}}>
    <View style={{position:'absolute',top:0,left:'50%',marginLeft:-2,width:4,height:14,backgroundColor:'#A46AF5'}}/>
    <View style={{position:'absolute',top:0,left:'50%',marginLeft:-5,width:10,height:10,borderRadius:7,backgroundColor:'#E3C9FF',borderColor:'#7C3DE0',borderWidth:2}}/>
    <View style={{position:'absolute',top:20,left:0,width:10,height:24,borderRadius:6,backgroundColor:'#BDA4ED',borderWidth:2,borderColor:'#7138C4'}}/>
    <View style={{position:'absolute',top:20,right:0,width:10,height:24,borderRadius:6,backgroundColor:'#BDA4ED',borderWidth:2,borderColor:'#7138C4'}}/>
    <View style={{height:size-10,width:size-6,borderRadius:18,backgroundColor:'#9C6AE9',borderWidth:3,borderColor:'#E8D8FF',justifyContent:'center',alignItems:'center',shadowColor:'#6D28D9',shadowOpacity:.45,shadowRadius:8,elevation:8}}>
      <View style={{width:'83%',height:'48%',borderRadius:13,backgroundColor:'#17102A',borderWidth:1,borderColor:'#5A3588',alignItems:'center',justifyContent:'center',gap:4}}>
        <View style={{flexDirection:'row',gap:large?16:12}}><View style={{height:10,width:10,backgroundColor:'#D4BAFF',borderRadius:5}}/><View style={{height:10,width:10,backgroundColor:'#D4BAFF',borderRadius:5}}/></View>
        <View style={{height:3,width:15,borderRadius:4,backgroundColor:'#9E7ADD'}}/>
      </View>
      <View style={{marginTop:5,width:16,height:4,borderRadius:5,backgroundColor:'#E9DAFF'}}/>
    </View>
    <View style={{position:'absolute',top:13,right:4,width:6,height:6,borderRadius:3,backgroundColor:'#EAF7FF'}}/>
  </Animated.View>;
}

export default function NaxvoAvatar(){
  const {user,loading}=useAuth();
  const pathname=usePathname();
  const {prefs}=useAssistant();
  const {palette,dark}=useTheme();
  const insets=useSafeAreaInsets();
  const current=useMemo(()=>getAssistantContext(pathname),[pathname]);
  const [open,setOpen]=useState(false);
  const [voiceMode,setVoiceMode]=useState(false);
  const voiceRef=useRef(false);
  const [showHint,setShowHint]=useState(false);
  const [keyboardVisible,setKeyboardVisible]=useState(false);
  const [reduceSystem,setReduceSystem]=useState(false);
  const [input,setInput]=useState('');
  const [busy,setBusy]=useState(false);
  const [lines,setLines]=useState<Message[]>([]);
  const [error,setError]=useState('');
  const nextId=useRef(1);
  const lastHintAt=useRef(0);
  const scrollRef=useRef<ScrollView>(null);
  const dictationStop=useRef<null|(()=>void)>(null);
  useEffect(()=>{AccessibilityInfo.isReduceMotionEnabled().then(setReduceSystem).catch(()=>{});},[]);
  useEffect(()=>{
    const show=Keyboard.addListener('keyboardDidShow',()=>setKeyboardVisible(true));
    const hide=Keyboard.addListener('keyboardDidHide',()=>setKeyboardVisible(false));
    return()=>{show.remove();hide.remove();};
  },[]);
  useEffect(()=>{
    setShowHint(false);
    if(!user || !prefs.visible || !prefs.proactive || Date.now()-lastHintAt.current<120000)return;
    const openTimer=setTimeout(()=>{lastHintAt.current=Date.now();setShowHint(true);},5000);
    const closeTimer=setTimeout(()=>setShowHint(false),12000);
    return()=>{clearTimeout(openTimer);clearTimeout(closeTimer);};
  },[pathname,user?.id,prefs.visible,prefs.proactive]);
  useEffect(()=>{voiceRef.current=false;setVoiceMode(false);setOpen(false);setLines([]);setInput('');setError('');stopAssistantSpeech();dictationStop.current?.();dictationStop.current=null;},[user?.id]);
  useEffect(()=>()=>{voiceRef.current=false;stopAssistantSpeech();dictationStop.current?.();},[]);
  const add=useCallback((from:Message['from'],text:string)=>setLines(old=>[...old,{id:nextId.current++,from,text}]),[]);
  async function send(quick?:string){
    const value=(quick??input).trim();
    if(!value || busy || value.length>1000)return;
    const history=lines.slice(-8).map(x=>({role:x.from==='user'?'user' as const:'assistant' as const,content:x.text.slice(0,1000)}));
    setInput('');setError('');setBusy(true);add('user',value);
    try{
      const answer=await askHelpBot(value,history,{screen:current.screen,simple_language:prefs.simpleLanguage});
      add('bot',answer.reply);
      if(voiceRef.current && canUseBrowserDictation()) {
        await Speech.stop().catch(()=>undefined);
        Speech.speak(answer.reply.slice(0,2200),{language:'es-MX',rate:0.94,onDone:()=>{if(voiceRef.current)startVoiceListening();},onError:()=>{if(voiceRef.current)startVoiceListening();}});
      } else if(prefs.readAloud) readAssistantText(answer.reply);
    }catch(err){if(voiceRef.current){voiceRef.current=false;setVoiceMode(false);}setError(err instanceof ApiError ? err.message : 'No fue posible consultar la IA. Inténtalo de nuevo.');}
    finally{setBusy(false);}
  }
  function close(){voiceRef.current=false;setVoiceMode(false);dictationStop.current?.();dictationStop.current=null;stopAssistantSpeech();setOpen(false);}
  function startVoiceListening(){
    if(!voiceRef.current || !canUseBrowserDictation())return;
    dictationStop.current?.();
    dictationStop.current=startVoiceConversation(value=>{
      dictationStop.current=null;
      if(voiceRef.current)void send(value);
    },msg=>{voiceRef.current=false;setVoiceMode(false);setError(msg);dictationStop.current=null;});
  }
  function toggleVoice(){
    if(voiceRef.current){voiceRef.current=false;setVoiceMode(false);dictationStop.current?.();dictationStop.current=null;stopAssistantSpeech();setError('Modo voz desactivado.');return;}
    if(!canUseBrowserDictation()){setError('La conversación por voz sin pulsaciones está disponible en navegadores compatibles. En Expo móvil, por ahora utiliza el micrófono del teclado.');return;}
    voiceRef.current=true;setVoiceMode(true);setError('Escucha activada con tu permiso. Puedes detenerla cuando quieras.');startVoiceListening();
  }
  function dictate(){
    if(!canUseBrowserDictation()){setError('En el celular puedes usar el micrófono del teclado para dictar tu pregunta.');return;}
    dictationStop.current?.();setError('Escuchando una pregunta…');
    dictationStop.current=startBrowserDictation(value=>{setInput(prev=>(prev+' '+value).trim());setError('');dictationStop.current=null;},msg=>{setError(msg);dictationStop.current=null;});
  }
  const fontSize=prefs.largeText?18:15;
  const mainText=prefs.highContrast?(dark?'#FFFFFF':'#000000'):palette.text;
  const paper=prefs.highContrast?(dark?'#000000':'#FFFFFF'):palette.surface;
  const panelBorder=prefs.highContrast?(dark?'#FFFFFF':'#000000'):palette.border;
  const hiddenRoute = /(^|\/)(login|register|welcome|help)(\/|$)/.test(pathname);
  if(loading || !user || !prefs.visible || hiddenRoute)return null;
  return <View pointerEvents="box-none" style={{position:'absolute',top:0,right:0,bottom:0,left:0,zIndex:100}}>
    {!open && !keyboardVisible ? <View pointerEvents="box-none" style={{position:'absolute',bottom:insets.bottom+75,right:14,alignItems:'flex-end',gap:8,maxWidth:'86%'}}>
      {showHint ? <Pressable accessibilityRole="button" accessibilityLabel={'Consejo de NAXVO. '+current.hint+' Tocar para preguntar.'} onPress={()=>{setOpen(true);setShowHint(false);}} style={{backgroundColor:paper,paddingHorizontal:12,paddingVertical:10,borderRadius:14,borderWidth:1,borderColor:panelBorder,maxWidth:270,shadowColor:'#000',shadowOpacity:.1,shadowRadius:7,elevation:3}}>
        <Text style={{color:mainText,fontSize:prefs.largeText?15:12,fontWeight:'600'}}>{current.hint}</Text>
      </Pressable>:null}
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir NAXVO Assist, asistente inteligente y accesible" accessibilityHint="Toca para escribir o dictar una pregunta" onPress={()=>{setOpen(true);setShowHint(false);}} style={{minWidth:56,minHeight:56,alignItems:'center',justifyContent:'center'}}>
        <AvatarFace reduced={reduceSystem || prefs.reduceMotion}/>
      </Pressable>
    </View>:null}
    <Modal visible={open} animationType={prefs.reduceMotion||reduceSystem?'none':'slide'} transparent onRequestClose={close} accessibilityViewIsModal>
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1,justifyContent:'flex-end'}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar asistente" onPress={close} style={{flex:1,backgroundColor:'rgba(12,8,21,0.42)'}}/>
        <View style={{backgroundColor:paper,borderTopLeftRadius:24,borderTopRightRadius:24,borderWidth:1,borderColor:panelBorder,maxHeight:'83%',minHeight:385,paddingBottom:Math.max(insets.bottom,12)}}>
          <View style={{flexDirection:'row',gap:12,alignItems:'center',padding:16,borderBottomWidth:1,borderColor:panelBorder}}>
            <AvatarFace reduced={true}/>
            <View style={{flex:1,gap:3}}><Text accessibilityRole="header" style={{fontSize:19,fontWeight:'900',color:mainText}}>NAXVO Assist</Text><Text style={{color:palette.muted,fontSize:13}}>Ayuda IA · {current.title}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={voiceMode?'Desactivar modo voz':'Activar conversación por voz'} onPress={toggleVoice} style={{padding:9,minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:voiceMode?palette.surface2:'transparent'}}><Ionicons name={voiceMode?'mic':'mic-outline'} size={24} color={voiceMode?palette.success:mainText}/></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Configuración del asistente" onPress={()=>{close();router.push('/settings/assistant');}} style={{padding:9,minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><Ionicons name="options-outline" size={23} color={mainText}/></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={close} style={{padding:9,minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><Ionicons name="close" size={26} color={mainText}/></Pressable>
          </View>
          <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" onContentSizeChange={()=>scrollRef.current?.scrollToEnd({animated:!prefs.reduceMotion})} contentContainerStyle={{padding:16,gap:12}}>
            <View style={{backgroundColor:palette.surface2,borderRadius:16,padding:14,gap:7}}>
              <Text style={{fontSize:fontSize,fontWeight:'800',color:mainText}}>¿Necesitas ayuda con {current.title.toLowerCase()}?</Text>
              <Text style={{fontSize:fontSize,lineHeight:fontSize*1.45,color:mainText}}>{current.hint}</Text>
              <Text style={{fontSize:12,color:palette.muted}}>Conozco la sección abierta sin leer datos privados. La escucha continua es voluntaria, solo en primer plano y compatible con algunos navegadores.</Text>
            </View>
            {lines.map(m=><View key={m.id} style={{gap:5,alignSelf:m.from==='user'?'flex-end':'flex-start',maxWidth:'94%'}}>
              <View style={{backgroundColor:m.from==='user'?palette.primary:palette.surface2,padding:13,borderRadius:15,borderWidth:1,borderColor:m.from==='user'?palette.primary:panelBorder}}>
                <Text selectable style={{fontSize,lineHeight:fontSize*1.5,color:m.from==='user'?palette.primaryText:mainText}}>{m.text}</Text>
              </View>
              {m.from==='bot'?<Pressable accessibilityRole="button" accessibilityLabel="Leer en voz alta la respuesta" onPress={()=>readAssistantText(m.text)} style={{alignSelf:'flex-start',padding:9,minHeight:42,flexDirection:'row',alignItems:'center',gap:5}}><Ionicons name="volume-high-outline" size={18} color={palette.primary}/><Text style={{fontSize:12,color:palette.primary}}>Escuchar respuesta</Text></Pressable>:null}
            </View>)}
            {busy?<View style={{flexDirection:'row',alignItems:'center',gap:8,padding:8}}><ActivityIndicator color={palette.primary}/><Text style={{color:mainText}}>Generando respuesta…</Text></View>:null}
            {error?<Text accessibilityRole="alert" style={{color:palette.danger,fontSize:14}}>{error}</Text>:null}
            {lines.length===0?<View style={{gap:8}}>{current.prompts.map(prompt=><Pressable key={prompt} accessibilityRole="button" onPress={()=>void send(prompt)} style={{borderWidth:1,borderColor:panelBorder,borderRadius:13,padding:12,minHeight:48,justifyContent:'center'}}><Text style={{color:mainText,fontSize:fontSize}}>{prompt}</Text></Pressable>)}
              <Text style={{fontSize:12,fontWeight:'800',color:palette.muted,marginTop:4}}>Frases rápidas</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
                {[{icon:'list-outline',text:'Explícamelo paso a paso'},{icon:'help-circle-outline',text:'No entiendo esta pantalla'}].map(item=><Pressable key={item.text} accessibilityRole="button" accessibilityLabel={item.text} onPress={()=>void send(item.text)} style={{flexDirection:'row',alignItems:'center',gap:6,borderRadius:12,borderWidth:1,borderColor:panelBorder,minHeight:48,padding:10}}><Ionicons name={item.icon as any} size={20} color={palette.primary}/><Text style={{color:mainText,fontSize:14}}>{item.text}</Text></Pressable>)}
              </View>
            </View>:null}
          </ScrollView>
          <View style={{padding:14,borderTopWidth:1,borderColor:panelBorder,gap:8}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:7}}>
              <TextInput accessibilityLabel="Pregunta para NAXVO Assist" value={input} onChangeText={setInput} returnKeyType="send" blurOnSubmit={false} onSubmitEditing={()=>void send()} maxLength={1000} placeholder="Escribe tu pregunta…" placeholderTextColor={palette.muted} style={{backgroundColor:palette.background,color:mainText,flex:1,minHeight:48,maxHeight:105,borderWidth:1,borderColor:panelBorder,borderRadius:13,padding:12,fontSize}}/>
              <Pressable accessibilityRole="button" accessibilityLabel={canUseBrowserDictation()?'Dictar pregunta con el micrófono':'Información sobre dictado de voz'} onPress={dictate} style={{minWidth:46,minHeight:48,alignItems:'center',justifyContent:'center'}}><Ionicons name="mic-outline" size={23} color={palette.primary}/></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Enviar pregunta a la IA" disabled={busy||!input.trim()} onPress={()=>void send()} style={{backgroundColor:palette.primary,width:48,height:48,borderRadius:12,alignItems:'center',justifyContent:'center',opacity:(busy||!input.trim()) ? .5 : 1}}><Ionicons name="send" size={21} color={palette.primaryText}/></Pressable>
            </View>
            <Text style={{color:palette.muted,fontSize:11,textAlign:'center'}}>Enter para enviar · Activa el micrófono superior para conversar por voz hasta que lo desactives.</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}
