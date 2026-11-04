import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import { getAdminVerifications, getAdminProfessionalDocument, reviewAdminVerification } from '@/api';
import { Avatar, Button, Field } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { AdminHeader, AdminNavCard, AdminPage, AdminSection, AdminPanel, AdminStatus, AdminLoading, AdminEmpty, adminConfirm } from '@/components/admin/AdminUI';

type DocKind='ine_frente'|'ine_reverso'|'rostro';
export default function AdminVerifications(){
 const{palette}=useTheme();const[state,setState]=useState('pendiente');const[items,setItems]=useState<any[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('');const[notes,setNotes]=useState<Record<number,string>>({});const[busy,setBusy]=useState<number|null>(null);const[doc,setDoc]=useState<{id:number;kind:DocKind;uri:string}|null>(null);const[seen,setSeen]=useState<Record<number,Partial<Record<DocKind,boolean>>>>({});
 const load=useCallback(async()=>{setLoading(true);setError('');try{setItems(await getAdminVerifications(state))}catch(e){setError(e instanceof Error?e.message:'No se pudieron cargar las verificaciones.')}finally{setLoading(false)}},[state]);useEffect(()=>{void load()},[load]);
 async function preview(id:number,kind:DocKind){setBusy(id);try{const uri=await getAdminProfessionalDocument(id,kind);setDoc({id,kind,uri});setSeen(v=>({...v,[id]:{...v[id],[kind]:true}}))}catch(e){Alert.alert('Verificación',e instanceof Error?e.message:'No se pudo abrir.')}finally{setBusy(null)}}
 const decide=(id:number,decision:'aprobada'|'rechazada')=>{
  if(decision==='aprobada'&&(!seen[id]?.ine_frente||!seen[id]?.ine_reverso||!seen[id]?.rostro)){Alert.alert('Revisión incompleta','Abre el frente, reverso del INE y la captura facial antes de aprobar.');return;}
  adminConfirm(decision==='aprobada'?'Aprobar profesional':'Rechazar verificación',`Se registrará la decisión administrativa para la cuenta #${id}.`,async()=>{setBusy(id);try{await reviewAdminVerification(id,decision,notes[id]??'');setDoc(null);await load();Alert.alert('Verificación',decision==='aprobada'?'Se aprobó la verificación.':'Se registró el rechazo.')}catch(e){Alert.alert('Verificación',e instanceof Error?e.message:'No se pudo actualizar.')}finally{setBusy(null)}},decision==='rechazada');
 };
 return <AdminPage>
  <AdminHeader eyebrow="CONFIANZA Y SEGURIDAD" title="Verificación de cuentas" description="Revisa INE por ambos lados y la captura facial antes de aprobar profesionales. La decisión final permanece bajo control administrativo." action={<Button title="Actualizar" variant="secondary" icon="refresh-outline" onPress={()=>void load()} loading={loading}/>}/>
  <AdminNavCard title="Identidad de clientes" subtitle="Revisar frente/reverso de INE y fotografía de rostro" iconName="id-card-outline" to="/admin/client-verifications"/>
  <AdminSection title="Profesionales" subtitle="Solicitudes de verificación y su estado actual">
   <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{['pendiente','aprobada','rechazada'].map(x=><View key={x} style={{minWidth:100}}><Button title={x} variant={state===x?'primary':'secondary'} onPress={()=>setState(x)}/></View>)}</View>
   {error?<AdminPanel><Text style={{color:palette.danger}}>{error}</Text></AdminPanel>:null}
   {loading?<AdminLoading/>:items.length?items.map(u=><AdminPanel key={u.id}>
    <View style={{flexDirection:'row',alignItems:'center',gap:12}}><Avatar uri={u.foto_url} name={u.nombre||'Profesional'} size={54}/><View style={{flex:1,gap:4}}><Text style={{color:palette.text,fontSize:16,fontWeight:'900'}}>{u.nombre} {u.apellidos}</Text><Text style={{color:palette.muted,fontSize:12}}>{u.especialidad||'Especialidad sin especificar'} · {u.anos_experiencia??0} años</Text></View><AdminStatus text={u.verificacion_estado} tone={u.verificado?'success':u.verificacion_estado==='rechazada'?'danger':'warning'}/></View>
    <Text style={{color:palette.muted,fontSize:12}}>Identificación declarada: {u.verificacion_identificacion||u.identificacion||'No indicada'}</Text>
    <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}><View style={{flex:1,minWidth:115}}><Button title="INE frente" variant="secondary" icon="id-card-outline" loading={busy===u.id} onPress={()=>void preview(u.id,'ine_frente')}/></View><View style={{flex:1,minWidth:115}}><Button title="INE reverso" variant="secondary" icon="card-outline" loading={busy===u.id} onPress={()=>void preview(u.id,'ine_reverso')}/></View><View style={{flex:1,minWidth:115}}><Button title="Rostro" variant="secondary" icon="person-outline" loading={busy===u.id} onPress={()=>void preview(u.id,'rostro')}/></View></View>
    {doc&&doc.id===u.id?<View style={{gap:8}}><Text style={{color:palette.text,fontWeight:'900'}}>Vista privada: {doc.kind==='ine_frente'?'INE · frente':doc.kind==='ine_reverso'?'INE · reverso':'Captura facial'}</Text><Image source={{uri:doc.uri}} resizeMode="contain" style={{height:280,width:'100%',borderRadius:14,backgroundColor:palette.surface2}}/><Button title="Cerrar" variant="ghost" onPress={()=>setDoc(null)}/></View>:null}
    {u.verificacion_nota?<Text style={{color:palette.muted,fontSize:12}}>Nota anterior: {u.verificacion_nota}</Text>:null}
    {state==='pendiente'?<><Field label="Observaciones de revisión" value={notes[u.id]??''} onChangeText={v=>setNotes(n=>({...n,[u.id]:v}))} placeholder="Motivo obligatorio si rechazas" multiline/><View style={{flexDirection:'row',gap:8}}><View style={{flex:1}}><Button title="Aprobar" icon="checkmark-outline" disabled={busy===u.id||!seen[u.id]?.ine_frente||!seen[u.id]?.ine_reverso||!seen[u.id]?.rostro} loading={busy===u.id} onPress={()=>decide(u.id,'aprobada')}/></View><View style={{flex:1}}><Button title="Rechazar" icon="close-outline" variant="danger" loading={busy===u.id} onPress={()=>decide(u.id,'rechazada')}/></View></View></>:null}
   </AdminPanel>):<AdminEmpty iconName="shield-checkmark-outline" title="Sin verificaciones" subtitle={`No se encontraron profesionales con estado ${state}.`}/>} 
  </AdminSection>
 </AdminPage>;
}
