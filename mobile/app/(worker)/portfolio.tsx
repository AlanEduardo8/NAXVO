import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getPortfolio } from '@/api';
import { Button, Empty, Screen } from '@/components/ui';
import { WorkerHero, WorkerMetric, WorkerSection } from '@/components/WorkerPanels';
import { useTheme } from '@/context/ThemeContext';
import type { PortfolioItem } from '@/types/api';

export default function Portfolio(){
  const {palette}=useTheme();const {width}=useWindowDimensions();
  const [items,setItems]=useState<PortfolioItem[]>([]);
  const [query,setQuery]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const load=useCallback(async()=>{setError('');try{setItems(await getPortfolio())}catch(e){setError(e instanceof Error?e.message:'No fue posible recuperar tu galería.')}finally{setLoading(false)}},[]);
  useFocusEffect(useCallback(()=>{void load()},[load]));
  const filtered=useMemo(()=>items.filter(x=>`${x.titulo} ${x.categoria??''} ${x.descripcion??''}`.toLowerCase().includes(query.toLowerCase().trim())),[items,query]);
  const columns=width>760?2:1;
  return <Screen>
    <WorkerHero eyebrow="Tu trabajo habla por ti" title="Portafolio profesional" description="Presenta tus mejores trabajos con imágenes, resultados y detalles que generen confianza." icon="images-outline" action={<Button title="Agregar nuevo trabajo" icon="add-circle-outline" onPress={()=>router.push('/portfolio/new')}/>}/>
    <View style={{flexDirection:'row',gap:10}}><WorkerMetric label="Proyectos registrados" value={items.length} icon="albums-outline"/><WorkerMetric label="Con imagen" value={items.filter(x=>Boolean(x.imagen_url)).length} icon="image-outline"/></View>
    <WorkerSection title="Galería de proyectos" subtitle="Organiza tus evidencias por nombre o categoría" action={{label:'Actualizar',onPress:()=>void load()}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:14,backgroundColor:palette.surface,borderColor:palette.border,borderWidth:1}}><Ionicons name="search-outline" size={20} color={palette.primary}/><TextInput value={query} onChangeText={setQuery} placeholder="Buscar en mi portafolio" placeholderTextColor={palette.muted} style={{flex:1,color:palette.text}} returnKeyType="search"/></View>
    </WorkerSection>
    {error?<Text style={{color:palette.danger}}>{error}</Text>:null}
    {loading?<ActivityIndicator color={palette.primary}/>:!filtered.length?<Empty icon="images-outline" title={query?'Sin coincidencias':'Tu galería está vacía'} text={query?'Prueba buscando con otra palabra.':'Agrega fotografías de trabajos terminados, proyectos y resultados antes/después.'}/>:<View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>
      {filtered.map(item=><View key={item.id} style={{width:columns===2?'48.7%':'100%',backgroundColor:palette.surface,borderColor:palette.border,borderWidth:1,borderRadius:19,overflow:'hidden',gap:10,paddingBottom:15}}>
        {item.imagen_url?<Image source={{uri:item.imagen_url}} resizeMode="cover" style={{height:200,width:'100%',backgroundColor:palette.surface2}}/>:<View style={{height:190,backgroundColor:palette.surface2,alignItems:'center',justifyContent:'center'}}><Ionicons name="image-outline" size={40} color={palette.muted}/><Text style={{color:palette.muted,marginTop:8}}>Agrega una foto principal</Text></View>}
        <View style={{paddingHorizontal:15,gap:7}}>
          <Text style={{color:palette.text,fontSize:17,fontWeight:'900'}}>{item.titulo}</Text>
          {item.categoria?<Text style={{color:palette.primary,fontSize:13,fontWeight:'700'}}>{item.categoria}</Text>:null}
          {item.descripcion?<Text numberOfLines={3} style={{color:palette.muted,fontSize:13,lineHeight:19}}>{item.descripcion}</Text>:null}
          {item.imagen_antes_url?<View style={{flexDirection:'row',alignItems:'center',gap:6}}><Ionicons name="git-compare-outline" color={palette.primary} size={18}/><Text style={{color:palette.text,fontSize:12,fontWeight:'700'}}>Incluye fotografía del antes</Text></View>:null}
          {item.fecha_realizado?<Text style={{color:palette.muted,fontSize:12}}>Realizado: {item.fecha_realizado}</Text>:null}
        </View>
      </View>)}
    </View>}
    <Button title="Agregar trabajo al portafolio" variant="secondary" icon="camera-outline" onPress={()=>router.push('/portfolio/new')}/>
  </Screen>;
}
