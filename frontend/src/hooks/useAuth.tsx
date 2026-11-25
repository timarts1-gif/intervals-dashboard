import { useCallback, useEffect, useState } from 'react';
import { authApi as api } from '../services/authApi';
import { ApiError } from '../services/http';
import type { Me } from '../types/api';

export type AuthState = { status: 'loading' } | { status: 'anonymous' } | { status: 'error'; message: string } | { status: 'ok'; me: Me };

/** Vraagt de huidige sessie op en luistert naar verlopen sessies. */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const refresh = useCallback(() => {
    api
      .me()
      .then((me) => setState({ status: 'ok', me }))
      .catch((e) =>
        setState(e instanceof ApiError && e.status === 401 ? { status: 'anonymous' } : { status: 'error', message: e.message }),
      );
  }, []);

  useEffect(() => {
    refresh();
    const onExpired = () => setState({ status: 'anonymous' });
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setState({ status: 'anonymous' });
  }, []);

  return { state, refresh, logout };
}
