import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser } from '../../app/services/auth';

const AuthContext = createContext({
  loading: true,
  authenticated: false,
  user: null,
  role: '',
  isAdmin: false,
  permissions: [],
  canExecuteFlows: false,
  refreshUser: async () => {},
});

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await getCurrentUser();
      const isAuthenticated = Boolean(payload?.authenticated);
      setAuthenticated(isAuthenticated);
      setUser(isAuthenticated ? (payload?.user || null) : null);
    } catch {
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();

    const handleAuthChanged = () => {
      void refreshUser();
    };
    window.addEventListener('westos:auth-changed', handleAuthChanged);
    return () => {
      window.removeEventListener('westos:auth-changed', handleAuthChanged);
    };
  }, [refreshUser]);

  const role = String(user?.role || '').toLowerCase();
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canExecuteFlows = Boolean(user?.can_execute_flows);
  const value = useMemo(
    () => ({
      loading,
      authenticated,
      user,
      role,
      isAdmin: role === 'admin',
      permissions,
      canExecuteFlows,
      refreshUser,
    }),
    [loading, authenticated, user, role, permissions, canExecuteFlows, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
