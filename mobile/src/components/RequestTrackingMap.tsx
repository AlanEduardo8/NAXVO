import { Linking, Platform, Text, View } from 'react-native';
import { Button, Card } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import type { WorkerLiveLocation } from '@/api';

declare const require:any;
let MapView:any=null;
let Marker:any=null;
if(Platform.OS!=='web'){
  try{const maps=require('react-native-maps');MapView=maps.default;Marker=maps.Marker;}catch{/* dependency will be installed with npm */}
}

type Props={
  destination:{latitude:number;longitude:number;label?:string}|null;
  worker?:WorkerLiveLocation|null;
  title:string;
  subtitle?:string;
};

export default function RequestTrackingMap({destination,worker,title,subtitle}:Props){
  const{palette}=useTheme();
  const workerPoint=worker?{latitude:Number(worker.latitud),longitude:Number(worker.longitud)}:null;
  const center=workerPoint&&destination
    ? {latitude:(workerPoint.latitude+destination.latitude)/2,longitude:(workerPoint.longitude+destination.longitude)/2}
    : workerPoint??destination;
  const latitudeDelta=workerPoint&&destination?Math.max(Math.abs(workerPoint.latitude-destination.latitude)*2.6,.018):.018;
  const longitudeDelta=workerPoint&&destination?Math.max(Math.abs(workerPoint.longitude-destination.longitude)*2.6,.018):.018;
  const openExternal=()=>{if(!destination)return;const q=`${destination.latitude},${destination.longitude}`;void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`)};
  return <Card>
    <View style={{gap:4}}><Text style={{color:palette.text,fontWeight:'900',fontSize:18}}>{title}</Text>{subtitle?<Text style={{color:palette.muted,lineHeight:20}}>{subtitle}</Text>:null}</View>
    {center&&MapView&&Marker?<MapView
      style={{width:'100%',height:260,borderRadius:16}}
      initialRegion={{latitude:center.latitude,longitude:center.longitude,latitudeDelta,longitudeDelta}}
      region={{latitude:center.latitude,longitude:center.longitude,latitudeDelta,longitudeDelta}}
      showsCompass
      showsScale
    >
      {destination?<Marker coordinate={destination} title="Domicilio del servicio" description={destination.label}/>:null}
      {workerPoint?<Marker coordinate={workerPoint} title="Profesional en camino" description={worker?.fecha_actualizacion}/>:null}
    </MapView>:center?<View style={{height:150,borderRadius:16,backgroundColor:palette.surface2,alignItems:'center',justifyContent:'center',padding:18,gap:8}}><Text style={{color:palette.text,fontWeight:'900'}}>Ubicación disponible</Text><Text style={{color:palette.muted,textAlign:'center'}}>Instala react-native-maps y configura Google Maps para mostrar el mapa dentro de la app.</Text></View>:<Text style={{color:palette.muted}}>La solicitud todavía no tiene coordenadas disponibles.</Text>}
    {destination?<Button title="Abrir domicilio en Maps" variant="secondary" icon="navigate-outline" onPress={openExternal}/>:null}
    {worker?.fecha_actualizacion?<Text style={{color:palette.muted,fontSize:12}}>Última ubicación del profesional: {new Date(worker.fecha_actualizacion).toLocaleString()}</Text>:null}
  </Card>;
}
