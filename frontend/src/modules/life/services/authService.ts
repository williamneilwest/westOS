import { apiClient } from './apiClient';

export interface AuthUser {
  id: string;
  username: string;
  created_at?: string | null;
}

interface AuthPayload {
  user: AuthUser;
}

export const authService = {
  me: () => apiClient.get<AuthPayload>('/auth/me'),
  login: (username: string, password: string) =>
    apiClient.post<AuthPayload>('/auth/login', { username, password }),
  register: (username: string, password: string) =>
    apiClient.post<AuthPayload>('/auth/register', { username, password }),
  logout: async () => {
    await apiClient.post('/auth/logout', {});
  },
};
