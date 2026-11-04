import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { updateAppearance } from '@/api';
import type { ColorMode, ThemePreference } from '@/types/api';

export function NaxvoHeaderActions({withSearch=false}:{withSearch?:boolean}) {
  const {palette}=useTheme(); const {user,signOut,replaceUser}=useAuth();
  const [open,setOpen]=useState(false); const [busy,setBusy]=useState(false);
  const logout=async()=>{try{await signOut();router.replace('/(auth)/welcome');}catch(e){Alert.alert('Cerrar sesión','No fue posible salir.');}};
  const confirmLogout=()=>{if(Platform.OS==='web'){if(typeof window==='undefined'||!window.confirm('¿Deseas cerrar sesión en NAXVO?'))return;void logout();return;}Alert.alert('Cerrar sesión','¿Deseas salir de NAXVO?', [{text:'Cancelar',style:'cancel'},{text:'Cerrar sesión',style:'destructive',onPress:()=>void logout()}]);};
  const apply=async (theme?:ThemePreference, color?:ColorMode)=>{
    if(!user||busy)return;
    setBusy(true);
    try{replaceUser(await updateAppearance({tema_preferido:theme??user.tema_preferido,modo_color:color??user.modo_color}));}
    catch(e){Alert.alert('Apariencia','No se pudo guardar el cambio.');}
    finally{setBusy(false);}
  };
  return <View style={{flexDirection:'row',alignItems:'center',gap:3,paddingRight:7}}>
    {withSearch?<Pressable accessibilityLabel="Buscar profesionales" accessibilityRole="button" onPress={()=>router.push('/(client)/search')} style={{padding:9}}><Ionicons name="search-outline" size={22} color={palette.primary}/></Pressable>:null}
    <Pressable accessibilityLabel="Opciones de apariencia y cerrar sesión" accessibilityRole="button" onPress={()=>setOpen(true)} style={{padding:9}}><Ionicons name="settings-outline" size={22} color={palette.primary}/></Pressable>
    <Pressable accessibilityLabel="Cerrar sesión" accessibilityRole="button" onPress={confirmLogout} style={{padding:9}}><Ionicons name="log-out-outline" size={23} color={palette.primary}/></Pressable>
    <Modal transparent visible={open} animationType="fade" onRequestClose={()=>setOpen(false)}>
      <Pressable onPress={()=>setOpen(false)} style={{flex:1,backgroundColor:'rgba(0,0,0,.62)',justifyContent:'center',padding:22}}>
        <Pressable onPress={()=>{}} style={{borderRadius:23,padding:19,backgroundColor:palette.surface,borderWidth:1,borderColor:palette.border,gap:12,maxWidth:430,width:'100%',alignSelf:'center'}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{color:palette.text,fontWeight:'900',fontSize:20}}>Apariencia</Text><Pressable accessibilityLabel="Cerrar opciones" onPress={()=>setOpen(false)}><Ionicons name="close" color={palette.text} size={25}/></Pressable></View>
          <Text style={{color:palette.muted}}>Tema visual</Text>
          <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{(['sistema','claro','oscuro'] as ThemePreference[]).map(x=><Pressable key={x} onPress={()=>void apply(x)} disabled={busy} style={{padding:12,backgroundColor:user?.tema_preferido===x?palette.surface2:palette.background,borderWidth:1,borderColor:user?.tema_preferido===x?palette.primary:palette.border,borderRadius:12}}><Text style={{color:palette.text,fontWeight:'700'}}>{x==='sistema'?'Automático':x==='claro'?'Claro':'Oscuro'}</Text></Pressable>)}</View>
          <Text style={{color:palette.muted}}>Accesibilidad del color</Text>
          <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{(['normal','protanopia','deuteranopia','tritanopia'] as ColorMode[]).map(x=><Pressable key={x} onPress={()=>void apply(undefined,x)} disabled={busy} style={{padding:11,backgroundColor:user?.modo_color===x?palette.surface2:palette.background,borderWidth:1,borderColor:user?.modo_color===x?palette.primary:palette.border,borderRadius:12}}><Text style={{color:palette.text,fontWeight:'700'}}>{x==='normal'?'Estándar':x}</Text></Pressable>)}</View>
          <Pressable onPress={()=>{setOpen(false);router.push('/settings/appearance');}} style={{padding:13,backgroundColor:palette.surface2,borderRadius:11}}><Text style={{color:palette.primary,fontWeight:'800',textAlign:'center'}}>Más opciones de accesibilidad</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  </View>;
}
