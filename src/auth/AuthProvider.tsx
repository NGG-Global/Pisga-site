import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../data';
import type { Me } from '../data/types';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'error' }
  | { status: 'signedIn'; me: Me; recovery: boolean };

interface AuthContextValue {
  state: AuthState;
  signOut: () => Promise<void>;
  /** Re-reads the membership and profile of the signed-in user (used by the demo role switch). */
  reload: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);
  const queryClient = useQueryClient();
  const loadedFor = useRef<string | null>(null);
  const recovery = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadedFor.current = null;
    const unsubscribe = api().onAuthChange((event) => {
      if (cancelled) return;
      if (!event.user) {
        loadedFor.current = null;
        recovery.current = false;
        queryClient.clear();
        setState({ status: 'signedOut' });
        return;
      }
      if (event.recovery) recovery.current = true;
      // Token refreshes repeat the event for the same user; the profile is read once.
      if (loadedFor.current === event.user.id) {
        setState((prev) => (prev.status === 'signedIn' ? { ...prev, recovery: recovery.current } : prev));
        return;
      }
      loadedFor.current = event.user.id;
      api()
        .loadMe(event.user.id, event.user.email)
        .then((me) => {
          if (!cancelled) setState({ status: 'signedIn', me, recovery: recovery.current });
        })
        .catch(() => {
          loadedFor.current = null;
          if (!cancelled) setState({ status: 'error' });
        });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [queryClient, reloadToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      signOut: () => api().signOut(),
      reload: () => {
        queryClient.clear();
        setReloadToken((n) => n + 1);
      },
    }),
    [state, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

/** The signed-in member. Only for use inside the protected part of the app. */
export function useMe(): Me {
  const { state } = useAuth();
  if (state.status !== 'signedIn') throw new Error('useMe requires a signed-in user');
  return state.me;
}
