import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

function pad(value:number){return String(value).padStart(2,'0');}
function toKey(date:Date){return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;}
function parseKey(value:string){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if(!m)return null;
  const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
  return Number.isNaN(d.getTime())?null:d;
}
function labelDate(value:string){
  const d=parseKey(value); if(!d)return 'Seleccionar fecha';
  return new Intl.DateTimeFormat('es-MX',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(d);
}

export function DatePickerField({label,value,onChange,required=false,birthDate=false}:{label:string;value:string;onChange:(value:string)=>void;required?:boolean;birthDate?:boolean}){
  const {palette}=useTheme();
  const initial=parseKey(value)??(birthDate?new Date(2000,0,1):new Date());
  const [open,setOpen]=useState(false);
  const [cursor,setCursor]=useState(new Date(initial.getFullYear(),initial.getMonth(),1));
  const todayKey=toKey(new Date());
  const cells=useMemo(()=>{
    const first=new Date(cursor.getFullYear(),cursor.getMonth(),1);
    const offset=first.getDay();
    const count=new Date(cursor.getFullYear(),cursor.getMonth()+1,0).getDate();
    const list:(number|null)[]=[];
    for(let i=0;i<offset;i++)list.push(null);
    for(let i=1;i<=count;i++)list.push(i);
    while(list.length%7!==0)list.push(null);
    return list;
  },[cursor]);
  const monthLabel=new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric'}).format(cursor);
  return <View style={{gap:7}}>
    <Text style={{color:palette.text,fontWeight:'700'}}>{label}{required?' *':''}</Text>
    <Pressable onPress={()=>setOpen(true)} style={{minHeight:48,borderWidth:1,borderColor:palette.border,borderRadius:13,backgroundColor:palette.surface,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10}}>
      <Text style={{color:value?palette.text:palette.muted,fontSize:16}}>{labelDate(value)}</Text>
      <Ionicons name="calendar-outline" size={20} color={palette.primary}/>
    </Pressable>
    <Modal transparent visible={open} animationType="fade" onRequestClose={()=>setOpen(false)}>
      <View style={{flex:1,backgroundColor:'rgba(0,0,0,.65)',justifyContent:'center',padding:20}}>
        <View style={{backgroundColor:palette.surface,borderColor:palette.border,borderWidth:1,borderRadius:18,padding:16,gap:14,maxWidth:480,width:'100%',alignSelf:'center'}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
            {birthDate?<Pressable accessibilityRole="button" accessibilityLabel="Año anterior" onPress={()=>setCursor(new Date(cursor.getFullYear()-1,cursor.getMonth(),1))} style={{padding:8}}><Ionicons name="play-back-outline" size={22} color={palette.text}/></Pressable>:null}
            <Pressable onPress={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()-1,1))} style={{padding:8}}><Ionicons name="chevron-back" size={24} color={palette.text}/></Pressable>
            <Text style={{color:palette.text,fontWeight:'900',fontSize:18,textTransform:'capitalize'}}>{monthLabel}</Text>
            <Pressable onPress={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()+1,1))} style={{padding:8}}><Ionicons name="chevron-forward" size={24} color={palette.text}/></Pressable>
          </View>
          {birthDate?<Pressable accessibilityRole="button" accessibilityLabel="Año siguiente" onPress={()=>setCursor(new Date(Math.min(new Date().getFullYear(),cursor.getFullYear()+1),cursor.getMonth(),1))} style={{alignSelf:'flex-end',padding:6}}><Text style={{color:palette.primary,fontWeight:'800'}}>Año siguiente</Text></Pressable>:null}
          <View style={{flexDirection:'row'}}>{['D','L','M','M','J','V','S'].map((x,i)=><Text key={`${x}${i}`} style={{width:'14.285%',textAlign:'center',color:palette.muted,fontWeight:'800'}}>{x}</Text>)}</View>
          <View style={{flexDirection:'row',flexWrap:'wrap'}}>{cells.map((day,index)=>{
            if(day===null)return <View key={`blank-${index}`} style={{width:'14.285%',height:44}}/>;
            const key=toKey(new Date(cursor.getFullYear(),cursor.getMonth(),day));
            const disabled=birthDate?(key>todayKey||cursor.getFullYear()<1900):key<todayKey;
            const selected=key===value;
            return <Pressable key={key} disabled={disabled} onPress={()=>{onChange(key);setOpen(false)}} style={{width:'14.285%',height:44,alignItems:'center',justifyContent:'center'}}>
              <View style={{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:selected?palette.primary:'transparent',borderWidth:key===todayKey&&!selected?1:0,borderColor:palette.primary}}>
                <Text style={{color:disabled?palette.muted:selected?palette.primaryText:palette.text,opacity:disabled?.35:1,fontWeight:selected?'900':'600'}}>{day}</Text>
              </View>
            </Pressable>;
          })}</View>
          <View style={{flexDirection:'row',gap:10}}>
            {value?<Pressable onPress={()=>{onChange('');setOpen(false)}} style={{flex:1,minHeight:44,borderWidth:1,borderColor:palette.border,borderRadius:12,alignItems:'center',justifyContent:'center'}}><Text style={{color:palette.text,fontWeight:'800'}}>Limpiar</Text></Pressable>:null}
            <Pressable onPress={()=>setOpen(false)} style={{flex:1,minHeight:44,borderWidth:1,borderColor:palette.primary,borderRadius:12,alignItems:'center',justifyContent:'center'}}><Text style={{color:palette.primary,fontWeight:'900'}}>Cerrar</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </View>;
}

