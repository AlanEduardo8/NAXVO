import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { createServiceOffering, deleteServiceOffering, getCategories, getMyServices, toggleServiceOffering, updateServiceOffering } from '@/api';
import { ApiError } from '@/api/client';
import { Badge, Button, Card, Empty, Field, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { WorkerHero, WorkerMetric, WorkerSection } from '@/components/WorkerPanels';
import type { Category, ServiceOffering } from '@/types/api';

export default function WorkerServices() {
  const { user } = useAuth(); const { palette } = useTheme();
  const [formOpen,setFormOpen]=useState(false); const [items, setItems] = useState<ServiceOffering[]>([]); const [cats, setCats] = useState<Category[]>([]); const [busy, setBusy] = useState(false); const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ categoria: user?.especialidad || '', titulo: '', descripcion: '', precio_desde: '', duracion_minutos: '', modalidad: user?.modalidad_servicio || 'domicilio' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  async function load() { try { setItems(await getMyServices()); } catch (e: any) { Alert.alert('Servicios', e.message ?? 'No se pudieron cargar.'); } }
  useEffect(() => { load(); getCategories().then(setCats).catch(() => undefined); }, []);

  async function save() {
    if (!form.titulo.trim() || !form.categoria) return Alert.alert('Servicio', 'Agrega un título y una categoría.');
    setBusy(true); try { if (editingId) { await updateServiceOffering(editingId, form); Alert.alert('Servicio actualizado', 'Los cambios quedaron guardados.'); } else { const x = await createServiceOffering(form); Alert.alert(x.published ? 'Servicio publicado' : 'Servicio guardado', x.message); } setEditingId(null);setFormOpen(false); setForm(f => ({ ...f, titulo: '', descripcion: '', precio_desde: '', duracion_minutos: '' })); await load(); } catch (e) { Alert.alert('No se pudo guardar', e instanceof ApiError ? e.message : 'Revisa los datos.'); } finally { setBusy(false); }
  }
  function edit(item: ServiceOffering) { setFormOpen(true);setEditingId(item.id); setForm({ categoria:item.categoria, titulo:item.titulo, descripcion:item.descripcion||'', precio_desde:item.precio_desde!=null?String(item.precio_desde):'', duracion_minutos:item.duracion_minutos?String(item.duracion_minutos):'', modalidad:item.modalidad }); }
  function cancelEdit() { setFormOpen(false);setEditingId(null); setForm({ categoria:user?.especialidad||'', titulo:'', descripcion:'', precio_desde:'', duracion_minutos:'', modalidad:user?.modalidad_servicio||'domicilio' }); }
  async function toggle(item: ServiceOffering) { try { await toggleServiceOffering(item.id, !item.activo); await load(); } catch (e: any) { Alert.alert('Publicación', e.message ?? 'No se pudo actualizar.'); } }
  function remove(item: ServiceOffering) { Alert.alert('Eliminar servicio', `¿Eliminar “${item.titulo}”?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: async () => { try { await deleteServiceOffering(item.id); await load(); } catch (e: any) { Alert.alert('Servicio', e.message ?? 'No se pudo eliminar.'); } } }]); }
  const mainOnly = Boolean(user?.especialidad && user.especialidad !== 'Mantenimiento General');

  return <Screen>
    <WorkerHero eyebrow="Catálogo profesional" title="Mis servicios" description="Publica lo que ofreces, comunica el alcance de cada servicio y controla qué publicaciones ven los clientes." icon="storefront-outline" action={<Button title={formOpen?'Cerrar editor':'Publicar nuevo servicio'} icon={formOpen?'close-outline':'add-circle-outline'} onPress={()=>{if(formOpen)cancelEdit();else setFormOpen(true)}}/>}/>
    <View style={{flexDirection:'row',gap:10}}><WorkerMetric label="Registrados" value={items.length} icon="layers-outline"/><WorkerMetric label="Publicados" value={items.filter(x=>x.activo).length} icon="eye-outline"/><WorkerMetric label="En borrador" value={items.filter(x=>!x.activo).length} icon="create-outline"/></View>
    {!user?.verificado ? <Card><Text style={{ color: palette.warning, fontWeight: '800' }}>Puedes preparar tus servicios, pero se publicarán cuando tu verificación profesional sea aprobada.</Text></Card> : null}
    {formOpen?<Card>
      <Text style={{ color: palette.text, fontWeight: '900', fontSize: 18 }}>{editingId ? 'Editar servicio' : 'Publicar un servicio'}</Text>
      {mainOnly ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ color: palette.muted }}>Categoría:</Text><Badge text={user?.especialidad || ''}/></View> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{cats.map(c => <Pressable key={c.slug} onPress={() => set('categoria', c.name)} style={{ borderWidth: 1, borderColor: form.categoria === c.name ? palette.primary : palette.border, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7 }}><Text style={{ color: palette.text }}>{c.name}</Text></Pressable>)}</View>}
      <Field label="Nombre del servicio" value={form.titulo} onChangeText={v => set('titulo', v)} placeholder="Ej. Instalación de contactos eléctricos"/>
      <Field label="Descripción" value={form.descripcion} onChangeText={v => set('descripcion', v)} multiline placeholder="Qué incluye, alcance y condiciones…"/>
      <Field label="Precio desde (MXN, opcional)" value={form.precio_desde} onChangeText={v => set('precio_desde', v)} keyboardType="decimal-pad"/>
      <Field label="Duración estimada en minutos (opcional)" value={form.duracion_minutos} onChangeText={v => set('duracion_minutos', v)} keyboardType="number-pad"/>
      <Text style={{ color: palette.text, fontWeight: '800' }}>Modalidad</Text>
      <View style={{ flexDirection: 'row', gap: 7 }}>{['domicilio', 'taller', 'ambos'].map(x => <Pressable key={x} onPress={() => set('modalidad', x)} style={{ flex: 1, borderWidth: 1, borderColor: form.modalidad === x ? palette.primary : palette.border, borderRadius: 12, padding: 9 }}><Text style={{ color: palette.text, textAlign: 'center' }}>{x}</Text></Pressable>)}</View>
      <Button title={editingId ? "Guardar cambios" : "Guardar servicio"} icon={editingId ? "save-outline" : "add-circle-outline"} loading={busy} onPress={save}/>{editingId?<Button title="Cancelar edición" variant="ghost" onPress={cancelEdit}/>:null}
    </Card>:null}
    <WorkerSection title="Tu catálogo" subtitle={`${items.length} servicios registrados`} action={{label:formOpen?'Ocultar editor':'Agregar servicio',onPress:()=>setFormOpen(v=>!v)}}>
      <Text style={{color:palette.muted,fontSize:13}}>Edita, pausa o elimina las publicaciones que ya no ofreces.</Text>
    </WorkerSection>
    {items.length ? items.map(item => <Card key={item.id}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><View style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '900', fontSize: 17 }}>{item.titulo}</Text><Text style={{ color: palette.muted }}>{item.categoria}</Text></View><Badge text={item.activo ? 'Publicado' : 'Borrador'} tone={item.activo ? 'success' : 'warning'}/></View>
      {item.descripcion ? <Text style={{ color: palette.muted }}>{item.descripcion}</Text> : null}
      <Text style={{ color: palette.text }}>{item.precio_desde != null ? `Desde $${item.precio_desde.toFixed(2)} MXN` : 'Precio mediante cotización'}{item.duracion_minutos ? ` · ${item.duracion_minutos} min` : ''}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button title="Editar" variant="secondary" onPress={() => edit(item)}/></View><View style={{ flex: 1 }}><Button title={item.activo ? 'Pausar' : 'Publicar'} variant="secondary" onPress={() => toggle(item)}/></View></View><Button title="Eliminar" variant="danger" onPress={() => remove(item)}/>
    </Card>) : <Empty icon="storefront-outline" title="Aún no publicas servicios" text="Crea al menos uno para que los clientes puedan encontrarte en el catálogo."/>}
  </Screen>;
}
