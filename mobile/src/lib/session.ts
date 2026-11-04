import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AuthTokens } from '@/types/api';

const ACCESS = 'naxvo_access_token';
const REFRESH = 'naxvo_refresh_token';

// Notifica a AuthContext cuando Supabase invalida o cierra una sesión.
// También funciona en Expo Web y en dispositivos móviles.
const sessionClearedListeners = new Set<() => void>();

export function onSessionCleared(listener: () => void): () => void {
  sessionClearedListeners.add(listener);
  return () => { sessionClearedListeners.delete(listener); };
}

function webStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function getItem(key: string): Promise<string | null> {
  const storage = webStorage();
  if (Platform.OS === 'web') return storage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  const storage = webStorage();
  if (Platform.OS === 'web') {
    if (!storage) throw new Error('El navegador no permite guardar la sesión localmente.');
    storage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  const storage = webStorage();
  if (Platform.OS === 'web') {
    storage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export function getAccessToken() {
  return getItem(ACCESS);
}

export function getRefreshToken() {
  return getItem(REFRESH);
}

export async function saveTokens(tokens: AuthTokens) {
  await Promise.all([
    setItem(ACCESS, tokens.access_token),
    setItem(REFRESH, tokens.refresh_token),
  ]);
}

export async function clearTokens() {
  try {
    await Promise.all([removeItem(ACCESS), removeItem(REFRESH)]);
  } finally {
    // Incluso si el almacenamiento falla, el estado en pantalla deja de
    // mostrar un usuario que ya no tiene credenciales utilizables.
    sessionClearedListeners.forEach(listener => listener());
  }
}
