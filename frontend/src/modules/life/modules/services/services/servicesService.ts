import { apiClient } from '../../../services/apiClient';
import type { ServicesPayload, ServicesStatusPayload } from '../types';

export const servicesService = {
  getCategories: () => apiClient.get<ServicesPayload>('/services'),
  getStatuses: () => apiClient.get<ServicesStatusPayload>('/services/status'),
};
