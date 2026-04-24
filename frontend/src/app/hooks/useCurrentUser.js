import { useAuth } from '../../features/auth/AuthContext';

export function useCurrentUser() {
  return useAuth();
}
