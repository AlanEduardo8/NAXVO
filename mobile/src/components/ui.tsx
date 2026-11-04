import React, { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

export function Screen({children, scroll=true}:{children:React.ReactNode; scroll?:boolean}){
  const {palette}=useTheme();
  const body=<View style={{padding:20,gap:16,flexGrow:1}}>{children}</View>;
  return <SafeAreaView style={{flex:1,backgroundColor:palette.background}}>
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined} keyboardVerticalOffset={Platform.OS==='ios'?8:0}>
      {scroll?<ScrollView
        style={{flex:1}}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS==='ios'?'interactive':'on-drag'}
        automaticallyAdjustKeyboardInsets={Platform.OS==='ios'}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{paddingBottom:64,flexGrow:1}}
        showsVerticalScrollIndicator={false}
      >{body}</ScrollView>:body}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function Brand(){ const {palette}=useTheme(); return <View style={s.brand}><Image source={require('../../assets/logo-naxvo.png')} style={s.logoImage}/><Text style={{color:palette.text,fontWeight:'900',fontSize:22,letterSpacing:1}}>NAXVO</Text></View> }
export function Title({children,subtitle}:{children:React.ReactNode;subtitle?:string}){const {palette}=useTheme();return <View style={{gap:4}}><Text style={{color:palette.text,fontSize:28,fontWeight:'900'}}>{children}</Text>{subtitle?<Text style={{color:palette.muted,fontSize:15,lineHeight:21}}>{subtitle}</Text>:null}</View>}
export function Card({children}:{children:React.ReactNode}){const {palette}=useTheme();return <View style={[s.card,{backgroundColor:palette.surface,borderColor:palette.border}]}>{children}</View>}
export function Field({label,error,...props}:TextInputProps&{label:string;error?:string}){const {palette}=useTheme();return <View style={{gap:7}}><Text style={{color:palette.text,fontWeight:'700'}}>{label}</Text><TextInput placeholderTextColor={palette.muted} {...props} style={[s.input,{backgroundColor:palette.surface,borderColor:error?palette.danger:palette.border,color:palette.text},props.multiline&&{minHeight:100,textAlignVertical:'top'},props.style]}/>{error?<Text style={{color:palette.danger}}>⚠ {error}</Text>:null}</View>}
export function PasswordField({label,error,...props}:TextInputProps&{label:string;error?:string}){
  const {palette}=useTheme();
  const [visible,setVisible]=useState(false);
  return <View style={{gap:7}}>
    <Text style={{color:palette.text,fontWeight:'700'}}>{label}</Text>
    <View style={[s.passwordWrap,{backgroundColor:palette.surface,borderColor:error?palette.danger:palette.border}]}>
      <TextInput
        placeholderTextColor={palette.muted}
        {...props}
        secureTextEntry={!visible}
        style={[s.passwordInput,{color:palette.text},props.style]}
      />
      <Pressable accessibilityRole="button" accessibilityLabel={visible?'Ocultar contraseña':'Mostrar contraseña'} hitSlop={8} onPress={()=>setVisible(v=>!v)} style={s.eyeButton}>
        <Ionicons name={visible?'eye-off-outline':'eye-outline'} size={22} color={palette.muted}/>
      </Pressable>
    </View>
    {error?<Text style={{color:palette.danger}}>⚠ {error}</Text>:null}
  </View>;
}
export function Button({title,onPress,variant='primary',icon,disabled=false,loading=false}:{title:string;onPress:()=>void;variant?:'primary'|'secondary'|'danger'|'ghost';icon?:string;disabled?:boolean;loading?:boolean}){const {palette}=useTheme(); const bg=variant==='primary'?palette.primary:variant==='danger'?palette.danger:variant==='secondary'?palette.surface2:'transparent'; const fg=variant==='primary'?palette.primaryText:variant==='danger'?'#fff':palette.text; return <Pressable disabled={disabled||loading} onPress={onPress} style={({pressed})=>[s.button,{backgroundColor:bg,borderColor:variant==='ghost'?palette.border:bg,opacity:disabled?.55:pressed?.8:1}]}>{loading?<ActivityIndicator color={fg}/>:<>{icon?<Ionicons name={icon as any} size={18} color={fg}/>:null}<Text style={{color:fg,fontWeight:'800'}}>{title}</Text></>}</Pressable>}
export function Avatar({uri,name,size=58}:{uri?:string|null;name:string;size?:number}){const {palette}=useTheme();if(uri)return <Image source={{uri}} style={{width:size,height:size,borderRadius:size/2,backgroundColor:palette.surface2}}/>;return <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:palette.primary,alignItems:'center',justifyContent:'center'}}><Text style={{color:palette.primaryText,fontWeight:'900',fontSize:size*.35}}>{name.slice(0,1).toUpperCase()}</Text></View>}
export function Badge({text,tone='info'}:{text:string;tone?:'success'|'warning'|'danger'|'info'}){const {palette}=useTheme();const c=palette[tone];const symbol=tone==='success'?'✓':tone==='warning'?'!':tone==='danger'?'×':'i';return <View style={{flexDirection:'row',gap:5,alignItems:'center',borderWidth:1,borderColor:c,borderRadius:99,paddingHorizontal:9,paddingVertical:4}}><Text style={{color:c,fontWeight:'900'}}>{symbol}</Text><Text style={{color:c,fontWeight:'800',fontSize:12}}>{text}</Text></View>}
export function Empty({icon='file-tray-outline',title,text}:{icon?:string;title:string;text:string}){const {palette}=useTheme();return <Card><View style={{alignItems:'center',padding:24,gap:8}}><Ionicons name={icon as any} size={34} color={palette.muted}/><Text style={{color:palette.text,fontWeight:'800',fontSize:17}}>{title}</Text><Text style={{color:palette.muted,textAlign:'center'}}>{text}</Text></View></Card>}
const s=StyleSheet.create({brand:{flexDirection:'row',alignItems:'center',gap:9},logo:{width:34,height:34,borderRadius:11,alignItems:'center',justifyContent:'center'},logoImage:{width:36,height:36,borderRadius:11},card:{borderWidth:1,borderRadius:18,padding:16,gap:12},input:{borderWidth:1,borderRadius:13,paddingHorizontal:14,paddingVertical:12,fontSize:16},passwordWrap:{borderWidth:1,borderRadius:13,flexDirection:'row',alignItems:'center'},passwordInput:{flex:1,paddingHorizontal:14,paddingVertical:12,fontSize:16,minHeight:50},eyeButton:{minHeight:48,minWidth:48,alignItems:'center',justifyContent:'center'},button:{minHeight:48,borderRadius:13,borderWidth:1,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,paddingHorizontal:15}})
