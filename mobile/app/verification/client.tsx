import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { getClientVerification, submitClientVerificationImage } from '@/api';
import { Badge, Button, Card, Screen, Title } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';

type Kind='ine'|'ine_reverso'|'rostro';

export default function ClientVerification(){
  const {palette}=useTheme();
  const[status,setStatus]=useState<any>(null);
  const[busy,setBusy]=useState<Kind|null>(null);
  const[error,setError]=useState('');
  const[consent,setConsent]=useState(false);
  const[preview,setPreview]=useState<Record<Kind,string|undefined>>({ine:undefined,ine_reverso:undefined,rostro:undefined});

  const load=useCallback(async()=>{try{setStatus(await getClientVerification());setError('');}catch(e){setError(e instanceof Error?e.message:'No se pudo consultar tu verificación.');}},[]);
  useEffect(()=>{void load()},[load]);

  async function scan(kind:Kind){
    if(!consent){Alert.alert('Consentimiento requerido','Autoriza el envío de las imágenes antes de iniciar la captura.');return;}
    const permission=await ImagePicker.requestCameraPermissionsAsync();
    if(!permission.granted){Alert.alert('Cámara','Necesitamos permiso para escanear tu identificación y rostro.');return;}
    const face=kind==='rostro';
    const result=await ImagePicker.launchCameraAsync({
      mediaTypes:['images'],
      allowsEditing:true,
      aspect:face?[1,1]:[4,3],
      quality:.9,
      cameraType:face?ImagePicker.CameraType.front:ImagePicker.CameraType.back,
    });
    if(result.canceled||!result.assets[0])return;
    const asset=result.assets[0];
    setBusy(kind);
    try{
      setPreview(p=>({...p,[kind]:asset.uri}));
      setStatus(await submitClientVerificationImage(kind,asset.uri,asset.mimeType||'image/jpeg'));
    }catch(e){Alert.alert('Verificación',e instanceof Error?e.message:'No se pudo guardar la captura.');}
    finally{setBusy(null);}
  }

  const complete=Boolean(status?.tiene_ine&&status?.tiene_ine_reverso&&status?.tiene_rostro);
  const steps:[Kind,string,string,string][]=[
    ['ine','1. Frente del INE','Coloca el INE completo dentro del encuadre, con buena luz y sin reflejos.','id-card-outline'],
    ['ine_reverso','2. Reverso del INE','Captura el reverso completo y verifica que los datos se vean nítidos.','card-outline'],
    ['rostro','3. Captura facial','Mira de frente a la cámara, sin gorra ni lentes oscuros y con el rostro iluminado.','person-circle-outline'],
  ];

  return <Screen>
    <Title subtitle="Captura tu INE y una fotografía frontal del rostro. Los archivos se almacenan de forma privada y la decisión final la realiza administración.">Verificación de identidad</Title>
    {status?<Card><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}><Text style={{color:palette.text,fontWeight:'900'}}>Estado de revisión</Text><Badge text={status.estado} tone={status.estado==='aprobada'?'success':status.estado==='rechazada'?'danger':'warning'}/></View>{status.nota_revision?<Text style={{color:palette.muted}}>Nota: {status.nota_revision}</Text>:null}{complete&&status.estado!=='aprobada'?<Text style={{color:palette.success,fontWeight:'800'}}>✓ Capturas completas. Tu solicitud está lista para revisión.</Text>:null}</Card>:null}
    <Card>
      <Text style={{color:palette.text,fontWeight:'900',fontSize:18}}>Antes de escanear</Text>
      <Text style={{color:palette.muted,lineHeight:22}}>NAXVO solicita frente y reverso del INE, además de una selfie frontal. Estas imágenes no se publican en tu perfil. La captura facial sirve para revisión de identidad; no realiza reconocimiento biométrico automático.</Text>
      <Pressable onPress={()=>setConsent(v=>!v)} accessibilityRole="checkbox" accessibilityState={{checked:consent}} style={{flexDirection:'row',gap:12,alignItems:'center',minHeight:48}}><Ionicons name={consent?'checkbox-outline':'square-outline'} color={palette.primary} size={23}/><Text style={{color:palette.text,flex:1}}>Autorizo enviar estas imágenes para el proceso de verificación.</Text></Pressable>
    </Card>
    {steps.map(([kind,title,help,icon])=>{
      const done=kind==='ine'?status?.tiene_ine:kind==='ine_reverso'?status?.tiene_ine_reverso:status?.tiene_rostro;
      return <Card key={kind}>
        <View style={{flexDirection:'row',alignItems:'center',gap:10}}><Ionicons name={icon as any} size={26} color={done?palette.success:palette.primary}/><View style={{flex:1}}><Text style={{color:palette.text,fontWeight:'900'}}>{title}</Text><Text style={{color:palette.muted,lineHeight:19}}>{help}</Text></View>{done?<Badge text="Listo" tone="success"/>:null}</View>
        {preview[kind]?<Image source={{uri:preview[kind]}} resizeMode="cover" style={{height:180,width:'100%',borderRadius:14,backgroundColor:palette.surface2}}/>:null}
        <Button title={done?'Volver a escanear':'Escanear con cámara'} variant="secondary" icon="camera-outline" loading={busy===kind} disabled={Boolean(busy&&busy!==kind)} onPress={()=>void scan(kind)}/>
      </Card>;
    })}
    {error?<Card><Text style={{color:palette.danger,fontWeight:'800'}}>{error}</Text></Card>:null}
  </Screen>;
}
