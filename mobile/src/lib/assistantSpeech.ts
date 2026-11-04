import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

/** Lectura bajo petición (o después de activar lectura automática). No graba voz. */
export function readAssistantText(text: string) {
  const clean = text.replace(/[`*_#]/g,'').slice(0, 2200);
  if (!clean.trim()) return;
  void Speech.stop().then(() => Speech.speak(clean, {language:'es-MX',rate:0.93})).catch(()=>undefined);
}
export function stopAssistantSpeech(){void Speech.stop().catch(()=>undefined);}

/** Reconocimiento local del navegador; no se usa micrófono permanentemente. */
export function canUseBrowserDictation(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}
export function startBrowserDictation(onResult:(text:string)=>void,onError:(reason:string)=>void):()=>void {
  if(!canUseBrowserDictation()) {onError('En este dispositivo puedes usar el dictado del teclado.');return ()=>{};}
  const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new Recognition();
  recognition.lang = 'es-MX';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = (event:any) => {
    const result = event?.results?.[0]?.[0]?.transcript;
    if(typeof result==='string')onResult(result);
  };
  recognition.onerror = (event:any)=>onError(event?.error==='not-allowed'?'Permiso de micrófono denegado. Puedes escribir tu pregunta.':'No se pudo reconocer la voz. Prueba escribiendo.');
  try {recognition.start();} catch {onError('No fue posible activar el dictado.');}
  return ()=>{recognition.onresult=null;recognition.onerror=null;try{recognition.stop();}catch{}};
}

/** Modo de voz iniciado por el usuario, en primer plano. Se rearma tras silencios.
 * Si la API del navegador deja de admitir capturas, se notifica y se detiene.
 * Nunca inicia automáticamente al entrar a la aplicación. */
export function startVoiceConversation(onFinal:(message:string)=>void,onError:(reason:string)=>void):()=>void {
  if(!canUseBrowserDictation()){
    onError('La conversación por voz requiere un navegador compatible. En móvil utiliza el dictado del teclado.');
    return ()=>{};
  }
  const Recognition=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
  const recognizer=new Recognition();
  recognizer.lang='es-MX';
  recognizer.interimResults=false;
  recognizer.continuous=false;
  let active=true;
  let delivered=false;
  let retries=0;
  let retryTimer:ReturnType<typeof setTimeout>|undefined;
  const stop=()=>{active=false;if(retryTimer)clearTimeout(retryTimer);recognizer.onresult=null;recognizer.onerror=null;recognizer.onend=null;try{recognizer.abort()}catch{}};
  const start=()=>{
    if(!active)return;
    try{recognizer.start()}catch{
      stop();onError('No se pudo continuar la escucha. Puedes volver a activar el micrófono.');
    }
  };
  recognizer.onresult=(event:any)=>{
    const spoken=event?.results?.[0]?.[0]?.transcript;
    if(typeof spoken==='string'&&spoken.trim()){
      delivered=true;
      stop();
      onFinal(spoken.trim());
    }
  };
  recognizer.onerror=(event:any)=>{
    if(!active)return;
    if(event?.error==='no-speech'||event?.error==='aborted')return;
    stop();
    onError(event?.error==='not-allowed'?'El micrófono está bloqueado. Revisa los permisos del navegador.':'La escucha se interrumpió. Actívala nuevamente para continuar.');
  };
  recognizer.onend=()=>{
    if(!active||delivered)return;
    if(++retries>30){stop();onError('El navegador detuvo la escucha. Reactívala cuando quieras.');return;}
    retryTimer=setTimeout(start,350);
  };
  start();
  return stop;
}
