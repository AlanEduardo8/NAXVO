import { useEffect, useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getVerification, submitProfessionalVerificationScan } from '@/api';
import { ApiError } from '@/api/client';
import { Badge, Button, Card, Field, Screen, Title } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';

type ScanKey='ineFront'|'ineBack'|'face';
type ScanAsset={uri:string;mimeType?:string|null};

export default function Verification(){
 const{palette}=useTheme();
 const[status,setStatus]=useState<any>(null);
 const[id,setId]=useState('');
 const[scans,setScans]=useState<Record<ScanKey,ScanAsset|undefined>>({ineFront:undefined,ineBack:undefined,face:undefined});
 const[capturing,setCapturing]=useState<ScanKey|null>(null);
 const[busy,setBusy]=useState(false);
 async function load(){try{setStatus(await getVerification())}catch{}}
 useEffect(()=>{void load()},[]);
 async function capture(kind:ScanKey){
  const permission=await ImagePicker.requestCameraPermissionsAsync();
  if(!permission.granted){Alert.alert('Cámara','Necesitamos permiso para escanear tu INE y rostro.');return;}
  const face=kind==='face';
  setCapturing(kind);
  try{
    const r=await ImagePicker.launchCameraAsync({mediaTypes:['images'],allowsEditing:true,aspect:face?[1,1]:[4,3],quality:.9,cameraType:face?ImagePicker.CameraType.front:ImagePicker.CameraType.back});
    if(!r.canceled&&r.assets[0])setScans(s=>({...s,[kind]:{uri:r.assets[0].uri,mimeType:r.assets[0].mimeType}}));
  }finally{setCapturing(null)}
 }
 async function send(){
  if(id.trim().length<3)return Alert.alert('Identificación','Escribe el identificador de tu INE o documento oficial.');
  if(!scans.ineFront||!scans.ineBack||!scans.face)return Alert.alert('Capturas incompletas','Escanea el frente y reverso del INE, además de tu rostro.');
  setBusy(true);
  try{await submitProfessionalVerificationScan(id.trim(),{ineFront:scans.ineFront,ineBack:scans.ineBack,face:scans.face});Alert.alert('Enviado','Tu INE y captura facial quedaron en revisión.');setScans({ineFront:undefined,ineBack:undefined,face:undefined});await load()}
  catch(e){Alert.alert('No se pudo enviar',e instanceof ApiError?e.message:'Intenta otra vez.')}finally{setBusy(false)}
 }
 const items:[ScanKey,string,string,string][]=[['ineFront','Frente del INE','Captura completa, legible y sin reflejos.','id-card-outline'],['ineBack','Reverso del INE','Incluye el reverso completo dentro del encuadre.','card-outline'],['face','Captura facial','Mira al frente, con buena iluminación y sin accesorios que cubran el rostro.','person-circle-outline']];
 return <Screen>
  <Title subtitle="La verificación profesional requiere INE por ambos lados y captura frontal del rostro. Administración revisa la documentación antes de aprobar tu cuenta.">Verificación profesional</Title>
  {status?<Card><Badge text={status.verificado?'Verificado':status.estado} tone={status.verificado?'success':status.estado==='rechazada'?'danger':'warning'}/>{status.nota?<Text style={{color:palette.text}}>Nota: {status.nota}</Text>:null}{status.solicitada_at?<Text style={{color:palette.muted}}>Enviado: {status.solicitada_at}</Text>:null}</Card>:null}
  <Card><View style={{flexDirection:'row',gap:10,alignItems:'center'}}><Ionicons name="shield-checkmark-outline" size={28} color={palette.primary}/><Text style={{color:palette.muted,flex:1,lineHeight:20}}>La captura facial se utiliza para revisión manual de identidad. No se ejecuta reconocimiento biométrico automático.</Text></View></Card>
  <Field label="Número o identificador" value={id} onChangeText={setId} placeholder="Identificación oficial"/>
  {items.map(([kind,title,help,icon])=><Card key={kind}><View style={{flexDirection:'row',alignItems:'center',gap:10}}><Ionicons name={icon as any} size={26} color={scans[kind]?palette.success:palette.primary}/><View style={{flex:1}}><Text style={{color:palette.text,fontWeight:'900'}}>{title}</Text><Text style={{color:palette.muted}}>{help}</Text></View>{scans[kind]?<Badge text="Listo" tone="success"/>:null}</View>{scans[kind]?<Image source={{uri:scans[kind]!.uri}} style={{height:180,width:'100%',borderRadius:14,backgroundColor:palette.surface2}}/>:null}<Button title={scans[kind]?'Volver a escanear':'Escanear con cámara'} variant="secondary" icon="camera-outline" loading={capturing===kind} disabled={Boolean(capturing&&capturing!==kind)||busy} onPress={()=>void capture(kind)}/></Card>)}
  <Button title="Enviar a revisión" icon="shield-checkmark-outline" onPress={send} loading={busy}/>
  <Button title="Volver" variant="ghost" onPress={()=>router.back()}/>
 </Screen>;
}
