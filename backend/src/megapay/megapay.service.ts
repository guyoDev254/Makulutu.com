import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { normalizeKenyaMsisdn } from '../common/utils/mpesa-msisdn';
import {
  isMegaPayStkAccepted,
  megaPayReferenceFromPaymentId,
  megaPayStkErrorMessage,
  isHostWafBlockMessage,
  type MegaPayStkBody,
} from './megapay-stk';

export interface STKPushRequest {
  amount: number;
  msisdn: string;
  reference?: string;
}

export interface STKPushResponse {
  success: string;
  massage: string;
  transaction_request_id: string;
}

export interface TransactionStatusResponse {
  ResultCode: string;
  ResultDesc: string;
  TransactionID: string;
  TransactionStatus: string;
  TransactionCode: string;
  TransactionReceipt: string;
  TransactionAmount: string;
  Msisdn: string;
  TransactionDate: string;
  TransactionReference: string;
}

export interface WebhookPayload {
  ResponseCode: number;
  ResponseDescription: string;
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  TransactionID: string;
  TransactionAmount: number;
  TransactionReceipt?: string;
  TransactionDate?: string;
  TransactionReference?: string;
  Msisdn?: string;
}

@Injectable()
export class MegapayService {
  private readonly logger = new Logger(MegapayService.name);
  private readonly apiKey: string;
  private readonly email: string;
  private readonly baseUrl: string;
  private readonly http: AxiosInstance;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('MEGAPAY_API_KEY')?.trim() || '';
    this.email = this.configService.get<string>('MEGAPAY_EMAIL')?.trim() || '';
    this.baseUrl = (
      this.configService.get<string>('MEGAPAY_BASE_URL')?.trim() ||
      'https://megapay.co.ke/backend/v1'
    ).replace(/\/+$/, '');

    const userAgent =
      this.configService.get<string>('MEGAPAY_HTTP_USER_AGENT')?.trim() ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 25000,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-KE,en;q=0.9',
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
      },
    });

    if (!this.apiKey || !this.email) {
      this.logger.warn('MegaPay API credentials not configured');
    }
  }

  async initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
    this.assertConfigured();
    try {
      const formattedPhone = this.formatPhoneNumber(request.msisdn);
      const amountKes = Math.round(Number(request.amount));
      if (!Number.isFinite(amountKes) || amountKes < 1) {
        throw new HttpException(
          'Payment amount must be at least KES 1',
          HttpStatus.BAD_REQUEST,
        );
      }

      const rawRef = request.reference || `SUB_${Date.now()}`;
      const payload = {
        api_key: this.apiKey,
        email: this.email,
        amount: String(amountKes),
        msisdn: formattedPhone,
        reference: /^[0-9a-f-]{36}$/i.test(rawRef)
          ? megaPayReferenceFromPaymentId(rawRef)
          : rawRef.slice(0, 32),
      };

      this.logger.log(
        `Initiating MegaPay STK Push for ${payload.reference} (${payload.msisdn}, KES ${payload.amount})`,
      );

      const response = await this.postStk('/initiatestk', payload);

      const data = response.data;
      if (isMegaPayStkAccepted(data)) {
        const transaction_request_id = String(
          data.transaction_request_id ?? '',
        ).trim();
        this.logger.log(`STK Push initiated: ${transaction_request_id}`);
        return {
          success: '200',
          massage: megaPayStkErrorMessage(data, 'Request sent successfully.'),
          transaction_request_id,
        };
      }

      this.logger.error(
        `MegaPay STK rejected: ${JSON.stringify(data)}`,
      );
      throw new HttpException(
        megaPayStkErrorMessage(data),
        HttpStatus.BAD_REQUEST,
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `STK Push error: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (axios.isAxiosError(error) && error.response) {
        const data = error.response.data as MegaPayStkBody;
        this.logger.error(
          `MegaPay STK HTTP ${error.response.status} from ${this.baseUrl}: ${JSON.stringify(data)}`,
        );
        throw new HttpException(
          megaPayStkErrorMessage(data, 'STK Push failed'),
          this.stkFailureHttpStatus(error.response.status, data),
        );
      }
      throw new HttpException(
        'Could not reach MegaPay. Try again in a moment.',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async checkTransactionStatus(
    transactionRequestId: string,
  ): Promise<TransactionStatusResponse> {
    this.assertConfigured();
    try {
      const payload = {
        api_key: this.apiKey,
        email: this.email,
        transaction_request_id: transactionRequestId,
      };

      const response = await this.http.post<TransactionStatusResponse>(
        '/transactionstatus',
        payload,
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Transaction status check error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        'Failed to check transaction status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async postStk(path: string, payload: object) {
    try {
      return await this.http.post<MegaPayStkBody>(path, payload);
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 403 &&
        isHostWafBlockMessage(JSON.stringify(error.response.data ?? ''))
      ) {
        this.logger.warn(
          `MegaPay 403 WAF on ${this.baseUrl}${path}; retrying once with the same payload`,
        );
        await new Promise((r) => setTimeout(r, 400));
        return await this.http.post<MegaPayStkBody>(path, payload);
      }
      throw error;
    }
  }

  private stkFailureHttpStatus(
    upstreamStatus: number,
    data: MegaPayStkBody,
  ): number {
    const text = JSON.stringify(data);
    if (upstreamStatus === 403 || isHostWafBlockMessage(text)) {
      return HttpStatus.BAD_GATEWAY;
    }
    return upstreamStatus >= 400 && upstreamStatus < 600
      ? upstreamStatus
      : HttpStatus.BAD_REQUEST;
  }

  private formatPhoneNumber(phone: string): string {
    const normalized = normalizeKenyaMsisdn(phone);
    if (!normalized) {
      throw new HttpException(
        'Enter a valid Kenyan M-Pesa number',
        HttpStatus.BAD_REQUEST,
      );
    }
    return normalized;
  }

  validateWebhook(payload: unknown): payload is WebhookPayload {
    if (!payload || typeof payload !== 'object') return false;
    const p = payload as Record<string, unknown>;
    return (
      typeof p.ResponseCode === 'number' &&
      Boolean(p.TransactionID) &&
      p.TransactionAmount !== undefined
    );
  }

  private assertConfigured() {
    if (!this.apiKey || !this.email) {
      throw new HttpException(
        'MegaPay is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
