import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { getAdminAudit } from '@/api';
import { Button } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { AdminPage, AdminHeader, AdminPanel, AdminSection, AdminRow, AdminPager, AdminEmpty, AdminLoading, adminNumber, adminDate } from '@/components/admin/AdminUI';
export default function Audit(){
 const{palette}=useTheme();const[page,setPage]=useState(1);const[data,setData]=useState<any>(null);const[loading,setLoading]=useState(false);const[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{setData(await getAdminAudit(page))}catch(e){setError(e instanceof Error?e.message:'No se pudo cargar la auditoría.')}finally{setLoading(false)}},[page]);useEffect(()=>{void load()},[page]);
 return <AdminPage><AdminHeader back eyebrow="TRAZABILIDAD" title="Auditoría administrativa" description="Registro de acciones ejecutadas por administradores, decisiones de moderación y cambios relevantes." action={<Button title="Actualizar" icon="refresh-outline" variant="secondary" onPress={()=>void load()} loading={loading}/>}/>
   <AdminSection title="Registro de actividad" subtitle={data?`${adminNumber(data.total)} entradas registradas`:'Acciones administrativas en orden cronológico'}>
    {error?<AdminPanel><Text style={{color:palette.danger}}>{error}</Text><Button title="Reintentar" onPress={()=>void load()}/></AdminPanel>:null}
    {loading&&!data?<AdminLoading/>:data?.items?.length?<AdminPanel>{data.items.map((a:any)=><AdminRow key={a.id} iconName="document-text-outline" title={a.accion?.replaceAll('_',' ')||'Acción administrativa'} description={a.descripcion||'Sin descripción'} meta={`${a.admin_nombre||'Administrador'} · ${a.entidad_tipo||'Entidad'}${a.entidad_id?` #${a.entidad_id}`:''} · ${adminDate(a.fecha)}`}/>)}</AdminPanel>:!loading?<AdminEmpty iconName="document-text-outline" title="Sin registros" subtitle="Todavía no se han registrado decisiones administrativas."/>:null}
    <AdminPager page={page} pages={Number(data?.pages)||1} onChange={setPage}/>
   </AdminSection>
 </AdminPage>;
}
