import { apiClient } from './apiClient';
import type { HomePlanInput, HomePlanScenario } from '../types';

export const homePlanningService = {
  getProfile: () => apiClient.get<HomePlanInput>('/home-planning/'),
  saveProfile: (data: HomePlanInput) => apiClient.post<HomePlanInput>('/home-planning/', data),
  async getScenarios() {
    const payload = await apiClient.get<{ data: Array<HomePlanScenario & { id: string }> }>('/home-planning/scenarios');
    return payload.data.map((scenario) => ({
      label: scenario.label,
      multiplier: scenario.multiplier,
    }));
  },
};
