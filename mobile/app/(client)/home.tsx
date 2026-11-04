import { useEffect, useMemo, useRef, useState } from 'react';
import { ImageBackground, Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getCategories, getHome, getRequests, getServices } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Avatar, Badge, Button, Card, Empty, Screen } from '@/components/ui';
import { RequestCard } from '@/components/RequestCard';
import { ServiceCard } from '@/components/ServiceCard';
import type { Category, HomeData, ServiceRequest, ServiceOffering } from '@/types/api';

// Imágenes fotográficas para el catálogo. La ilustración local permanece como respaldo sin red.
const categoryImages:Record<string,any>={
  'Plomería':require('../../assets/services/plomeria.png'),
  'Electricidad':require('../../assets/services/electricidad.png'),
  'Carpintería':require('../../assets/services/carpinteria.png'),
  'Pintura':require('../../assets/services/pintura.png'),
  'Jardinería':require('../../assets/services/jardineria.png'),
  'Albañilería':require('../../assets/services/albanileria.png'),
  'Electrodomésticos':require('../../assets/services/electrodomesticos.png'),
  'Mantenimiento General':require('../../assets/services/mantenimiento.png'),
};
const categoryPhotos:Record<string,string>={
  'Plomería':'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=1000&q=80',
  'Electricidad':'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1000&q=80',
  'Carpintería':'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1000&q=80',
  'Pintura':'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=1000&q=80',
  'Jardinería':'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1000&q=80',
  'Albañilería':'https://images.unsplash.com/photo-1590725121839-892b458a74fe?w=1000&q=80',
  'Electrodomésticos':'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1000&q=80',
  'Mantenimiento General':'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1000&q=80',
};

function CategoryPhoto({name,children}:{name:string;children:React.ReactNode}){
  const[failed,setFailed]=useState(false);
  const source=!failed&&categoryPhotos[name]?{uri:categoryPhotos[name]}:categoryImages[name];
  return <ImageBackground source={source} resizeMode="cover" onError={()=>setFailed(true)} style={{flex:1,justifyContent:'flex-end'}}>
    <View style={{paddingHorizontal:22,paddingVertical:22,paddingTop:75,backgroundColor:'rgba(10,6,24,.66)',gap:8}}>{children}</View>
  </ImageBackground>;
}

