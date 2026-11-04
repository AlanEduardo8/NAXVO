import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Text, View } from 'react-native';
import { getAdminClientVerifications, getAdminClientDocument, decideClientVerification } from '@/api';
import { Button, Field } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { AdminPage, AdminHeader, AdminSection, AdminPanel, AdminStatus, AdminEmpty, adminConfirm } from '@/components/admin/AdminUI';

type DocKind='ine'|'ine_reverso'|'rostro';
export default function ClientVerifications(){
 const {palette}=useTheme();
 const[items,setItems]=useState<any[]>([]);
 const[document,setDocument]=useState<{id:number;kind:DocKind;uri:string}|null>(null);
 const[note,setNote]=useState<Record<number,string>>({});
 const[seen,setSeen]=useState<Record<number,Partial<Record<DocKind,boolean>>>>({});
 const[busy,setBusy]=useState(false);const[loading,setLoading]=useState(true);const[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{setItems(await getAdminClientVerifications())}catch(e){setError(e instanceof Error?e.message:'No se pudieron cargar las identidades.')}finally{setLoading(false)}},[]);useEffect(()=>{void load()},[load]);
 const preview=async(id:number,kind:DocKind)=>{try{setBusy(true);const uri=await getAdminClientDocument(id,kind);setDocument({id,kind,uri});setSeen(p=>({...p,[id]:{...p[id],[kind]:true}}))}catch(e){Alert.alert('Documento',e instanceof Error?e.message:'No se pudo abrir.')}finally{setBusy(false)}};
 const review=(id:number,decision:'aprobada'|'rechazada')=>{
  const reviewed=seen[id];
  if(decision==='aprobada'&&(!reviewed?.ine||!reviewed?.ine_reverso||!reviewed?.rostro)){Alert.alert('Revisión incompleta','Abre frente y reverso del INE, además de la captura facial, antes de aprobar.');return;}
  if(decision==='rechazada'&&!note[id]?.trim()){Alert.alert('Motivo requerido','Indica la causa de rechazo.');return;}
  adminConfirm(decision==='aprobada'?'Aprobar identidad':'Rechazar identidad','Confirma que revisaste las tres capturas conforme al procedimiento de NAXVO. La comparación biométrica no está automatizada.',async()=>{setBusy(true);try{await decideClientVerification(id,decision,note[id]||'');setDocument(null);await load()}catch(e){Alert.alert('Revisión',e instanceof Error?e.message:'No se pudo completar.')}finally{setBusy(false)}},decision==='rechazada');
 };
 return <AdminPage><AdminHeader back eyebrow="IDENTIDAD DE CLIENTES" title="Revisión documental y facial" description="Revisa frente/reverso del INE y captura frontal del rostro desde rutas privadas." action={<Button title="Actualizar" variant="secondary" icon="refresh-outline" onPress={()=>void load()} loading={loading}/>}/>
  {error?<AdminPanel><Text style={{color:palette.danger}}>{error}</Text><Button title="Reintentar" onPress={()=>void load()}/></AdminPanel>:null}
  {loading?<ActivityIndicator color={palette.primary}/>:items.length?<AdminSection title="Solicitudes de identidad" subtitle="Los tres archivos deben revisarse antes de aprobar">
   {items.map(item=><AdminPanel key={item.usuario_id}>
     <Text style={{color:palette.text,fontWeight:'900',fontSize:17}}>{item.nombre} {item.apellidos}</Text>
     <Text style={{color:palette.muted,fontSize:12}}>{item.email}</Text><AdminStatus text={item.estado} tone={item.estado==='aprobada'?'success':item.estado==='rechazada'?'danger':'warning'}/>
     <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}><View style={{flex:1,minWidth:120}}><Button title="INE frente" variant="secondary" icon="id-card-outline" loading={busy} onPress={()=>void preview(item.usuario_id,'ine')}/></View><View style={{flex:1,minWidth:120}}><Button title="INE reverso" variant="secondary" icon="card-outline" loading={busy} onPress={()=>void preview(item.usuario_id,'ine_reverso')}/></View><View style={{flex:1,minWidth:120}}><Button title="Rostro" variant="secondary" icon="person-outline" loading={busy} onPress={()=>void preview(item.usuario_id,'rostro')}/></View></View>
     {document&&document.id===item.usuario_id?<View style={{gap:8}}><Text style={{color:palette.text,fontWeight:'800'}}>Vista restringida: {document.kind==='ine'?'INE · frente':document.kind==='ine_reverso'?'INE · reverso':'Captura facial'}</Text><Image source={{uri:document.uri}} resizeMode="contain" style={{height:280,width:'100%',borderRadius:14,backgroundColor:palette.surface2}}/><Button title="Cerrar documento" variant="ghost" icon="close-outline" onPress={()=>setDocument(null)}/></View>:null}
     {item.estado==='pendiente'?<><Field label="Notas de revisión" multiline value={note[item.usuario_id]??''} onChangeText={v=>setNote(p=>({...p,[item.usuario_id]:v}))} placeholder="Resultado de la revisión manual"/><View style={{flexDirection:'row',gap:8}}><View style={{flex:1}}><Button title="Aprobar" disabled={busy||!seen[item.usuario_id]?.ine||!seen[item.usuario_id]?.ine_reverso||!seen[item.usuario_id]?.rostro} onPress={()=>review(item.usuario_id,'aprobada')}/></View><View style={{flex:1}}><Button title="Rechazar" disabled={busy} variant="danger" onPress={()=>review(item.usuario_id,'rechazada')}/></View></View></>:null}
   </AdminPanel>)}
  </AdminSection>:<AdminEmpty iconName="id-card-outline" title="Sin solicitudes de identidad" subtitle="No existen documentos pendientes en esta consulta."/>}
 </AdminPage>;
}
