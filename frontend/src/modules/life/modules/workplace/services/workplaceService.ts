import { apiClient } from '../../../services/apiClient';
import type { CreateQuickLinkInput, QuickLink, ScriptExecutionResult, WorkplaceLink, WorkplaceScript } from '../types';

interface ScriptsPayload {
  scripts: WorkplaceScript[];
}

interface LinksPayload {
  links: WorkplaceLink[];
}

interface QuickLinksPayload {
  links: QuickLink[];
}

interface QuickLinkPayload {
  link: QuickLink;
}

export const workplaceService = {
  getScripts: () => apiClient.get<ScriptsPayload>('/workplace/scripts'),
  getLinks: () => apiClient.get<LinksPayload>('/workplace/links'),
  getQuickLinks: () => apiClient.get<QuickLinksPayload>('/quick-links'),
  createQuickLink: (payload: CreateQuickLinkInput) => apiClient.post<QuickLinkPayload>('/quick-links', payload),
  updateQuickLink: (id: number, payload: Partial<CreateQuickLinkInput>) => apiClient.patch<QuickLinkPayload>(`/quick-links/${id}`, payload),
  deleteQuickLink: (id: number) => apiClient.delete(`/quick-links/${id}`),
  runScript: (scriptId: string) =>
    apiClient.post<ScriptExecutionResult>('/workplace/run-script', { scriptId }),
};
