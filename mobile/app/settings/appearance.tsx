import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { updateAppearance } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Brand, Button, Card, Screen, Title } from '@/components/ui';
import type { ColorMode, ThemePreference, User } from '@/types/api';

const colorLabels: Record<ColorMode,string> = {
  normal:'Color estándar', protanopia:'Protanopia', deuteranopia:'Deuteranopia', tritanopia:'Tritanopía',
};

export default function Appearance(){
  const {user,replaceUser}=useAuth();
  const {palette}=useTheme();
  const [saving,setSaving]=useState(false);
  if(!user)return null;

  const persist=async(next: Partial<User>)=>{
    if(saving)return;
    setSaving(true);
    try{
      const fresh=await updateAppearance({
        tema_preferido:(next.tema_preferido ?? user.tema_preferido) as ThemePreference,
        modo_color:(next.modo_color ?? user.modo_color) as ColorMode,
      });
      replaceUser(fresh);
    }catch(e:any){Alert.alert('No se pudo guardar',e?.message??'Intenta nuevamente.');}
    finally{setSaving(false);}
  };

  const option=(active:boolean,label:string,onPress:()=>void,icon:string)=>
    <Pressable disabled={saving} onPress={onPress} style={{padding:14,borderRadius:13,borderWidth:1,borderColor:active?palette.primary:palette.border,backgroundColor:active?palette.surface2:palette.surface,flexDirection:'row',alignItems:'center',gap:10,opacity:saving?.65:1}}>
      <Ionicons name={icon as any} size={20} color={active?palette.primary:palette.muted}/>
      <Text style={{color:palette.text,fontWeight:'800',flex:1}}>{label}</Text>
      <Ionicons name={active?'checkmark-circle':'ellipse-outline'} size={21} color={active?palette.success:palette.muted}/>
    </Pressable>;

  return <Screen>
    <Brand/>
    <Title subtitle="El tema y las paletas accesibles se guardan en tu cuenta. Los avisos importantes usan texto, iconos y símbolos, no solamente color.">Apariencia y accesibilidad</Title>

    <Card>
      <Text style={{color:palette.text,fontWeight:'900',fontSize:17}}>Tema</Text>
      <View style={{gap:8}}>
        {(['sistema','claro','oscuro'] as ThemePreference[]).map(x=>
          <View key={x}>{option(user.tema_preferido===x,x==='sistema'?'Automático del sistema':x[0].toUpperCase()+x.slice(1),()=>persist({tema_preferido:x}),x==='sistema'?'phone-portrait-outline':x==='claro'?'sunny-outline':'moon-outline')}</View>
        )}
      </View>
    </Card>

    <Card>
      <Text style={{color:palette.text,fontWeight:'900',fontSize:17}}>Accesibilidad cromática</Text>
      <Text style={{color:palette.muted,lineHeight:20}}>Las paletas cambian colores de acción y estados para facilitar su diferenciación. Los símbolos ✓, ! y × permanecen visibles para no depender exclusivamente del color.</Text>
      <View style={{flexDirection:'row',gap:8}}>
        {[palette.primary,palette.success,palette.warning,palette.danger,palette.info].map((c,i)=><View key={i} style={{height:22,flex:1,borderRadius:7,backgroundColor:c,borderWidth:1,borderColor:palette.border}}/>)}
      </View>
      <View style={{gap:8}}>
        {(['normal','protanopia','deuteranopia','tritanopia'] as ColorMode[]).map(x=>
          <View key={x}>{option(user.modo_color===x,colorLabels[x],()=>persist({modo_color:x}),'color-palette-outline')}</View>
        )}
      </View>
    </Card>

    <Card>
      <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
        <Ionicons name="accessibility-outline" size={24} color={palette.info}/>
        <Text style={{color:palette.text,fontWeight:'900',fontSize:16,flex:1}}>Estados comprensibles</Text>
      </View>
      <Text style={{color:palette.muted,lineHeight:20}}>Confirmaciones, advertencias y errores combinan color con texto e iconografía para que sigan siendo distinguibles con cualquiera de las paletas.</Text>
    </Card>

    <Card>
      <Text style={{color:palette.text,fontWeight:'900',fontSize:17}}>Asistente accesible</Text>
      <Text style={{color:palette.muted,lineHeight:21}}>Configura el avatar flotante, lectura por voz, texto grande y sugerencias de ayuda.</Text>
      <Button title="Configurar NAXVO Assist" variant="secondary" icon="accessibility-outline" onPress={()=>router.push('/settings/assistant')}/>
    </Card>
    <Button title="Volver" variant="secondary" icon="arrow-back" onPress={()=>router.back()} disabled={saving}/>
  </Screen>;
}
