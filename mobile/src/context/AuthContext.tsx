import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '@/api';
import { getAccessToken, onSessionCleared } from '@/lib/session';
import type { User } from '@/types/api';

type AuthContextValue = {
  user: User | null; loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(payload: Record<string, unknown>): Promise<void>;
  signOut(): Promise<void>;
  refreshUser(): Promise<void>;
  replaceUser(user: User): void;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => onSessionCleared(() => setUser(null)), []);
  const refreshUser = useCallback(async () => { const fresh = await api.getMe(); setUser(fresh); }, []);
  useEffect(() => { (async () => { try { if (await getAccessToken()) await refreshUser(); } catch {} finally { setLoading(false); } })(); }, [refreshUser]);
  const value = useMemo<AuthContextValue>(() => ({
    user, loading,
    signIn: async (email, password) => setUser(await api.login(email, password)),
    signUp: async payload => setUser((await api.register(payload)).user),
    signOut: async () => { try { await api.logout(); } finally { setUser(null); } },
    refreshUser,
    replaceUser: setUser,
  }), [user, loading, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth requiere AuthProvider'); return ctx; }
