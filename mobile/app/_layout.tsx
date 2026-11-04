import 'react-native-reanimated';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AssistantProvider } from '@/context/AssistantContext';
import NaxvoAvatar from '@/components/NaxvoAvatar';
function Shell(){
  const {dark}=useTheme();
  return <View style={{flex:1}}>
    <StatusBar style={dark?'light':'dark'}/>
    <Stack screenOptions={{headerShown:false,animation:'fade'}}/>
    <NaxvoAvatar/>
  </View>;
}
export default function RootLayout(){
  return <GestureHandlerRootView style={{flex:1}}>
    <SafeAreaProvider>
      <AuthProvider><ThemeProvider><AssistantProvider><Shell/></AssistantProvider></ThemeProvider></AuthProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>;
}
