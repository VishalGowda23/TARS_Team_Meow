// TARS API Client
// Base HTTP client with error handling and retries

import { REQUEST_TIMEOUT, RETRY_CONFIG, API_CONFIG } from './config';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp?: string;
  requestId?: string;
  // Allow additional properties from responses
  [key: string]: any;
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'ApiError';
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get auth headers helper
function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  
  const accessToken = localStorage.getItem('tars-access-token');
  
  if (accessToken) {
    return {
      'Authorization': `Bearer ${accessToken}`,
    };
  }
  
  return {};
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  retries = RETRY_CONFIG.maxRetries
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...(getAuthHeaders() as Record<string, string>), // Automatically include auth headers
  };

  // Don't set Content-Type for FormData (browser will set it with boundary)
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || data.message || 'Request failed',
        data.code || 'UNKNOWN_ERROR',
        response.status
      );
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      // Retry on network errors
      if (retries > 0 && (error.name === 'AbortError' || error.message.includes('fetch'))) {
        const delay = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(2, RETRY_CONFIG.maxRetries - retries),
          RETRY_CONFIG.maxDelay
        );
        await sleep(delay);
        return apiRequest<T>(url, options, retries - 1);
      }

      throw new ApiError(
        error.message,
        'NETWORK_ERROR',
        0
      );
    }

    throw new ApiError('Unknown error occurred', 'UNKNOWN_ERROR', 0);
  }
}

// Simplified API client for backend calls
export const apiClient = {
  get: async <T = any>(endpoint: string, options?: { headers?: HeadersInit }): Promise<T> => {
    const url = `${API_CONFIG.BACKEND.BASE_URL}${endpoint}`;
    return apiRequest<T>(url, { 
      method: 'GET',
      headers: options?.headers
    });
  },

  post: async <T = any>(endpoint: string, body?: any, options?: { headers?: HeadersInit }): Promise<T> => {
    const url = `${API_CONFIG.BACKEND.BASE_URL}${endpoint}`;
    return apiRequest<T>(url, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: options?.headers
    });
  },

  put: async <T = any>(endpoint: string, body?: any, options?: { headers?: HeadersInit }): Promise<T> => {
    const url = `${API_CONFIG.BACKEND.BASE_URL}${endpoint}`;
    return apiRequest<T>(url, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: options?.headers
    });
  },

  delete: async <T = any>(endpoint: string, options?: { headers?: HeadersInit }): Promise<T> => {
    const url = `${API_CONFIG.BACKEND.BASE_URL}${endpoint}`;
    return apiRequest<T>(url, { 
      method: 'DELETE',
      headers: options?.headers
    });
  },
};

// Legacy helpers for backwards compatibility
export async function get<T>(url: string, headers?: HeadersInit): Promise<ApiResponse<T>> {
  const data = await apiRequest<ApiResponse<T>>(url, { method: 'GET', headers });
  return data;
}

export async function post<T>(
  url: string,
  body?: unknown,
  headers?: HeadersInit
): Promise<ApiResponse<T>> {
  const data = await apiRequest<ApiResponse<T>>(url, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
    headers,
  });
  return data;
}

// Helper for authenticated requests
export function withAuth(token: string): HeadersInit {
  return {
    'Authorization': `Bearer ${token}`,
  };
}
