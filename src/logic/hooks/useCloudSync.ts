import { useState, useCallback, useRef, useEffect } from 'react';

const SESSION_CHECK_URL = '/api/auth/session';
const SYNC_PUSH_URL = '/api/sync/push';
const SYNC_PULL_URL = '/api/sync/pull';

export interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  isLoading: boolean;
}

export interface SyncableData {
  favorites: unknown[];
  eqPresets: unknown[];
  settings: Record<string, unknown>;
}

const PUSH_DEBOUNCE_MS = 5000;
const MIN_PUSH_INTERVAL_MS = 60000;

export function useCloudSync() {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    email: null,
    isLoading: true,
  });
  const lastPushRef = useRef(0);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check session on mount
  useEffect(() => {
    let cancelled = false;
    fetch(SESSION_CHECK_URL, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.email) {
          setAuth({ isAuthenticated: true, email: data.email, isLoading: false });
        } else {
          setAuth({ isAuthenticated: false, email: null, isLoading: false });
        }
      })
      .catch(() => {
        if (!cancelled) setAuth({ isAuthenticated: false, email: null, isLoading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include',
    });
    return res.ok;
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setAuth({ isAuthenticated: false, email: null, isLoading: false });
  }, []);

  const pull = useCallback(async (): Promise<SyncableData | null> => {
    if (!auth.isAuthenticated) return null;
    try {
      const res = await fetch(SYNC_PULL_URL, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }, [auth.isAuthenticated]);

  const push = useCallback(
    (data: SyncableData) => {
      if (!auth.isAuthenticated) return;

      // Debounce + rate limit
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);

      pushTimerRef.current = setTimeout(async () => {
        const now = Date.now();
        if (now - lastPushRef.current < MIN_PUSH_INTERVAL_MS) return;
        lastPushRef.current = now;

        try {
          await fetch(SYNC_PUSH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include',
          });
        } catch {
          // Queue for retry on reconnect (integrates with ARCH-132)
        }
      }, PUSH_DEBOUNCE_MS);
    },
    [auth.isAuthenticated],
  );

  const deleteAccount = useCallback(async () => {
    const res = await fetch('/api/auth/delete', {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      setAuth({ isAuthenticated: false, email: null, isLoading: false });
    }
    return res.ok;
  }, []);

  return { auth, login, logout, pull, push, deleteAccount };
}
