import { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { disconnectMercadoPago, getCategories, getMercadoPagoConnection, startMercadoPagoConnection, uploadProfilePhoto, updateProfile, switchAccountRole } from '@/api';
import { DatePickerField } from '@/components/SchedulePicker';
import { ApiError } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Avatar, Badge, Button, Card, Field, Screen, Title } from '@/components/ui';
import type { Category } from '@/types/api';

type FieldErrors = Record<string, string>;

const editableFields = [
  'nombre', 'apellidos', 'telefono', 'fecha_nacimiento', 'direccion', 'ciudad', 'estado',
  'codigo_postal', 'biografia', 'facebook', 'instagram', 'linkedin', 'sitio_web',
  'profesion', 'especialidad', 'especialidades', 'anos_experiencia', 'experiencia',
  'zona_servicio', 'radio_servicio_km', 'modalidad_servicio', 'horario_disponibilidad',
] as const;

function buildPayload(form: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  for (const key of editableFields) {
    const value = form[key];
    payload[key] = value == null ? '' : String(value).trim();
  }
  return payload;
}

function errorFields(error: ApiError): FieldErrors {
  const fields = error.details?.fields;
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return {};
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => typeof value === 'string') as [string, string][],
  );
}

export default function ProfileScreen() {
  const { user, signOut, replaceUser } = useAuth();
  const { palette } = useTheme();
  const [busy, setBusy] = useState(false);
  const [countryPrefix, setCountryPrefix] = useState('+52');
  const [prefixOpen,setPrefixOpen]=useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [mpConnection,setMpConnection]=useState<{connected:boolean;provider_user_id?:string|null;expires_at?:string|null}|null>(null);
  const [mpBusy,setMpBusy]=useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      ...user,
      anos_experiencia: user.anos_experiencia?.toString() ?? '',
      radio_servicio_km: user.radio_servicio_km?.toString() ?? '',
      modalidad_servicio: user.modalidad_servicio || 'domicilio',
      telefono: String(user.telefono||'').replace(/^(?:\+52|\+1|\+34|\+57|\+54|\+51|\+56)[ -]?/,''),
    });
    const match=String(user.telefono||'').match(/^(\+52|\+1|\+34|\+57|\+54|\+51|\+56)(?=\s|\d)/);
    setCountryPrefix(match?.[1]||'+52');
  }, [user]);

  useEffect(() => {
    if (user?.tipo !== 'trabajador') return;
    getCategories().then(setCategories).catch(() => setCategories([]));
    getMercadoPagoConnection().then(setMpConnection).catch(() => setMpConnection({connected:false}));
  }, [user?.tipo]);

  async function connectMercadoPago(){
    setMpBusy(true);
    try{
      const result=await startMercadoPagoConnection();
      if(!result.authorization_url) throw new Error('No se recibió la liga de autorización.');
      await Linking.openURL(result.authorization_url);
    }catch(e){Alert.alert('Mercado Pago',e instanceof Error?e.message:'No se pudo iniciar la vinculación.');}
    finally{setMpBusy(false);}
  }

  function unlinkMercadoPago(){
    Alert.alert('Desvincular Mercado Pago','No podrás recibir pagos de nuevas solicitudes hasta volver a vincular tu cuenta.',[
      {text:'Cancelar',style:'cancel'},
      {text:'Desvincular',style:'destructive',onPress:async()=>{setMpBusy(true);try{await disconnectMercadoPago();setMpConnection({connected:false});}catch(e){Alert.alert('Mercado Pago',e instanceof Error?e.message:'No se pudo desvincular.');}finally{setMpBusy(false)}}},
    ]);
  }

  if (!user) return null;

  const set = (key: string, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
    if (errors[key]) setErrors(current => ({ ...current, [key]: '' }));
  };

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      const fresh = await updateProfile({...buildPayload(form),telefono:form.telefono?`${countryPrefix}${String(form.telefono).replace(/[^0-9]/g,'')}`:''});
      replaceUser(fresh);
      setForm({
        ...fresh,
        anos_experiencia: fresh.anos_experiencia?.toString() ?? '',
        radio_servicio_km: fresh.radio_servicio_km?.toString() ?? '',
        modalidad_servicio: fresh.modalidad_servicio || 'domicilio',
        telefono: String(fresh.telefono||'').replace(/^(?:\+52|\+1|\+34|\+57|\+54|\+51|\+56)[ -]?/,''),
      });
      Alert.alert('Perfil actualizado', 'Tus cambios se guardaron correctamente.');
    } catch (error) {
      if (error instanceof ApiError) {
        const fields = errorFields(error);
        setErrors(fields);
        const messages = Object.values(fields);
        Alert.alert(
          'Revisa estos datos',
          messages.length ? messages.join('\n') : error.message,
        );
      } else {
        Alert.alert('No se pudo guardar', 'Intenta otra vez.');
      }
    } finally {
      setBusy(false);
    }
  }

  const confirmRole=(title:string,message:string,action:()=>Promise<void>)=>{
    if(Platform.OS==='web'){if(typeof window!=='undefined'&&window.confirm(`${title}\n\n${message}`))void action();return;}
    Alert.alert(title,message,[{text:'Cancelar',style:'cancel'},{text:'Continuar',onPress:()=>void action()}]);
  };

  async function photo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled) return;

    setBusy(true);
    try {
      replaceUser(await uploadProfilePhoto({
        uri: result.assets[0].uri,
        mimeType: result.assets[0].mimeType,
      }));
    } catch (error) {
      Alert.alert('No se pudo subir', error instanceof ApiError ? error.message : 'Intenta otra vez.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{borderRadius:24,padding:20,backgroundColor:palette.surface2,alignItems:'center',gap:12}}>
        <Pressable onPress={photo}>
          <Avatar uri={user.foto_url} name={user.nombre} size={92} />
          <View style={{ position: 'absolute', right: 0, bottom: 0, backgroundColor: palette.primary, borderRadius: 99, padding: 7 }}>
            <Ionicons name="camera-outline" color={palette.primaryText} size={17}/>
          </View>
        </Pressable>
        <Text style={{ color: palette.text, fontSize: 22, fontWeight: '900' }}>{user.nombre} {user.apellidos}</Text>
        <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Badge text={user.tipo === 'trabajador' ? 'Profesional' : user.tipo === 'admin' ? 'Administrador' : 'Cliente'} tone="info" />
          {user.tipo === 'trabajador' ? (
            <Badge text={user.verificado ? 'Verificado' : `Verificación: ${user.verificacion_estado}`} tone={user.verificado ? 'success' : 'warning'} />
          ) : null}
        </View>
      </View>

      <Card>
        <Title subtitle="Puedes guardar tus datos personales aunque todavía no hayas completado toda la información profesional.">Datos personales</Title>
        <Field label="Nombre" value={form.nombre ?? ''} onChangeText={v => set('nombre', v)} error={errors.nombre} />
        <Field label="Apellidos" value={form.apellidos ?? ''} onChangeText={v => set('apellidos', v)} error={errors.apellidos} />
        <Text style={{color:palette.text,fontWeight:'700'}}>Teléfono con prefijo internacional</Text>
        <View style={{flexDirection:'row',gap:10,alignItems:'flex-end'}}>
          <View style={{gap:7}}>
            <Text style={{color:palette.muted,fontSize:12,fontWeight:'700'}}>País</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Seleccionar prefijo del país, actual ${countryPrefix}`} onPress={()=>setPrefixOpen(true)} style={{height:51,borderRadius:13,borderWidth:1,borderColor:palette.border,paddingHorizontal:14,backgroundColor:palette.surface2,flexDirection:'row',alignItems:'center',gap:10}}>
              <Ionicons name="globe-outline" color={palette.primary} size={18}/>
              <Text style={{color:palette.text,fontSize:16,fontWeight:'800'}}>{countryPrefix}</Text>
              <Ionicons name="chevron-down" color={palette.muted} size={16}/>
            </Pressable>
          </View>
          <View style={{flex:1}}><Field label="Número telefónico" value={form.telefono??''} onChangeText={v=>set('telefono',v.replace(/[^0-9]/g,''))} keyboardType="phone-pad" error={errors.telefono}/></View>
        </View>
        <Modal visible={prefixOpen} transparent animationType="fade" onRequestClose={()=>setPrefixOpen(false)}>
          <View style={{flex:1,backgroundColor:'rgba(5,3,16,.67)',justifyContent:'center',padding:24}}>
            <View style={{maxWidth:430,width:'100%',alignSelf:'center',borderRadius:22,borderColor:palette.border,borderWidth:1,backgroundColor:palette.surface,padding:18,gap:12}}>
              <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
                <Text style={{color:palette.text,fontSize:19,fontWeight:'900'}}>Prefijo telefónico</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Cerrar selección de país" onPress={()=>setPrefixOpen(false)} style={{padding:9}}><Ionicons name="close" size={24} color={palette.text}/></Pressable>
              </View>
              <Text style={{color:palette.muted,fontSize:13}}>Elige el país al que corresponde tu número.</Text>
              <ScrollView style={{maxHeight:310}} contentContainerStyle={{gap:7}}>
                {([['+52','México'],['+1','Estados Unidos / Canadá'],['+34','España'],['+57','Colombia'],['+54','Argentina'],['+51','Perú'],['+56','Chile']] as const).map(([key,label])=><Pressable key={key} accessibilityRole="button" onPress={()=>{setCountryPrefix(key);setPrefixOpen(false)}} style={{padding:14,backgroundColor:countryPrefix===key?palette.surface2:palette.background,borderRadius:12,borderWidth:1,borderColor:countryPrefix===key?palette.primary:palette.border,flexDirection:'row',alignItems:'center',gap:10}}>
                  <Text style={{color:palette.text,fontSize:15,fontWeight:'700',flex:1}}>{label}</Text><Text style={{color:palette.primary,fontWeight:'900'}}>{key}</Text>{countryPrefix===key?<Ionicons name="checkmark-circle" size={20} color={palette.primary}/>:null}
                </Pressable>)}
              </ScrollView>
            </View>
          </View>
        </Modal>
        <DatePickerField label="Fecha de nacimiento" value={form.fecha_nacimiento??''} onChange={v=>set('fecha_nacimiento',v)} birthDate/>
        {errors.fecha_nacimiento?<Text style={{color:palette.danger}}>{errors.fecha_nacimiento}</Text>:null}
        <Field label="Dirección" value={form.direccion ?? ''} onChangeText={v => set('direccion', v)} error={errors.direccion} />
        <Field label="Ciudad" value={form.ciudad ?? ''} onChangeText={v => set('ciudad', v)} error={errors.ciudad} />
        <Field label="Estado" value={form.estado ?? ''} onChangeText={v => set('estado', v)} error={errors.estado} />
        <Field label="Código postal" value={form.codigo_postal ?? ''} onChangeText={v => set('codigo_postal', v)} keyboardType="number-pad" error={errors.codigo_postal} />
        <Field label="Biografía" value={form.biografia ?? ''} onChangeText={v => set('biografia', v)} multiline error={errors.biografia} />
      </Card>

      {user.tipo === 'trabajador' ? (
        <Card>
          <Title subtitle="Completa estos datos para que los clientes entiendan qué haces y dónde trabajas. Puedes completarlos poco a poco.">Perfil profesional</Title>
          <Field label="Profesión u oficio" value={form.profesion ?? ''} onChangeText={v => set('profesion', v)} placeholder="Ej. Electricista residencial" error={errors.profesion} />

          <View style={{ gap: 8 }}>
            <Text style={{ color: palette.text, fontWeight: '700' }}>Categoría principal</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {categories.map(category => {
                const active = form.especialidad === category.name;
                return (
                  <Pressable
                    key={category.slug}
                    onPress={() => set('especialidad', category.name)}
                    style={{
                      borderWidth: 1,
                      borderColor: active ? palette.primary : palette.border,
                      backgroundColor: active ? palette.surface2 : palette.surface,
                      borderRadius: 99,
                      paddingHorizontal: 11,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: palette.text, fontWeight: active ? '800' : '600' }}>{category.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.especialidad ? <Text style={{ color: palette.danger }}>⚠ {errors.especialidad}</Text> : null}
          </View>

          <Field label="Especialidades" value={form.especialidades ?? ''} onChangeText={v => set('especialidades', v)} multiline placeholder="Ej. Tableros, iluminación, instalaciones" error={errors.especialidades} />
          <Field label="Años de experiencia" value={form.anos_experiencia ?? ''} onChangeText={v => set('anos_experiencia', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" error={errors.anos_experiencia} />
          <Field label="Experiencia" value={form.experiencia ?? ''} onChangeText={v => set('experiencia', v)} multiline error={errors.experiencia} />
          <Field label="Zona de servicio" value={form.zona_servicio ?? ''} onChangeText={v => set('zona_servicio', v)} error={errors.zona_servicio} />
          <Field label="Radio de servicio (km)" value={form.radio_servicio_km ?? ''} onChangeText={v => set('radio_servicio_km', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" error={errors.radio_servicio_km} />

          <View style={{ gap: 8 }}>
            <Text style={{ color: palette.text, fontWeight: '700' }}>Modalidad</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {[
                ['domicilio', 'A domicilio'],
                ['taller', 'En taller'],
                ['ambos', 'Ambos'],
              ].map(([value, label]) => {
                const active = form.modalidad_servicio === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => set('modalidad_servicio', value)}
                    style={{
                      borderWidth: 1,
                      borderColor: active ? palette.primary : palette.border,
                      backgroundColor: active ? palette.surface2 : palette.surface,
                      borderRadius: 99,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                    }}
                  >
                    <Text style={{ color: palette.text, fontWeight: active ? '800' : '600' }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.modalidad_servicio ? <Text style={{ color: palette.danger }}>⚠ {errors.modalidad_servicio}</Text> : null}
          </View>

          <Field label="Horario / disponibilidad" value={form.horario_disponibilidad ?? ''} onChangeText={v => set('horario_disponibilidad', v)} error={errors.horario_disponibilidad} />
        </Card>
      ) : null}

      {user.tipo==='cliente'?<Card>
        <View style={{flexDirection:'row',alignItems:'center',gap:10}}><Ionicons name="shield-checkmark-outline" color={palette.primary} size={28}/><View style={{flex:1}}><Text style={{color:palette.text,fontSize:18,fontWeight:'900'}}>Seguridad de tu cuenta</Text><Text style={{color:palette.muted}}>Verifica tu identidad con INE y fotografía del rostro.</Text></View></View>
        <Button title="Verificación de identidad" variant="secondary" icon="id-card-outline" onPress={()=>router.push('/verification/client')}/>
      </Card>:null}
      {user.tipo==='cliente'?<Card>
        <View style={{gap:5}}><Text style={{color:palette.text,fontSize:19,fontWeight:'900'}}>¿Quieres ofrecer tus servicios?</Text><Text style={{color:palette.muted,lineHeight:20}}>Activa tu perfil profesional sin crear una segunda cuenta. Conservarás el acceso a tu modo cliente.</Text></View>
        <Button title={user.modo_dual_habilitado?'Cambiar a modo profesional':'Convertirme en profesional'} icon="briefcase-outline" onPress={()=>confirmRole('Modo profesional','Podrás completar tu información profesional y solicitar la verificación antes de recibir trabajos.',async()=>{try{const fresh=await switchAccountRole('trabajador');replaceUser(fresh);router.replace('/');}catch(e){Alert.alert('No se pudo activar',e instanceof Error?e.message:'Verifica que aplicaste la migración de Supabase.');}})}/>
      </Card>:user.tipo==='trabajador' && user.modo_dual_habilitado?<Card><Text style={{color:palette.text,fontWeight:'900',fontSize:18}}>Tu modo cliente</Text><Text style={{color:palette.muted}}>Puedes volver a contratar servicios con esta cuenta. Mientras uses modo cliente tu perfil profesional no aparecerá en el buscador; no podrás cambiar si tienes trabajos activos.</Text><Button title="Cambiar a modo cliente" variant="secondary" icon="people-outline" onPress={()=>confirmRole('Cambiar a cliente','¿Deseas regresar al área de cliente?',async()=>{try{const fresh=await switchAccountRole('cliente');replaceUser(fresh);router.replace('/');}catch(e){Alert.alert('No se pudo cambiar',e instanceof Error?e.message:'Intenta nuevamente.');}})}/></Card>:null}
      <Button title="Guardar cambios" icon="save-outline" onPress={save} loading={busy} />
      <Button title="Apariencia y accesibilidad" variant="secondary" icon="color-palette-outline" onPress={() => router.push('/settings/appearance')} />
      {user.tipo === 'trabajador' ? <Card>
        <View style={{flexDirection:'row',alignItems:'center',gap:12}}><Ionicons name="wallet-outline" color={palette.primary} size={28}/><View style={{flex:1,gap:3}}><Text style={{color:palette.text,fontSize:18,fontWeight:'900'}}>Cuenta de cobro</Text><Text style={{color:palette.muted,lineHeight:19}}>Vincula Mercado Pago para recibir automáticamente la parte correspondiente de cada servicio.</Text></View></View>
        <Badge text={mpConnection?.connected?'Mercado Pago vinculado':'Mercado Pago pendiente'} tone={mpConnection?.connected?'success':'warning'}/>
        {mpConnection?.provider_user_id?<Text style={{color:palette.muted,fontSize:12}}>Cuenta MP: {mpConnection.provider_user_id}</Text>:null}
        {mpConnection?.connected?<Button title="Desvincular Mercado Pago" variant="ghost" icon="unlink-outline" onPress={unlinkMercadoPago} loading={mpBusy}/>:<Button title="Vincular Mercado Pago" variant="secondary" icon="open-outline" onPress={()=>void connectMercadoPago()} loading={mpBusy}/>}
        <Text style={{color:palette.muted,fontSize:12}}>NAXVO aplica una comisión del 10% al checkout. El resto corresponde al profesional antes de las tarifas propias de Mercado Pago.</Text>
      </Card> : null}
      {user.tipo === 'trabajador' ? (
        <Button title="Verificación profesional" variant="secondary" icon="shield-checkmark-outline" onPress={() => router.push('/verification')} />
      ) : null}
      <Button title="Cerrar sesión" variant="ghost" icon="log-out-outline" onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}
