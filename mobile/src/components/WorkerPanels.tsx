import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

export function WorkerHero({eyebrow,title,description,icon='briefcase-outline',action}:{eyebrow:string;title:string;description:string;icon?:keyof typeof Ionicons.glyphMap;action?:ReactNode}){
  const {palette}=useTheme();
  return <View style={{borderRadius:24,padding:20,backgroundColor:palette.surface2,borderColor:palette.border,borderWidth:1,gap:13,overflow:'hidden'}}>
    <View style={{position:'absolute',width:130,height:130,borderRadius:65,backgroundColor:palette.primary,opacity:.09,right:-32,top:-50}}/>
    <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
      <View style={{height:51,width:51,borderRadius:16,backgroundColor:palette.surface,alignItems:'center',justifyContent:'center',borderColor:palette.border,borderWidth:1}}><Ionicons name={icon} size={25} color={palette.primary}/></View>
      <Text style={{color:palette.primary,fontWeight:'900',letterSpacing:1.1,fontSize:11,flex:1}}>{eyebrow.toUpperCase()}</Text>
    </View>
    <Text accessibilityRole="header" style={{color:palette.text,fontWeight:'900',fontSize:27}}>{title}</Text>
    <Text style={{color:palette.muted,fontSize:14,lineHeight:21}}>{description}</Text>
    {action}
  </View>;
}
export function WorkerMetric({label,value,icon,onPress}:{label:string;value:string|number;icon:keyof typeof Ionicons.glyphMap;onPress?:()=>void}){
  const {palette}=useTheme();
  return <Pressable disabled={!onPress} accessibilityRole={onPress?'button':undefined} onPress={onPress} style={{flex:1,minWidth:110,borderWidth:1,borderColor:palette.border,backgroundColor:palette.surface,borderRadius:18,padding:15,gap:10}}>
    <Ionicons name={icon} size={23} color={palette.primary}/>
    <Text style={{fontSize:26,color:palette.text,fontWeight:'900'}}>{value}</Text>
    <View style={{flexDirection:'row',alignItems:'center',gap:4}}><Text style={{color:palette.muted,fontSize:12,fontWeight:'700',flex:1}}>{label}</Text>{onPress?<Ionicons name="arrow-forward" size={13} color={palette.primary}/>:null}</View>
  </Pressable>;
}
export function WorkerSection({title,subtitle,action,children}:{title:string;subtitle?:string;action?:{label:string;onPress:()=>void};children:ReactNode}){
  const {palette}=useTheme();
  return <View style={{gap:12}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12}}>
      <View style={{flex:1,gap:3}}><Text style={{color:palette.text,fontSize:19,fontWeight:'900'}}>{title}</Text>{subtitle?<Text style={{color:palette.muted,fontSize:12}}>{subtitle}</Text>:null}</View>
      {action?<Pressable accessibilityRole="button" onPress={action.onPress} style={{padding:9,flexDirection:'row',alignItems:'center',gap:4}}><Text style={{color:palette.primary,fontSize:12,fontWeight:'800'}}>{action.label}</Text><Ionicons name="arrow-forward-outline" color={palette.primary} size={15}/></Pressable>:null}
    </View>
    {children}
  </View>;
}
export function WorkerShortcut({title,description,icon,onPress}:{title:string;description:string;icon:keyof typeof Ionicons.glyphMap;onPress:()=>void}){
  const {palette}=useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={{backgroundColor:palette.surface,borderRadius:17,borderColor:palette.border,borderWidth:1,padding:16,flexDirection:'row',alignItems:'center',gap:13}}>
    <View style={{borderRadius:14,backgroundColor:palette.surface2,padding:12}}><Ionicons name={icon} color={palette.primary} size={25}/></View>
    <View style={{flex:1,gap:4}}><Text style={{color:palette.text,fontSize:16,fontWeight:'900'}}>{title}</Text><Text numberOfLines={2} style={{color:palette.muted,fontSize:12,lineHeight:18}}>{description}</Text></View>
    <Ionicons name="chevron-forward" size={19} color={palette.primary}/>
  </Pressable>;
}
