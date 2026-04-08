import { apiClient } from './apiClient';
import type { CommandSnippet, ToolLink, ToolModule } from '../modules/tools/types';

export interface ToolsPayload {
  links: ToolLink[];
  snippets: CommandSnippet[];
}

interface ToolModulesPayload {
  modules: ToolModule[];
}

export interface ToolsFetchResponse {
  status: number;
  data: unknown;
  contentType?: string;
}

export const toolsService = {
  getAll: () => apiClient.get<ToolsPayload>('/tools/'),
  createLink: (data: ToolLink) => apiClient.post<ToolLink>('/tools/', data),
  getModules: () => apiClient.get<ToolModulesPayload>('/tool-modules'),
  createTool: (payload: { name: string; type: string; config?: Record<string, unknown> }) =>
    apiClient.post<ToolModule>('/tool-modules', payload),
  createModule: (payload: { name: string; type: string; config?: Record<string, unknown> }) =>
    apiClient.post<ToolModule>('/tool-modules', payload),
  updateModule: (id: string, payload: { name?: string; type?: string; config?: Record<string, unknown> }) =>
    apiClient.put<ToolModule>(`/tool-modules/${id}`, payload),
  deleteModule: (id: string) => apiClient.delete(`/tool-modules/${id}`),
  fetchProxy: (url: string, method: 'GET' | 'POST' = 'GET', body?: Record<string, unknown>, timeout = 20) => {
    void body;
    const safeTimeout = Number.isFinite(timeout) ? Math.max(3, Math.min(Math.floor(timeout), 120)) : 20;
    const query = new URLSearchParams({ url, method, timeout: String(safeTimeout) });
    return apiClient.get<ToolsFetchResponse>(`/tools/fetch?${query.toString()}`);
  },
};
