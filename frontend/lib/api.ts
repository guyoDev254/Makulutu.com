import axios from 'axios';
import { getAuthToken } from './auth';
import { API_BASE_URL } from './api-origin';

export { API_BASE_URL, apiNetworkErrorHint } from './api-origin';

export function isAxiosNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { response?: unknown; code?: string; message?: string };
  return !e.response && (e.code === 'ERR_NETWORK' || e.message === 'Network Error');
}

const api = axios.create({
  baseURL: API_BASE_URL,
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
  /** Optional TikTok clip URL (https); server validates embed. */
  videoUrl?: string;
}

export interface StreamAlertCheckoutResponse {
  payment: { id: string; amount: number; status: string; transactionRequestId?: string };
  message: string;
}

export type StreamAlertLimits = {
  minKes: number;
  minKesWithVideo: number;
  maxKes: number;
};

export const streamAlertApi = {
  getLimits: async (): Promise<StreamAlertLimits> => {
    const response = await api.get('/stream-alerts/limits');
    return response.data;
  },
  checkout: async (
    data: StreamAlertCheckoutDto,
  ): Promise<StreamAlertCheckoutResponse> => {
    const response = await api.post('/stream-alerts/checkout', data);
    return response.data;
  },
};

export interface CoachingBookingCheckoutDto {
  service: 'account_review' | 'both';
  name: string;
  contact: string;
  mpesaMobile: string;
  accountUsername: string;
  availability?: string;
  notes?: string;
}

export interface CoachingBookingCheckoutResponse {
  payment: { id: string; amount: number; status: string; transactionRequestId?: string };
  message: string;
}

export const coachingBookingApi = {
  getPricing: async (): Promise<{ accountReviewKes: number }> => {
    const response = await api.get('/coaching-bookings/pricing');
    return response.data;
  },
  checkout: async (
    data: CoachingBookingCheckoutDto,
  ): Promise<CoachingBookingCheckoutResponse> => {
    const response = await api.post('/coaching-bookings/checkout', data);
    return response.data;
  },
};

export default api;
