import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, isAxiosError } from 'axios';

type PayPalLink = { href: string; rel: string; method?: string };

type CreateOrderResult = {
  id: string;
  status: string;
  approvalUrl: string;
};

type CaptureOrderResult = {
  id: string;
  status: string;
  captureId: string | null;
};

@Injectable()
export class PaypalService {
  private readonly logger = new Logger(PaypalService.name);
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    const mode = (this.config.get<string>('PAYPAL_MODE') || 'sandbox').toLowerCase();
    return mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  isConfigured(): boolean {
    const id = this.config.get<string>('PAYPAL_CLIENT_ID')?.trim();
    const secret = this.config.get<string>('PAYPAL_CLIENT_SECRET')?.trim();
    return Boolean(id && secret);
  }

  private async getAccessToken(): Promise<string> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('PayPal is not configured');
    }
    const now = Date.now();
    if (this.accessToken && now < this.accessTokenExpiresAt - 60_000) {
      return this.accessToken;
    }
    const clientId = this.config.get<string>('PAYPAL_CLIENT_ID')!.trim();
    const secret = this.config.get<string>('PAYPAL_CLIENT_SECRET')!.trim();
    const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
    const res = await axios.post(
      `${this.baseUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );
    const token = res.data?.access_token as string | undefined;
    const expiresIn = Number(res.data?.expires_in) || 300;
    if (!token) {
      throw new ServiceUnavailableException('PayPal OAuth failed');
    }
    this.accessToken = token;
    this.accessTokenExpiresAt = now + expiresIn * 1000;
    return token;
  }

  private async client(): Promise<AxiosInstance> {
    const token = await this.getAccessToken();
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * PayPal Orders API does not support KES. Default checkout currency is USD with a configurable
   * KES→USD rate (see PAYPAL_KES_PER_USD). Set PAYPAL_CHECKOUT_CURRENCY=KES only if your account
   * supports it.
   */
  private checkoutAmountFromKes(amountKes: number): { currencyCode: string; value: string } {
    const raw = (this.config.get<string>('PAYPAL_CHECKOUT_CURRENCY') || 'USD').trim().toUpperCase();
    const currencyCode = raw || 'USD';

    if (currencyCode === 'KES') {
      return {
        currencyCode: 'KES',
        value: Number(amountKes).toFixed(2),
      };
    }

    if (currencyCode !== 'USD') {
      throw new BadRequestException(
        `Unsupported PAYPAL_CHECKOUT_CURRENCY "${currencyCode}". Use USD (recommended) or KES.`,
      );
    }

    const kesPerUsd = Math.max(
      Number.EPSILON,
      Number(this.config.get<string>('PAYPAL_KES_PER_USD')?.trim()) || 150,
    );
    const usd = amountKes / kesPerUsd;
    const rounded = Math.max(0.01, Math.round(usd * 100) / 100);
    return { currencyCode: 'USD', value: rounded.toFixed(2) };
  }

  private static paypalApiErrorMessage(status: number, data: unknown): string {
    const d = data as {
      message?: string;
      details?: Array<{ issue?: string; description?: string; field?: string }>;
    };
    const parts =
      d?.details
        ?.map((x) => x.description || x.issue || x.field)
        .filter((x): x is string => Boolean(x)) ?? [];
    if (parts.length) return parts.join('; ');
    if (typeof d?.message === 'string' && d.message) return d.message;
    return `PayPal request failed (${status})`;
  }

  /**
   * Create a Checkout order (intent CAPTURE). customId should be our Payment row id.
   */
  async createOrder(params: {
    amountKes: number;
    customId: string;
    description: string;
    returnUrl: string;
    cancelUrl: string;
    brandName?: string;
  }): Promise<CreateOrderResult> {
    const http = await this.client();
    const { currencyCode, value } = this.checkoutAmountFromKes(params.amountKes);
    const body = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: params.customId,
          custom_id: params.customId,
          description: params.description.slice(0, 127),
          amount: {
            currency_code: currencyCode,
            value,
          },
        },
      ],
      application_context: {
        brand_name: (params.brandName || 'Makulutu').slice(0, 127),
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
    };
    try {
      const res = await http.post('/v2/checkout/orders', body);
      const id = res.data?.id as string;
      const links = (res.data?.links || []) as PayPalLink[];
      const approve = links.find((l) => l.rel === 'approve');
      if (!id || !approve?.href) {
        this.logger.error(`PayPal create order unexpected response: ${JSON.stringify(res.data)}`);
        throw new ServiceUnavailableException('PayPal could not create checkout order');
      }
      return { id, status: res.data?.status || 'CREATED', approvalUrl: approve.href };
    } catch (e: unknown) {
      if (isAxiosError(e) && e.response?.data) {
        this.logger.warn(
          `PayPal create order ${e.response.status}: ${JSON.stringify(e.response.data)}`,
        );
        throw new BadRequestException(PaypalService.paypalApiErrorMessage(e.response.status, e.response.data));
      }
      throw e;
    }
  }

  async captureOrder(orderId: string): Promise<CaptureOrderResult> {
    const http = await this.client();
    const res = await http.post(`/v2/checkout/orders/${orderId}/capture`, {});
    const status = res.data?.status as string;
    const captureId =
      res.data?.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;
    return {
      id: res.data?.id || orderId,
      status: status || 'UNKNOWN',
      captureId,
    };
  }

  async getOrder(orderId: string): Promise<{ status: string; customId: string | null }> {
    const http = await this.client();
    const res = await http.get(`/v2/checkout/orders/${orderId}`);
    const customId = res.data?.purchase_units?.[0]?.custom_id ?? null;
    return {
      status: res.data?.status || '',
      customId: typeof customId === 'string' ? customId : null,
    };
  }
}
