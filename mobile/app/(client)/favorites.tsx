import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { getFavorites } from '@/api';
import { Empty, Screen } from '@/components/ui';
import { WorkerCard } from '@/components/WorkerCard';
import { useTheme } from '@/context/ThemeContext';
import type { Worker } from '@/types/api';
export default function Favorites(){
  const {palette}=useTheme();const [items,setItems]=useState<Worker[]>([]),[query,setQuery]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const load=useCallback(async()=>{setLoading(true);try{setItems(await getFavorites());setError('');}catch(e){setError(e instanceof Error?e.message:'No pudimos consultar favoritos.');}finally{setLoading(false)}},[]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  const shown=useMemo(()=>items.filter(x=>`${x.nombre} ${x.apellidos} ${x.profesion||''} ${x.especialidad||''}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es').trim())),[items,query]);
  return <Screen>
    <View style={{borderRadius:22,backgroundColor:palette.surface2,padding:20,gap:10}}><View style={{flexDirection:'row',alignItems:'center',gap:12}}><Ionicons name="heart-circle-outline" size={42} color={palette.primary}/><View style={{flex:1}}><Text style={{color:palette.text,fontWeight:'900',fontSize:25}}>Mis favoritos</Text><Text style={{color:palette.muted}}>Profesionales que elegiste guardar.</Text></View></View><Text style={{color:palette.primary,fontWeight:'900',fontSize:18}}>{items.length} profesionales guardados</Text></View>
    {items.length>0?<View style={{flexDirection:'row',alignItems:'center',backgroundColor:palette.surface,borderWidth:1,borderColor:palette.border,borderRadius:14,paddingHorizontal:12,gap:8}}><Ionicons name="search-outline" size={19} color={palette.primary}/><TextInput value={query} onChangeText={setQuery} returnKeyType="search" placeholder="Filtrar por nombre o profesión" placeholderTextColor={palette.muted} style={{color:palette.text,flex:1,minHeight:50}}/></View>:null}
    {loading?<ActivityIndicator color={palette.primary}/>:error?<Text style={{color:palette.danger}}>{error}</Text>:shown.length?shown.map(w=><WorkerCard key={w.id} worker={w} onPress={()=>router.push(`/professional/${w.id}`)}/>):<Empty icon="heart-outline" title={items.length?'Sin coincidencias':'Construye tu lista de confianza'} text={items.length?'Prueba otra búsqueda.':'Visita un perfil profesional y guárdalo para encontrarlo fácilmente después.'}/>}
    <Pressable accessibilityRole="button" onPress={()=>router.push('/(client)/search')} style={{borderWidth:1,borderColor:palette.primary,borderRadius:15,minHeight:51,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}}><Ionicons name="search" color={palette.primary} size={19}/><Text style={{color:palette.primary,fontWeight:'800'}}>Explorar profesionales</Text></Pressable>
  </Screen>;
}
