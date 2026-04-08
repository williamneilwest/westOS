import { ApiError, apiClient } from './apiClient';
import type { Project, Task } from '../types';

interface ListResponse<T> {
  data: T[];
  lastUpdated: string;
}

export interface ExampleProject extends Project {
  tasks: Task[];
}

export const projectService = {
  getAll: () => apiClient.get<ListResponse<Project>>('/projects/'),
  getExamples: () => apiClient.get<ListResponse<ExampleProject>>('/projects/examples'),
  async getById(id: string) {
    try {
      return await apiClient.get<Project>(`/projects/${id}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
  create: (data: Project) => apiClient.post<Project>('/projects/', data),
  async update(id: string, updates: Partial<Project>) {
    try {
      return await apiClient.patch<Project>(`/projects/${id}`, updates);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
  async delete(id: string) {
    try {
      await apiClient.delete(`/projects/${id}`);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  },
  async getLastUpdated() {
    const payload = await apiClient.get<{ lastUpdated: string }>('/projects/last-updated');
    return payload.lastUpdated;
  },
};
