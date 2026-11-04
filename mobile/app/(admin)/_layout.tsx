import { NaxvoHeaderActions } from '@/components/NaxvoHeaderActions';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
const icons:any={dashboard:'grid-outline',users:'people-outline',verifications:'shield-checkmark-outline',reports:'flag-outline',profile:'person-circle-outline'};
export default function Layout(){
 const {palette}=useTheme();const {user,loading}=useAuth();
 if(loading)return <View style={{flex:1,backgroundColor:palette.background,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={palette.primary}/></View>;
 if(!user)return <Redirect href="/(auth)/login"/>;
 if(user.tipo!=='admin')return <Redirect href="/"/>;
 return <Tabs screenOptions={({route})=>({headerTitle:()=> <Brand/>,headerRight:()=> <NaxvoHeaderActions/>,headerStyle:{backgroundColor:palette.surface},headerShadowVisible:false,tabBarStyle:{backgroundColor:palette.surface,borderTopColor:palette.border,borderTopWidth:1,height:64,paddingTop:5,paddingBottom:6},tabBarLabelStyle:{fontWeight:'700',fontSize:11},tabBarActiveTintColor:palette.primary,tabBarInactiveTintColor:palette.muted,tabBarIcon:({color,size})=><Ionicons name={icons[route.name]??'ellipse-outline'} size={size} color={color}/>})}>
   <Tabs.Screen name="dashboard" options={{title:'Resumen'}}/><Tabs.Screen name="users" options={{title:'Usuarios'}}/><Tabs.Screen name="verifications" options={{title:'Verificar'}}/><Tabs.Screen name="reports" options={{title:'Reportes'}}/><Tabs.Screen name="profile" options={{title:'Perfil'}}/>
 </Tabs>;
}
