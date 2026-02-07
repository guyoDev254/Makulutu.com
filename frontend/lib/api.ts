import axios from 'axios';
import { getAuthToken } from './auth';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://mohagamer.northernbox.co.ke'
    : 'http://localhost:2000');

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

export default api;