export default function Home(){
  const{user}=useAuth();
  const{palette}=useTheme();
  const{width}=useWindowDimensions();
  const[all,setAll]=useState<ServiceRequest[]>([]);
  const[categories,setCategories]=useState<Category[]>([]);
  const[home,setHome]=useState<HomeData|null>(null);
  const[services,setServices]=useState<ServiceOffering[]>([]);
  const[q,setQ]=useState('');
  const [activity,setActivity]=useState<'todas'|'activas'|'completadas'|null>(null);
  const [slide,setSlide]=useState(0);
  const carouselRef=useRef<ScrollView>(null);
  const [carouselPaused,setCarouselPaused]=useState(true);

  useEffect(()=>{
    Promise.allSettled([getRequests(),getCategories(),getHome(),getServices()]).then(results=>{
      if(results[0].status==='fulfilled')setAll(results[0].value);
      if(results[1].status==='fulfilled')setCategories(results[1].value);
      if(results[2].status==='fulfilled')setHome(results[2].value);
      if(results[3].status==='fulfilled')setServices(results[3].value.slice(0,3));
    });
  },[]);

  const active=all.filter(x=>!['completado','cancelado'].includes(x.estado)).length;
  const completed=all.filter(x=>x.estado==='completado').length;
  const activityItems=all.filter(x=>activity==='todas'||(activity==='activas'?!['completado','cancelado'].includes(x.estado):x.estado==='completado')).slice(0,12);
  const featured=home?.featured_professionals?.slice(0,6)??[];
  // Una imagen principal por paso y botones accesibles; en web no depende del gesto táctil.
  const categoryWidth=Math.min(Math.max(width-54,260),740);
  const categoryStep=categoryWidth+12;
  function goSlide(next:number){
    if(!categories.length)return;
    const index=(next+categories.length)%categories.length;
    setSlide(index);
    carouselRef.current?.scrollTo({x:index*categoryStep,animated:true});
  }
  useEffect(()=>{
    if(carouselPaused||categories.length<2)return;
    const timer=setInterval(()=>setSlide(previous=>{
      const next=(previous+1)%categories.length;
      carouselRef.current?.scrollTo({x:next*categoryStep,animated:true});
      return next;
    }),6500);
    return()=>clearInterval(timer);
  },[carouselPaused,categories.length,categoryStep]);
  const professionalWidth=Math.min(Math.max(width*.72,255),340);
  const firstName=useMemo(()=>user?.nombre?.split(' ')[0]||'Cliente',[user?.nombre]);

  function search(value=q){
    const clean=value.trim();
    router.push(clean?`/(client)/search?q=${encodeURIComponent(clean)}`:'/(client)/search');
  }

  return <Screen>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10}}>
      <View style={{flex:1,gap:4}}><Text style={{color:palette.muted,fontWeight:'700'}}>Hola, {firstName}</Text><Text style={{color:palette.text,fontSize:25,fontWeight:'900'}}>¿Qué necesitas hoy?</Text></View>

    </View>
    <View style={{gap:4}}>
      <Text style={{color:palette.muted,fontSize:14,lineHeight:21}}>Encuentra profesionales verificados, compara experiencia y solicita un servicio en NAXVO.</Text>
    </View>

    <Card>
      <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
        <View style={{flex:1,minHeight:50,borderWidth:1,borderColor:palette.border,borderRadius:14,backgroundColor:palette.background,flexDirection:'row',alignItems:'center',paddingHorizontal:13,gap:9}}>
          <Ionicons name="search-outline" size={21} color={palette.primary}/>
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={()=>search()}
            placeholder="Buscar por profesión, servicio o ciudad…"
            placeholderTextColor={palette.muted}
            style={{flex:1,color:palette.text,fontSize:15,paddingVertical:12}}
            returnKeyType="search"
          />
        </View>
        <Pressable onPress={()=>search()} style={{width:50,height:50,borderRadius:14,backgroundColor:palette.primary,alignItems:'center',justifyContent:'center'}}>
          <Ionicons name="arrow-forward" size={22} color={palette.primaryText}/>
        </Pressable>
      </View>
      <View style={{flexDirection:'row',gap:10}}>
        <View style={{flex:1}}><Button title="Nueva solicitud" icon="add-circle-outline" onPress={()=>router.push('/request/new')}/></View>
        <View style={{flex:1}}><Button title="Mis solicitudes" variant="secondary" icon="clipboard-outline" onPress={()=>router.push('/(client)/requests')}/></View>
      </View>
    </Card>

    <View style={{gap:12}}>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
        <View style={{gap:4,flex:1}}><Text style={{color:palette.text,fontWeight:'900',fontSize:21}}>Explora por categoría</Text><Text style={{color:palette.muted,fontSize:13}}>Descubre servicios y especialistas cercanos</Text></View>
        <Pressable onPress={()=>router.push('/(client)/search')} accessibilityRole="button" style={{padding:8}}><Text style={{color:palette.primary,fontWeight:'800'}}>Ver todas</Text></Pressable>
      </View>
      <ScrollView ref={carouselRef} horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={categoryStep} disableIntervalMomentum onMomentumScrollEnd={event=>setSlide(Math.max(0,Math.min(categories.length-1,Math.round(event.nativeEvent.contentOffset.x/categoryStep))))} contentContainerStyle={{gap:12,paddingRight:12}}>
        {categories.map((category,index)=><Pressable accessibilityRole="button" accessibilityLabel={`Categoría ${category.name}. Tarjeta ${index+1} de ${categories.length}`} key={category.slug} onPress={()=>router.push(`/(client)/search?mode=services&q=${encodeURIComponent(category.name)}`)} style={{width:categoryWidth,height:278,borderRadius:23,overflow:'hidden',borderWidth:1,borderColor:palette.border,backgroundColor:palette.surface2}}>
          <CategoryPhoto name={category.name}>
            <View style={{alignSelf:'flex-start',paddingHorizontal:10,paddingVertical:5,backgroundColor:'rgba(165,110,241,.24)',borderRadius:8,borderWidth:1,borderColor:'rgba(219,194,255,.55)'}}><Text style={{color:'#F2E6FF',fontWeight:'800',fontSize:12}}>SERVICIOS NAXVO</Text></View>
            <Text style={{color:'#FFFFFF',fontSize:29,fontWeight:'900'}}>{category.name}</Text>
            <Text style={{color:'#F0EAF9',fontSize:14,lineHeight:22,maxWidth:540}} numberOfLines={2}>{category.description||`Encuentra profesionales con experiencia en ${category.name}`}</Text>
            <View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:4}}><Text style={{color:'#F0D9FF',fontWeight:'900'}}>Ver profesionales y servicios</Text><Ionicons name="arrow-forward-outline" size={19} color="#F0D9FF"/></View>
          </CategoryPhoto>
        </Pressable>)}
      </ScrollView>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
          <Pressable accessibilityRole="button" accessibilityLabel="Categoría anterior" disabled={categories.length<2} onPress={()=>goSlide(slide-1)} style={{height:42,width:42,borderRadius:13,backgroundColor:palette.surface,borderWidth:1,borderColor:palette.border,alignItems:'center',justifyContent:'center'}}><Ionicons name="chevron-back" size={23} color={palette.primary}/></Pressable>
          <Text style={{color:palette.muted,fontWeight:'800',minWidth:58,textAlign:'center'}}>{categories.length?`${slide+1} / ${categories.length}`:'0 / 0'}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Categoría siguiente" disabled={categories.length<2} onPress={()=>goSlide(slide+1)} style={{height:42,width:42,borderRadius:13,backgroundColor:palette.surface,borderWidth:1,borderColor:palette.border,alignItems:'center',justifyContent:'center'}}><Ionicons name="chevron-forward" size={23} color={palette.primary}/></Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={carouselPaused?'Activar rotación automática':'Pausar carrusel'} onPress={()=>setCarouselPaused(v=>!v)} style={{flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:12,paddingVertical:10,borderRadius:12,backgroundColor:palette.surface2}}><Ionicons name={carouselPaused?'play-outline':'pause-outline'} size={17} color={palette.primary}/><Text style={{color:palette.text,fontWeight:'700',fontSize:12}}>{carouselPaused?'Auto':'Pausar'}</Text></Pressable>
      </View>
    </View>

    <View style={{gap:10}}>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10}}>
        <Text style={{color:palette.text,fontWeight:'900',fontSize:20}}>Servicios publicados</Text>
        <Pressable accessibilityRole="button" onPress={()=>router.push('/(client)/search?mode=services')}><Text style={{color:palette.primary,fontWeight:'800'}}>Explorar servicios</Text></Pressable>
      </View>
      {services.length?services.map(item=><ServiceCard key={item.id} item={item} onPress={()=>router.push(`/service/${item.id}`)}/>):<View style={{gap:10}}><Text style={{color:palette.muted}}>Todavía no hay publicaciones activas. Estas categorías pueden ayudarte a empezar:</Text>{(categories.length?categories.slice(0,3):[{slug:'plomeria',name:'Plomería',description:'Reparaciones y mantenimiento'},{slug:'electricidad',name:'Electricidad',description:'Instalaciones y soluciones eléctricas'},{slug:'carpinteria',name:'Carpintería',description:'Muebles y reparaciones'}]).map(c=><Pressable key={c.slug} accessibilityRole="button" onPress={()=>router.push(`/(client)/search?mode=workers&q=${encodeURIComponent(c.name)}`)} style={{backgroundColor:palette.surface,borderWidth:1,borderColor:palette.border,borderRadius:16,padding:14,flexDirection:'row',alignItems:'center',gap:12}}><View style={{backgroundColor:palette.surface2,padding:12,borderRadius:12}}><Ionicons name="construct-outline" color={palette.primary} size={22}/></View><View style={{flex:1,gap:3}}><Text style={{color:palette.text,fontSize:16,fontWeight:'800'}}>{c.name}</Text><Text style={{color:palette.muted,fontSize:12}} numberOfLines={1}>{c.description||'Explora profesionales de esta categoría'}</Text></View><Ionicons name="arrow-forward" color={palette.primary} size={21}/></Pressable>)}</View>}
      {services.length>0 && services.length<3?<View style={{gap:8}}><Text style={{color:palette.muted,fontWeight:'700'}}>Otras categorías para explorar</Text>{(categories.length?categories.slice(0,3-services.length):[{slug:'plomeria',name:'Plomería',description:'Reparaciones'},{slug:'electricidad',name:'Electricidad',description:'Instalaciones'}].slice(0,3-services.length)).map(c=><Pressable key={c.slug} accessibilityRole="button" onPress={()=>router.push(`/(client)/search?q=${encodeURIComponent(c.name)}`)} style={{borderColor:palette.border,borderWidth:1,borderRadius:14,backgroundColor:palette.surface,flexDirection:'row',alignItems:'center',padding:14,gap:11}}><Ionicons name="grid-outline" color={palette.primary} size={21}/><View style={{flex:1}}><Text style={{fontWeight:'800',color:palette.text}}>{c.name}</Text><Text style={{fontSize:12,color:palette.muted}}>Categoría sugerida · no es una publicación</Text></View><Ionicons name="arrow-forward" color={palette.primary} size={19}/></Pressable>)}</View>:null}
      <Button title="Buscar profesionales" variant="secondary" icon="search-outline" onPress={()=>router.push('/(client)/search')}/>
    </View>

    {featured.length?<View style={{gap:10}}>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
        <Text style={{color:palette.text,fontWeight:'900',fontSize:20}}>Profesionales destacados</Text>
        <Pressable onPress={()=>router.push('/(client)/search')}><Text style={{color:palette.primary,fontWeight:'800'}}>Explorar</Text></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12,paddingRight:8}}>
        {featured.map(worker=><Pressable key={worker.id} onPress={()=>router.push(`/professional/${worker.id}`)} style={{width:professionalWidth,borderWidth:1,borderColor:palette.border,borderRadius:18,backgroundColor:palette.surface,padding:16,gap:10}}>
          <View style={{flexDirection:'row',gap:12,alignItems:'center'}}>
            <Avatar uri={worker.foto_url} name={worker.nombre} size={58}/>
            <View style={{flex:1,gap:3}}>
              <Text style={{color:palette.text,fontWeight:'900',fontSize:17}} numberOfLines={1}>{worker.nombre}</Text>
              <Text style={{color:palette.primary,fontWeight:'700'}} numberOfLines={1}>{worker.especialidad||'Profesional NAXVO'}</Text>
              <Text style={{color:palette.muted,fontSize:13}} numberOfLines={1}>{[worker.ciudad,worker.estado].filter(Boolean).join(', ')||'Servicio a domicilio'}</Text>
            </View>
            {worker.verificado?<Ionicons name="shield-checkmark" size={23} color={palette.success}/>:null}
          </View>
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
            <Badge text={`★ ${Number(worker.calificacion||0).toFixed(1)}`} tone="warning"/>
            <Badge text={`${worker.servicios||0} servicios`} tone="info"/>
            {worker.disponible?<Badge text="Disponible" tone="success"/>:null}
          </View>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
            <Text style={{color:palette.muted,fontSize:13}}>Ver perfil y trabajos</Text>
            <Ionicons name="chevron-forward" size={20} color={palette.primary}/>
          </View>
        </Pressable>)}
      </ScrollView>
    </View>:null}

    <View style={{gap:12}}>
      <Text style={{fontSize:20,fontWeight:'900',color:palette.text}}>Tu actividad</Text>
      <View style={{flexDirection:'row',gap:9}}>
        {([{key:'todas',label:'Solicitudes',count:all.length,icon:'document-text-outline'}, {key:'activas',label:'En curso',count:active,icon:'time-outline'}, {key:'completadas',label:'Completadas',count:completed,icon:'checkmark-done-outline'}] as const).map(x=><Pressable key={x.key} accessibilityRole="button" accessibilityLabel={`Ver ${x.label.toLowerCase()}`} onPress={()=>setActivity(x.key)} style={{flex:1,borderRadius:17,backgroundColor:palette.surface,borderColor:palette.border,borderWidth:1,paddingVertical:16,paddingHorizontal:7,alignItems:'center',gap:6}}><Ionicons name={x.icon} size={25} color={palette.primary}/><Text style={{fontSize:23,fontWeight:'900',color:palette.text}}>{x.count}</Text><Text style={{fontSize:12,color:palette.muted,fontWeight:'800',textAlign:'center'}}>{x.label}</Text></Pressable>)}
      </View>
    </View>

    <Modal transparent visible={activity!==null} animationType="fade" onRequestClose={()=>setActivity(null)}>
      <View style={{flex:1,backgroundColor:'rgba(0,0,0,.62)',justifyContent:'center',padding:20}}>
        <View style={{backgroundColor:palette.surface,borderRadius:22,padding:17,maxHeight:'78%',width:'100%',maxWidth:530,alignSelf:'center',gap:12}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{color:palette.text,fontSize:20,fontWeight:'900'}}>{activity==='todas'?'Todas mis solicitudes':activity==='activas'?'Servicios en curso':'Servicios completados'}</Text><Pressable accessibilityLabel="Cerrar actividad" onPress={()=>setActivity(null)} style={{padding:9}}><Ionicons name="close" size={24} color={palette.text}/></Pressable></View>
          <ScrollView contentContainerStyle={{gap:10}}>{activityItems.length?activityItems.map(item=><RequestCard key={item.id} item={item} onPress={()=>{setActivity(null);router.push(`/request/${item.id}`)}}/>):<Empty icon="documents-outline" title="Sin registros" text="Todavía no hay solicitudes en esta sección."/>}</ScrollView>
          <Pressable onPress={()=>{setActivity(null);router.push('/(client)/requests')}} style={{padding:13,backgroundColor:palette.surface2,borderRadius:13,alignItems:'center'}}><Text style={{color:palette.primary,fontWeight:'800'}}>Ver todas las solicitudes</Text></Pressable>
        </View>
      </View>
    </Modal>
  </Screen>;
}
