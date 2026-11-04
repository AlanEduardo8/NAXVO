import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/context/AuthContext';

export type AssistantPreferences = {
  visible: boolean;
  proactive: boolean;
  simpleLanguage: boolean;
  largeText: boolean;
  highContrast: boolean;
  readAloud: boolean;
  reduceMotion: boolean;
};
const defaults: AssistantPreferences = {
  visible:true, proactive:true, simpleLanguage:false, largeText:false,
  highContrast:false, readAloud:false, reduceMotion:false,
};
type AssistantState = { prefs: AssistantPreferences; update: (next: Partial<AssistantPreferences>) => void; restore: () => void };
const Context = createContext<AssistantState | null>(null);
const prefix = 'naxvo_assist_prefs_v1_';
async function read(key:string):Promise<string|null> {
  if (Platform.OS === 'web') {
    try { return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null; } catch { return null; }
  }
  try { return await SecureStore.getItemAsync(key); } catch { return null; }
}
async function write(key:string,value:string):Promise<void> {
  if (Platform.OS === 'web') {try {if(typeof window!=='undefined') window.localStorage.setItem(key,value);} catch {} return;}
  try {await SecureStore.setItemAsync(key,value);} catch {}
}
export function AssistantProvider({children}:{children:React.ReactNode}) {
  const {user} = useAuth();
  const userId = user?.id;
  const [prefs,setPrefs] = useState<AssistantPreferences>(defaults);
  const [ready,setReady] = useState(false);
  useEffect(() => {
    let active = true;
    setReady(false);
    setPrefs(defaults);
    if (!userId) return;
    read(prefix + userId).then(value => {
      if (!active) return;
      if (value) {
        try {
          const decoded: unknown = JSON.parse(value);
          if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) {
            const incoming = decoded as Record<string,unknown>;
            const allowed = Object.keys(defaults) as (keyof AssistantPreferences)[];
            const safe = {...defaults};
            for (const key of allowed) if (typeof incoming[key] === 'boolean') safe[key] = incoming[key] as boolean;
            setPrefs(safe);
          }
        } catch {}
      }
    }).finally(() => {if(active)setReady(true);});
    return ()=>{active=false;};
  },[userId]);
  useEffect(()=>{if(userId && ready)void write(prefix+userId,JSON.stringify(prefs));},[prefs,userId,ready]);
  const update=useCallback((next: Partial<AssistantPreferences>)=>setPrefs(prev=>({...prev,...next})),[]);
  const restore=useCallback(()=>update({visible:true}),[update]);
  const value=useMemo(()=>({prefs,update,restore}),[prefs,update,restore]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAssistant(){const context=useContext(Context);if(!context)throw new Error('useAssistant requiere AssistantProvider');return context;}
