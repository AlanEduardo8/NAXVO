import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
export default function AdminDetailLayout(){
 const {user,loading}=useAuth();const {palette}=useTheme();
 if(loading)return <View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:palette.background}}><ActivityIndicator color={palette.primary}/></View>;
 if(!user)return <Redirect href="/(auth)/login"/>;
 if(user.tipo!=='admin')return <Redirect href="/"/>;
 return <Stack screenOptions={{headerShown:false}}/>;
}
