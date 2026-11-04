import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getMercadoPagoConnection } from '@/api';
import { Badge, Button, Card, Screen, Title } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';

export default function MercadoPagoConnected(){
 const {palette}=useTheme();
 const params=useLocalSearchParams<{success?:string;error?:string}>();
 const[connected,setConnected]=useState(params.success==='1');
 useEffect(()=>{getMercadoPagoConnection().then(x=>setConnected(x.connected)).catch(()=>undefined)},[]);
 return <Screen>
  <Title subtitle="Regresa a tu perfil profesional para continuar usando NAXVO.">Mercado Pago</Title>
  <Card><Badge text={connected?'Cuenta vinculada':'Vinculación no completada'} tone={connected?'success':'warning'}/>{connected?<Text style={{color:palette.text,lineHeight:21}}>Tu cuenta quedó vinculada. Los próximos pagos digitales podrán repartir automáticamente la comisión de NAXVO y la parte del profesional.</Text>:<Text style={{color:palette.muted,lineHeight:21}}>{params.error?`Mercado Pago devolvió: ${params.error}`:'No se pudo confirmar la vinculación. Intenta nuevamente desde tu perfil.'}</Text>}</Card>
  <Button title="Volver a mi perfil" icon="person-outline" onPress={()=>router.replace('/(worker)/profile')}/>
 </Screen>;
}
