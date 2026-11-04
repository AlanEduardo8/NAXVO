import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { getAdminUsers } from '@/api';
import { Button, Avatar, Field } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { AdminPage, AdminHeader, AdminSection, AdminPanel, AdminFilters, AdminStatus, AdminPager, AdminEmpty, AdminLoading, adminNumber } from '@/components/admin/AdminUI';
const roles=[{value:'',label:'Todos'},{value:'cliente',label:'Clientes'},{value:'trabajador',label:'Profesionales'},{value:'admin',label:'Administradores'}];
const states=[{value:'',label:'Cualquier estado'},{value:'activo',label:'Activos'},{value:'suspendido',label:'Suspendidos'}];
export default function AdminUsers(){
 const{palette}=useTheme();const[q,setQ]=useState('');const[role,setRole]=useState('');const[status,setStatus]=useState('');const[page,setPage]=useState(1);const[data,setData]=useState<any>(null);const[loading,setLoading]=useState(false);const[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{setData(await getAdminUsers({q,tipo:role,estado:status,page}))}catch(e){setError(e instanceof Error?e.message:'No se pudo consultar el directorio.')}finally{setLoading(false)}},[q,role,status,page]);
 useEffect(()=>{void load()},[role,status,page]);const items=data?.items??[];
 return <AdminPage>
  <AdminHeader eyebrow="GESTIÓN DE CUENTAS" title="Usuarios de NAXVO" description="Consulta expedientes, actividad y estados de cuenta. Las acciones sensibles se realizan desde el expediente individual." action={<Button title="Actualizar" variant="secondary" icon="refresh-outline" onPress={()=>void load()} loading={loading}/>}/>
  <AdminPanel>
   <Field label="Buscar en el directorio" value={q} onChangeText={setQ} onSubmitEditing={()=>{setPage(1);void load()}} returnKeyType="search" placeholder="Nombre, correo o teléfono"/>
   <AdminFilters items={roles} value={role} onChange={v=>{setRole(v);setPage(1)}}/>
   <AdminFilters items={states} value={status} onChange={v=>{setStatus(v);setPage(1)}}/>
   <Button title="Aplicar búsqueda" icon="search-outline" onPress={()=>{setPage(1);void load()}} loading={loading}/>
  </AdminPanel>
  <AdminSection title="Resultados" subtitle={data?`${adminNumber(data.total)} usuarios coinciden con los filtros`:'Consulta de cuentas y perfiles'}>
   {error?<AdminPanel><Text style={{color:palette.danger}}>{error}</Text><Button title="Reintentar" onPress={()=>void load()}/></AdminPanel>:null}
   {loading&&!data?<AdminLoading/>:items.length?items.map((u:any)=><AdminPanel key={u.id}>
     <View style={{flexDirection:'row',gap:12,alignItems:'center'}}><Avatar uri={u.foto_url} name={u.nombre||'NAXVO'} size={52}/><View style={{flex:1,gap:5}}><Text style={{color:palette.text,fontWeight:'900',fontSize:16}} numberOfLines={2}>{u.nombre} {u.apellidos}</Text><Text style={{color:palette.muted,fontSize:12}} numberOfLines={1}>{u.email}</Text></View><AdminStatus text={u.estado_cuenta} tone={u.estado_cuenta==='activo'?'success':'danger'}/></View>
     <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}><AdminStatus text={u.tipo} tone="info"/>{u.tipo==='trabajador'?<AdminStatus text={u.verificacion_estado} tone={u.verificado?'success':'warning'}/>:null}</View>
     <Text style={{color:palette.muted,fontSize:12}}>{adminNumber(u.total_solicitudes)} solicitudes relacionadas · Cuenta #{u.id}</Text>
     <Button title="Abrir expediente" icon="open-outline" variant="secondary" onPress={()=>router.push(`/admin/user/${u.id}`)}/>
   </AdminPanel>):!loading?<AdminEmpty iconName="people-outline" title="No encontramos usuarios" subtitle="Prueba con otro nombre, rol o estado para ampliar la búsqueda."/>:null}
   <AdminPager page={page} pages={Number(data?.pages)||1} onChange={setPage}/>
  </AdminSection>
 </AdminPage>;
}
