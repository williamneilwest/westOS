import { ApiError, apiClient } from './apiClient';
import type { Task } from '../types';

interface ListResponse<T> {
  data: T[];
  lastUpdated: string;
}

export const taskService = {
  getAll: () => apiClient.get<ListResponse<Task>>('/tasks/'),
  async getById(id: string) {
    try {
      return await apiClient.get<Task>(`/tasks/${id}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
  create: (data: Task) => apiClient.post<Task>('/tasks/', data),
  async update(id: string, updates: Partial<Task>) {
    try {
      return await apiClient.patch<Task>(`/tasks/${id}`, updates);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
  async delete(id: string) {
    try {
      await apiClient.delete(`/tasks/${id}`);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  },
  async getLastUpdated() {
    const payload = await apiClient.get<{ lastUpdated: string }>('/tasks/last-updated');
    return payload.lastUpdated;
  },
};
