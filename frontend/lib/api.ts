import axios from 'axios';
import { getAuthToken } from './auth';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://mohagamer.northernbox.org'
    : 'http://localhost:2000');

/** Resolved API base (for error messages / debugging). */
export const API_BASE_URL = API_URL;

export function isAxiosNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { response?: unknown; code?: string; message?: string };
  return !e.response && (e.code === 'ERR_NETWORK' || e.message === 'Network Error');
}

export function apiNetworkErrorHint(): string {
  const local = API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')
  if (local) {
    return `Cannot reach ${API_BASE_URL}. Start the API (e.g. backend on port 2000) and check NEXT_PUBLIC_API_URL in frontend/.env.`
  }
  return `Cannot reach ${API_BASE_URL}. On Vercel, set NEXT_PUBLIC_API_URL to your API origin. On the API, add this site’s origin to CORS_ORIGINS (comma-separated).`
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface RegisterSubscriptionDto {
  name: string;
  tiktokUsername: string;
  mpesaMobile: string;
  whatsappNumber: string;
  months: number;
  monthlyPrice?: number;
}

export interface PaymentResponse {
  user: {
    id: string;
    name: string;
    tiktokUsername: string;
  };
  payment: {
    id: string;
    amount: number;
    months: number;
    status: string;
    transactionRequestId?: string;
  };
  message: string;
}

export const subscriptionApi = {
  register: async (data: RegisterSubscriptionDto): Promise<PaymentResponse> => {
    const response = await api.post('/subscriptions/register', data);
    return response.data;
  },

  checkPaymentStatus: async (paymentId: string) => {
    const response = await api.get(`/payments/${paymentId}/status`);
    return response.data;
  },

  getMonthlyPrice: async () => {
    const response = await api.get('/subscriptions/price');
    return response.data;
  },
};

export type StreamAlertPlatform =
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'facebook'
  | 'x'
  | 'twitch'
  | 'other';

export interface StreamAlertCheckoutDto {
  displayHandle: string;
  mpesaMobile: string;
  platform: StreamAlertPlatform;
  /** KES amount; minimum 10. */
  amount: number;
  message?: string;
}

export interface StreamAlertCheckoutResponse {
  payment: { id: string; amount: number; status: string; transactionRequestId?: string };
  message: string;
}

export const streamAlertApi = {
  checkout: async (
    data: StreamAlertCheckoutDto,
  ): Promise<StreamAlertCheckoutResponse> => {
    const response = await api.post('/stream-alerts/checkout', data);
    return response.data;
  },
};

export default api;
