import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useAuth } from './AuthContext';
import type { ColorMode, ThemePreference } from '@/types/api';

type Palette = {
  background:string; surface:string; surface2:string; text:string; muted:string; border:string;
  primary:string; primaryText:string; success:string; warning:string; danger:string; info:string;
};

const baseLight: Palette = {
  background:'#F7F7FB', surface:'#FFFFFF', surface2:'#F0EFF7', text:'#17151E', muted:'#686575', border:'#E3E0EA',
  primary:'#6D28D9', primaryText:'#FFFFFF', success:'#16794A', warning:'#8A5A00', danger:'#B42318', info:'#175CD3',
};
const baseDark: Palette = {
  background:'#0F0D14', surface:'#17131F', surface2:'#211B2C', text:'#F6F3FA', muted:'#A9A3B4', border:'#332B40',
  primary:'#9B6CF0', primaryText:'#130A21', success:'#55C88A', warning:'#F2C14E', danger:'#FF7B72', info:'#6EA8FE',
};

// Paletas basadas en combinaciones con separación de luminancia y tono. Los estados importantes
// también se acompañan de iconos/texto para que nunca dependan únicamente del color.
function adapt(p: Palette, mode: ColorMode, dark: boolean): Palette {
  if (mode === 'protanopia') {
    return dark
      ? {...p, primary:'#56B4E9', primaryText:'#071923', success:'#009E73', warning:'#E69F00', danger:'#CC79A7', info:'#7AB8FF', border:'#405769'}
      : {...p, primary:'#005A8D', primaryText:'#FFFFFF', success:'#007A5A', warning:'#9A6500', danger:'#A83F78', info:'#006AA6', border:'#CBD8E1'};
  }
  if (mode === 'deuteranopia') {
    return dark
      ? {...p, primary:'#56B4E9', primaryText:'#071923', success:'#009E73', warning:'#F0E442', danger:'#E69F00', info:'#7AB8FF', border:'#405769'}
      : {...p, primary:'#005A8D', primaryText:'#FFFFFF', success:'#007A5A', warning:'#8A7000', danger:'#A65300', info:'#006AA6', border:'#CBD8E1'};
  }
  if (mode === 'tritanopia') {
    return dark
      ? {...p, primary:'#E69F00', primaryText:'#251400', success:'#00A67A', warning:'#F0E442', danger:'#CC79A7', info:'#56B4E9', border:'#5C4B37'}
      : {...p, primary:'#A64B00', primaryText:'#FFFFFF', success:'#007A5A', warning:'#806B00', danger:'#A83F78', info:'#006AA6', border:'#DED2C4'};
  }
  return p;
}

const ThemeContext = createContext<{palette:Palette; dark:boolean; preference:ThemePreference; colorMode:ColorMode}|null>(null);

export function ThemeProvider({children}:{children:React.ReactNode}) {
  const system=useColorScheme();
  const {user}=useAuth();
  const preference=user?.tema_preferido ?? 'sistema';
  const colorMode=user?.modo_color ?? 'normal';
  const dark=preference==='oscuro' || (preference==='sistema' && system==='dark');
  const value=useMemo(
    ()=>({palette:adapt(dark?baseDark:baseLight,colorMode,dark),dark,preference,colorMode}),
    [dark,preference,colorMode]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(){
  const v=useContext(ThemeContext);
  if(!v) throw new Error('useTheme requiere ThemeProvider');
  return v;
}
