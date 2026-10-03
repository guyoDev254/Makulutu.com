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
    const status = error.response?.status
    const reqUrl = String(error.config?.url || '')
    const isLoginAttempt = reqUrl.includes('/auth/login')
    if (status === 401 && typeof window !== 'undefined' && !isLoginAttempt) {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export interface RegisterSubscriptionDto {
  name: string;
  tiktokUsername: string;
  mpesaMobile?: string;
  whatsappNumber?: string;
  months: number;
  monthlyPrice?: number;
  creatorSlug?: string;
  /** `mpesa` (default): STK. `paypal`: PayPal. `paystack`: hosted card / international. */
  paymentMethod?: 'mpesa' | 'paypal' | 'paystack';
  email?: string;
  checkoutCountry?: string;
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
    amountKes?: number;
    months: number;
    status: string;
    statusUpper?: string;
    transactionRequestId?: string;
  };
  message: string;
}

export type RegisterSubscriptionResponse = PaymentResponse & {
  approvalUrl?: string;
};

export type StreamAlertLimits = {
  minKes: number;
  minKesWithVideo: number;
  maxKes: number;
};

export type SupportCatalogMembershipItem = {
  kind: 'membership';
  id: 'membership';
  title: string;
  description: string | null;
  monthlyPriceKes: number;
};

export type SupportCatalogShoutoutItem = {
  kind: 'shoutout';
  id: 'shoutout';
  title: string;
  description: string | null;
  limits: StreamAlertLimits;
};

export type SupportCatalogRewardItem = {
  kind: 'reward';
  id: string;
  name: string;
  description: string | null;
  amountKes: number;
  alertBannerLabel: string;
  allowSupporterMessage: boolean;
  allowVideoClip: boolean;
  maxMessageLength: number;
  accentColor: string | null;
};

export type SupportCatalogItem =
  | SupportCatalogMembershipItem
  | SupportCatalogShoutoutItem
  | SupportCatalogRewardItem;

export interface SupportCatalogResponse {
  items: SupportCatalogItem[];
}

export const subscriptionApi = {
  register: async (
    data: RegisterSubscriptionDto,
  ): Promise<RegisterSubscriptionResponse> => {
    const response = await api.post('/subscriptions/register', data);
    return response.data;
  },

  checkPaymentStatus: async (paymentId: string) => {
    const response = await api.get(`/payments/${paymentId}/status`);
    return response.data;
  },

  getMonthlyPrice: async (creatorSlug?: string) => {
    const qs = creatorSlug
      ? `?creatorSlug=${encodeURIComponent(creatorSlug)}`
      : '';
    const response = await api.get(`/subscriptions/price${qs}`);
    return response.data;
  },

  /** Membership, live shoutout, and custom reward tiers in admin-configured order. */
  getSupportCatalog: async (creatorSlug?: string) => {
    const qs = creatorSlug
      ? `?creatorSlug=${encodeURIComponent(creatorSlug)}`
      : '';
    const response = await api.get<SupportCatalogResponse>(
      `/subscriptions/support-catalog${qs}`,
    );
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
  mpesaMobile?: string;
  platform: StreamAlertPlatform;
  /** KES amount; minimum 10. */
  amount: number;
  message?: string;
  /** Optional TikTok clip URL (https); server validates embed. */
  videoUrl?: string;
  creatorSlug?: string;
  paymentMethod?: 'mpesa' | 'paystack';
  email?: string;
}

export interface StreamAlertCheckoutResponse {
  payment: { id: string; amount: number; status: string; transactionRequestId?: string };
  message: string;
  approvalUrl?: string;
}

export const streamAlertApi = {
  getLimits: async (creatorSlug?: string): Promise<StreamAlertLimits> => {
    const qs = creatorSlug
      ? `?creatorSlug=${encodeURIComponent(creatorSlug)}`
      : '';
    const response = await api.get(`/stream-alerts/limits${qs}`);
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
  creatorSlug?: string;
}

export interface CoachingBookingCheckoutResponse {
  payment: { id: string; amount: number; status: string; transactionRequestId?: string };
  message: string;
}

export const coachingBookingApi = {
  getPricing: async (
    creatorSlug?: string,
  ): Promise<{ accountReviewKes: number }> => {
    const qs = creatorSlug
      ? `?creatorSlug=${encodeURIComponent(creatorSlug)}`
      : '';
    const response = await api.get(`/coaching-bookings/pricing${qs}`);
    return response.data;
  },
  checkout: async (
    data: CoachingBookingCheckoutDto,
  ): Promise<CoachingBookingCheckoutResponse> => {
    const response = await api.post('/coaching-bookings/checkout', data);
    return response.data;
  },
};

export interface PublicCreatorReward {
  id: string;
  name: string;
  description: string | null;
  amountKes: number;
  alertBannerLabel: string;
  allowSupporterMessage: boolean;
  allowVideoClip: boolean;
  maxMessageLength: number;
  accentColor: string | null;
}

export interface CreatorRewardCheckoutDto {
  displayName: string;
  mpesaMobile?: string;
  platform?: StreamAlertPlatform;
  message?: string;
  videoUrl?: string;
  paymentMethod?: 'mpesa' | 'paystack';
  email?: string;
}

export const creatorRewardApi = {
  list: async (creatorSlug?: string): Promise<PublicCreatorReward[]> => {
    const qs = creatorSlug
      ? `?creatorSlug=${encodeURIComponent(creatorSlug)}`
      : '';
    const response = await api.get(`/creator-rewards${qs}`);
    return response.data;
  },
  checkout: async (
    rewardId: string,
    data: CreatorRewardCheckoutDto,
  ): Promise<StreamAlertCheckoutResponse> => {
    const response = await api.post(`/creator-rewards/${rewardId}/checkout`, data);
    return response.data;
  },
};

export default api;
