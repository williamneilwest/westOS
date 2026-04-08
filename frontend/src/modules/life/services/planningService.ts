import { ApiError, apiClient } from './apiClient';
import type { PlanningItem } from '../types';

interface ListResponse<T> {
  data: T[];
  lastUpdated: string;
}

export const planningService = {
  getAll: () => apiClient.get<ListResponse<PlanningItem>>('/planning/'),
  async getById(id: string) {
    try {
      return await apiClient.get<PlanningItem>(`/planning/${id}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
  create: (data: PlanningItem) => apiClient.post<PlanningItem>('/planning/', data),
  async update(id: string, updates: Partial<PlanningItem>) {
    try {
      return await apiClient.patch<PlanningItem>(`/planning/${id}`, updates);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
  async delete(id: string) {
    try {
      await apiClient.delete(`/planning/${id}`);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  },
  async getLastUpdated() {
    const payload = await apiClient.get<{ lastUpdated: string }>('/planning/last-updated');
    return payload.lastUpdated;
  },
};
