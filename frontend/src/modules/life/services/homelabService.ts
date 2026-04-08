import { apiClient } from './apiClient';
import type { HomelabServiceItem } from '../modules/homelab/types';

export const homelabService = {
  async getAll() {
    return apiClient.get<{ data: HomelabServiceItem[] }>('/homelab/');
  },
  create: (data: HomelabServiceItem) => apiClient.post<HomelabServiceItem>('/homelab/', data),
  updateStatus: (id: string, status: HomelabServiceItem['status']) => apiClient.patch<HomelabServiceItem>(`/homelab/${id}`, { status }),
};
