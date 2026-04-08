import { apiBaseUrl } from '@/shared/config/env';

const API_BASE_URL = apiBaseUrl;

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let message = `API request failed: ${response.status} ${response.statusText}`;
    try {
      const payload = (await response.json()) as ApiEnvelope<unknown>;
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Keep default message if response is not JSON.
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as ApiEnvelope<T> | T;
  if (typeof payload === 'object' && payload !== null && 'success' in payload) {
    if (!payload.success) {
      throw new ApiError(response.status, payload.error || 'Request failed');
    }
    return payload.data as T;
  }
  return payload as T;
}

export const apiClient = {
  get<T>(url: string): Promise<T> {
    return request<T>(url, { method: 'GET' });
  },
  post<T>(url: string, data: unknown): Promise<T> {
    return request<T>(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  patch<T>(url: string, data: unknown): Promise<T> {
    return request<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  put<T>(url: string, data: unknown): Promise<T> {
    return request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete(url: string): Promise<void> {
    return request<void>(url, { method: 'DELETE' });
  },
};
