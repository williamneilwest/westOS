import { apiClient } from '../../../services/apiClient';
import type { ScriptPayload, ScriptRecord } from '../types';

export const scriptsService = {
  list: () => apiClient.get<ScriptRecord[]>('/scripts'),
  create: (payload: ScriptPayload) => apiClient.post<ScriptRecord>('/scripts', payload),
  update: (id: string, payload: ScriptPayload) => apiClient.put<ScriptRecord>(`/scripts/${id}`, payload),
  remove: (id: string) => apiClient.delete(`/scripts/${id}`),
};
