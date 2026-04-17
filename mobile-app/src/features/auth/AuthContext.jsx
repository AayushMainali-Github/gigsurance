import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, getErrorMessage } from '../../lib/api/client';
import {
  clearAccessToken,
  clearStoredUser,
  getAccessToken,
  getStoredUser,
  setAccessToken,
  setStoredUser
} from '../../lib/storage/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);

  async function refreshUserState() {
    const me = await api.users.me();
    await setStoredUser(me.data);
    setUser(me.data);
    return me.data;
  }

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const token = await getAccessToken();
        const cachedUser = await getStoredUser();

        if (!token) {
          if (mounted) setUser(null);
          return;
        }

        if (cachedUser && mounted) {
          setUser(cachedUser);
        }

        const refreshed = await api.auth.refresh();
        const nextUser = refreshed?.data?.user || null;
        const nextToken = refreshed?.data?.accessToken || null;

        if (nextToken) {
          await setAccessToken(nextToken);
        }

        if (nextUser) {
          const me = await api.users.me();
          const resolvedUser = me?.data || nextUser;
          await setStoredUser(resolvedUser);
          if (mounted) setUser(resolvedUser);
        } else if (mounted) {
          setUser(null);
        }
      } catch (_error) {
        await clearAccessToken();
        await clearStoredUser();
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsRestoring(false);
      }
    }

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isRestoring,
      async login(payload) {
        const response = await api.auth.login(payload);
        const accessToken = response?.data?.accessToken;
        if (accessToken) {
          await setAccessToken(accessToken);
        }

        return refreshUserState();
      },
      async signup(payload) {
        const response = await api.auth.signup(payload);
        const accessToken = response?.data?.accessToken;
        if (accessToken) {
          await setAccessToken(accessToken);
        }

        return refreshUserState();
      },
      async refreshUser() {
        return refreshUserState();
      },
      async linkWorker(payload) {
        await api.workers.link(payload);
        return refreshUserState();
      },
      async enrollPolicy() {
        await api.policies.enroll();
        return refreshUserState();
      },
      async logout() {
        try {
          await api.auth.logout();
        } catch (_error) {
          // The backend treats logout as client-side token disposal; local cleanup is the real source of truth.
        }

        await clearAccessToken();
        await clearStoredUser();
        setUser(null);
      },
      getErrorMessage
    }),
    [isRestoring, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
