export interface WorkplaceScript {
  id: string;
  name: string;
  description: string;
  copyCommand: string;
}

export interface WorkplaceLink {
  id: string;
  label: string;
  url: string;
  icon: string;
}

export interface QuickLink {
  id: number;
  title: string;
  url: string;
  category: string | null;
  icon: string | null;
  created_at: string | null;
}

export interface CreateQuickLinkInput {
  title?: string;
  url: string;
  category?: string;
  icon?: string;
}

export interface ScriptExecutionResult {
  success: boolean;
  scriptId: string;
  scriptName: string;
  output: string;
  error: string;
  returnCode: number;
  executedAt: string;
  timeoutSeconds: number;
}

export interface WorkplaceNotification {
  id: string;
  type: 'info' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: string;
}

export type FlowStatus = 'Success' | 'Failed';

export interface FlowRunSummary {
  id: string;
  file_name: string;
  row_count: number;
  column_count: number;
  status: FlowStatus;
  error_message: string | null;
  created_at: string | null;
  processed_file_path: string | null;
  processing_time_ms: number | null;
}

export interface FlowRunDetails extends FlowRunSummary {
  preview: Array<Record<string, unknown>>;
}

export interface TicketAnalyticsSummary {
  total: number;
  open: number;
  closed: number;
  in_progress: number;
}

export interface TicketAnalyticsAging {
  over_1_day: number;
  over_3_days: number;
  over_7_days: number;
}

export interface TicketGroupCount {
  [key: string]: string | number;
}

export interface TicketAnalyticsPayload {
  summary: TicketAnalyticsSummary;
  aging: TicketAnalyticsAging;
  by_assignee: Array<{ assignee: string; count: number }>;
  by_priority: Array<{ priority: string; count: number }>;
  by_status: Array<{ status: string; count: number }>;
  oldest_tickets: Array<Record<string, string | number>>;
  recent_tickets: Array<Record<string, string | number>>;
}

export interface TicketDashboardPayload {
  flow_id?: string;
  file_name: string;
  updated_at?: string;
  rows: number;
  columns: string[];
  preview: Array<Record<string, string | number>>;
  tickets: Array<Record<string, string | number>>;
  analytics: TicketAnalyticsPayload;
}
