import { apiClient } from './apiClient';
import type { PlanningItem, Project, Task } from '../types';

interface ListResponse<T> {
  data: T[];
  lastUpdated: string;
}

export function getProjects() {
  return apiClient.get<ListResponse<Project>>('/projects/');
}

export function createProject(project: Project) {
  return apiClient.post<Project>('/projects/', project);
}

export function updateProject(projectId: string, updates: Partial<Project>) {
  return apiClient.patch<Project>(`/projects/${projectId}`, updates);
}

// /services/api.ts
export async function getTasks() {
  const res = await fetch('/api/tasks/');
  if (!res.ok) {
    throw new Error('API request failed');
  }
  const json = await res.json() as { data: ListResponse<Task> };
  return json.data;
}

export function createTask(task: Task) {
  return apiClient.post<Task>('/tasks/', task);
}

export function updateTask(taskId: string, updates: Partial<Task>) {
  return apiClient.patch<Task>(`/tasks/${taskId}`, updates);
}

export function getPlanning() {
  return apiClient.get<ListResponse<PlanningItem>>('/planning/');
}

export function createPlanning(item: PlanningItem) {
  return apiClient.post<PlanningItem>('/planning/', item);
}

export function updatePlanning(itemId: string, updates: Partial<PlanningItem>) {
  return apiClient.patch<PlanningItem>(`/planning/${itemId}`, updates);
}

export interface DashboardSummary {
  total_tasks: number;
  pending_tasks: number;
  total_projects: number;
  total_balance: number;
  planning_count: number;
}

export function getDashboardSummary() {
  return apiClient.get<DashboardSummary>('/dashboard-summary');
}

export function getDatabaseTables() {
  return fetch('/api/db/tables')
    .then((res) => {
      if (!res.ok) {
        throw new Error('API request failed');
      }
      return res.json();
    })
    .then((json: { data: string[] }) => {
      console.log('DB TABLES RESPONSE:', json);
      return json.data;
    });
}

export function getDatabaseTableData(tableName: string) {
  return apiClient.get<Record<string, unknown>[]>(`/db/${encodeURIComponent(tableName)}`);
}

export function createDatabaseRecord(tableName: string, payload: Record<string, unknown>) {
  return apiClient.post<Record<string, unknown>>(`/db/${encodeURIComponent(tableName)}`, payload);
}

export function updateDatabaseRecord(tableName: string, recordId: string, payload: Record<string, unknown>) {
  return apiClient.put<Record<string, unknown>>(`/db/${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`, payload);
}

export function deleteDatabaseRecord(tableName: string, recordId: string) {
  return apiClient.delete(`/db/${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`);
}
