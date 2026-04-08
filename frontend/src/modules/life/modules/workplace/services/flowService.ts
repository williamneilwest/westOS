import { apiClient } from '../../../services/apiClient';
import type { FlowRunDetails, FlowRunSummary, TicketDashboardPayload } from '../types';

interface RecentFlowsPayload {
  flows: FlowRunSummary[];
}

interface FlowDetailsPayload {
  flow: FlowRunDetails;
}

interface LatestTicketDashboardPayload extends TicketDashboardPayload {}
interface AnalyzeUserPayload {
  analysis: string;
  assignee: string;
  ticket_count: number;
  oldest_count: number;
  stale_count: number;
  high_priority_count: number;
}

export const flowService = {
  getRecent: () => apiClient.get<RecentFlowsPayload>('/flows/recent'),
  getById: (id: string) => apiClient.get<FlowDetailsPayload>(`/flows/${id}`),
  getLatestTicketDashboard: () => apiClient.get<LatestTicketDashboardPayload>('/tickets/latest'),
  setDashboardSource: (fileName: string) => apiClient.post<{ set: boolean; file_name: string }>('/tickets/set-source', { file_name: fileName }),
  analyzeUserTickets: (assignee: string) => apiClient.post<AnalyzeUserPayload>('/tickets/analyze-user', { assignee }),
  downloadUrl: (id: string) => `/api/flows/${id}/download`,
};
