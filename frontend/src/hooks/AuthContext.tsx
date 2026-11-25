import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from './useAuth';

type Ctx = ReturnType<typeof useAuth>;
const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): Ctx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext buiten AuthProvider');
  return ctx;
}