export function TimePickerField({label,value,onChange,required=false}:{label:string;value:string;onChange:(value:string)=>void;required?:boolean}){
  const {palette}=useTheme();
  const [open,setOpen]=useState(false);
  const slots=useMemo(()=>{
    const out:string[]=[];
    for(let hour=7;hour<=21;hour++)for(const minute of [0,30]){if(hour===21&&minute===30)continue;out.push(`${pad(hour)}:${pad(minute)}`)}
    return out;
  },[]);
  return <View style={{gap:7}}>
    <Text style={{color:palette.text,fontWeight:'700'}}>{label}{required?' *':''}</Text>
    <Pressable onPress={()=>setOpen(true)} style={{minHeight:48,borderWidth:1,borderColor:palette.border,borderRadius:13,backgroundColor:palette.surface,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10}}>
      <Text style={{color:value?palette.text:palette.muted,fontSize:16}}>{value||'Seleccionar hora'}</Text>
      <Ionicons name="time-outline" size={20} color={palette.primary}/>
    </Pressable>
    <Modal transparent visible={open} animationType="fade" onRequestClose={()=>setOpen(false)}>
      <View style={{flex:1,backgroundColor:'rgba(0,0,0,.65)',justifyContent:'center',padding:20}}>
        <View style={{backgroundColor:palette.surface,borderColor:palette.border,borderWidth:1,borderRadius:18,padding:16,gap:12,maxWidth:420,width:'100%',maxHeight:'72%',alignSelf:'center'}}>
          <Text style={{color:palette.text,fontWeight:'900',fontSize:18}}>Selecciona una hora</Text>
          <ScrollView contentContainerStyle={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{slots.map(slot=><Pressable key={slot} onPress={()=>{onChange(slot);setOpen(false)}} style={{width:'30%',minWidth:86,paddingVertical:11,borderRadius:12,borderWidth:1,borderColor:value===slot?palette.primary:palette.border,backgroundColor:value===slot?palette.surface2:'transparent'}}><Text style={{textAlign:'center',color:value===slot?palette.primary:palette.text,fontWeight:'800'}}>{slot}</Text></Pressable>)}</ScrollView>
          <View style={{flexDirection:'row',gap:10}}>
            {value?<Pressable onPress={()=>{onChange('');setOpen(false)}} style={{flex:1,minHeight:44,borderWidth:1,borderColor:palette.border,borderRadius:12,alignItems:'center',justifyContent:'center'}}><Text style={{color:palette.text,fontWeight:'800'}}>Limpiar</Text></Pressable>:null}
            <Pressable onPress={()=>setOpen(false)} style={{flex:1,minHeight:44,borderWidth:1,borderColor:palette.primary,borderRadius:12,alignItems:'center',justifyContent:'center'}}><Text style={{color:palette.primary,fontWeight:'900'}}>Cerrar</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </View>;
}
