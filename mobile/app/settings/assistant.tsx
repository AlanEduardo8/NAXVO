import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAssistant, type AssistantPreferences } from '@/context/AssistantContext';
import { useTheme } from '@/context/ThemeContext';

const settings: {key:keyof AssistantPreferences;title:string;description:string;icon:string}[] = [
  {key:'visible',title:'Mostrar avatar',description:'Muestra NAXVO Assist sobre las pantallas de la aplicación.',icon:'happy-outline'},
  {key:'proactive',title:'Sugerencias contextuales',description:'Muestra consejos breves de la sección sin enviar datos a la IA.',icon:'bulb-outline'},
  {key:'simpleLanguage',title:'Explicaciones sencillas',description:'Pide a la IA frases cortas e instrucciones paso a paso.',icon:'list-outline'},
  {key:'largeText',title:'Texto grande del asistente',description:'Amplía el texto del chat del asistente.',icon:'text-outline'},
  {key:'highContrast',title:'Contraste alto del asistente',description:'Usa bordes y colores más contrastados en el panel.',icon:'contrast-outline'},
  {key:'readAloud',title:'Leer respuestas automáticamente',description:'Después de enviar una pregunta, lee la respuesta en voz alta.',icon:'volume-high-outline'},
  {key:'reduceMotion',title:'Reducir animaciones',description:'Detiene la animación flotante del avatar.',icon:'pause-circle-outline'},
];
export default function AssistantSettings() {
  const {prefs,update}=useAssistant();
  const {palette}=useTheme();
  return <SafeAreaView style={{flex:1,backgroundColor:palette.background}}>
    <ScrollView contentContainerStyle={{padding:18,gap:16,paddingBottom:40}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={()=>router.back()} style={{padding:10,minHeight:48,minWidth:48,justifyContent:'center'}}><Ionicons name="arrow-back" size={25} color={palette.text}/></Pressable>
        <Text accessibilityRole="header" style={{fontSize:23,color:palette.text,fontWeight:'900',flex:1}}>NAXVO Assist</Text>
      </View>
      <Text style={{fontSize:15,lineHeight:23,color:palette.muted}}>Personaliza cómo te acompaña el asistente. Estas opciones se guardan en este dispositivo para tu cuenta y no requieren compartir información sobre tu salud.</Text>
      {settings.map(item=><View key={item.key} style={{backgroundColor:palette.surface,borderRadius:18,borderWidth:1,borderColor:palette.border,padding:15,flexDirection:'row',alignItems:'center',gap:12}}>
        <Ionicons name={item.icon as any} size={24} color={palette.primary}/>
        <View style={{flex:1,gap:4}}><Text style={{fontSize:16,fontWeight:'800',color:palette.text}}>{item.title}</Text><Text style={{color:palette.muted,lineHeight:19,fontSize:13}}>{item.description}</Text></View>
        <Switch accessibilityLabel={item.title} accessibilityHint={item.description} value={prefs[item.key]} onValueChange={value=>update({[item.key]:value})} thumbColor={prefs[item.key]?palette.primary:undefined}/>
      </View>)}
      <View style={{padding:15,backgroundColor:palette.surface2,borderRadius:16,gap:7}}>
        <Text style={{fontWeight:'800',color:palette.text}}>Comunicación por voz</Text>
        <Text style={{color:palette.text,lineHeight:21}}>Puedes escuchar respuestas con el botón «Escuchar». En navegadores compatibles puedes dictar con el micrófono. En Android y iPhone, utiliza el dictado integrado del teclado; el asistente nunca activa el micrófono automáticamente.</Text>
        <Text style={{color:palette.muted,fontSize:13}}>Para navegación accesible, también puedes utilizar TalkBack o VoiceOver y las opciones de color de NAXVO.</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={()=>router.push('/settings/appearance')} style={{padding:15,borderRadius:14,borderWidth:1,borderColor:palette.primary,minHeight:50,justifyContent:'center'}}><Text style={{color:palette.primary,fontWeight:'800',textAlign:'center'}}>Abrir ajustes generales de apariencia</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}
