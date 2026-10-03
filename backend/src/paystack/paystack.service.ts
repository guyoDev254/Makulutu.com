import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { logPaystackTest } from './paystack-test-log';
import axios, { AxiosInstance } from 'axios';
import {
  chargeEmailForMsisdn,
  isPaystackChargePendingSuccess,
  mapChargeToStkResponse,
  mapVerifyToStatus,
  mapWebhookToPayload,
  mapPaystackPayoutError,
  toKesSubunits,
  toPaystackMpesaPhone,
  toPaystackMpesaAccountNumber,
  verifyPaystackSignature,
} from './paystack.mapper';
import {
  PaystackChargeData,
  PaystackInitializeResponse,
  PaystackTransactionData,
  PaystackWebhookBody,
  STKPushRequest,
  STKPushResponse,
  TransactionStatusResponse,
  WebhookPayload,
} from './paystack.types';

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly secretKey: string;
  private readonly client: AxiosInstance;
  private readonly webhookHint: string;

  constructor(private configService: ConfigService) {
    this.secretKey =
      this.configService.get<string>('PAYSTACK_SECRET_KEY')?.trim() || '';
    const baseURL =
      this.configService.get<string>('PAYSTACK_BASE_URL')?.trim() ||
      'https://api.paystack.co';

    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 25000,
    });

    const ngrokUrl = this.configService.get<string>('NGROK_URL')?.trim();
    const webhookBaseUrlRaw =
      ngrokUrl ||
      this.configService.get<string>('WEBHOOK_BASE_URL')?.trim() ||
      this.configService.get<string>('BASE_URL')?.trim() ||
      'http://localhost:2000';
    const webhookBaseUrl = webhookBaseUrlRaw.replace(/\/$/, '');
    this.webhookHint = `${webhookBaseUrl}/paystack/webhook`;

    if (!this.secretKey) {
      this.logger.warn('PAYSTACK_SECRET_KEY is not configured');
    } else {
      this.logger.log(`Paystack webhook URL: ${this.webhookHint}`);
    }
  }

  isConfigured(): boolean {
    return Boolean(this.secretKey);
  }

  async initializeHostedCheckout(params: {
    email: string;
    amountKes: number;
    reference: string;
    callbackUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ authorizationUrl: string; reference: string }> {
    this.assertConfigured();
    const currency =
      this.configService.get<string>('PAYSTACK_CURRENCY')?.trim().toUpperCase() ||
      'KES';
    const amount = toKesSubunits(params.amountKes);
    try {
      const response = await this.client.post<{
        status: boolean;
        message?: string;
        data?: PaystackInitializeResponse;
      }>('/transaction/initialize', {
        email: params.email.trim().toLowerCase(),
        amount,
        currency,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: {
          paymentId: params.reference,
          ...(params.metadata || {}),
        },
        channels: [
          'card',
          'bank',
          'ussd',
          'qr',
          'mobile_money',
          'bank_transfer',
        ],
      });
      const url = response.data?.data?.authorization_url?.trim();
      const reference = response.data?.data?.reference?.trim() || params.reference;
      if (!response.data?.status || !url) {
        logPaystackTest({
          stage: 'initialize_failed',
          reference: params.reference,
          amountKes: params.amountKes,
          currency,
          message: response.data?.message || 'Could not start Paystack checkout',
        });
        throw new HttpException(
          response.data?.message || 'Could not start Paystack checkout',
          HttpStatus.BAD_REQUEST,
        );
      }
      logPaystackTest({
        stage: 'initialize',
        reference,
        amountKes: params.amountKes,
        currency,
        callbackUrl: params.callbackUrl,
        authorizationUrl: url,
      });
      return { authorizationUrl: url, reference };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = this.axiosMessage(error, 'Could not start Paystack checkout');
      this.logger.error(`Paystack initialize error: ${message}`);
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  async initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
    this.assertConfigured();
    const phone = toPaystackMpesaPhone(request.msisdn);
    const paymentId = request.reference || `pay_${Date.now()}`;
    const reference = paymentId.replace(/-/g, '');
    const amount = toKesSubunits(Number(request.amount));
    const payload = {
      email: chargeEmailForMsisdn(phone),
      amount,
      currency: 'KES' as const,
      reference,
      mobile_money: {
        phone,
        provider: 'mpesa',
      },
      metadata: {
        paymentId,
        msisdn: phone,
      },
    };

    const accept = (
      body:
        | {
            status?: boolean;
            message?: string;
            data?: PaystackChargeData;
          }
        | undefined,
      via: string,
    ): STKPushResponse => {
      logPaystackTest({
        stage: 'charge',
        via,
        paymentId,
        reference: body?.data?.reference || reference,
        amountKes: Number(request.amount),
        status: body?.data?.status,
        paystackId: body?.data?.id,
        displayText: body?.data?.display_text,
        message: body?.message,
      });
      return mapChargeToStkResponse(body?.data, reference);
    };

    try {
      this.logger.log(`Initiating Paystack M-Pesa charge for ${reference}`);
      const response = await this.client.post<{
        status: boolean;
        message?: string;
        data?: PaystackChargeData;
      }>('/charge', payload);

      if (isPaystackChargePendingSuccess(response.data)) {
        return accept(response.data, 'http_ok');
      }
      logPaystackTest({
        stage: 'charge_failed',
        reference,
        amountKes: Number(request.amount),
        message: response.data?.message || 'Failed to initiate M-Pesa charge',
      });
      throw new HttpException(
        response.data?.message || 'Failed to initiate M-Pesa charge',
        HttpStatus.BAD_REQUEST,
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (axios.isAxiosError(error)) {
        const body = error.response?.data as {
          status?: boolean;
          message?: string;
          data?: PaystackChargeData;
        } | undefined;
        if (isPaystackChargePendingSuccess(body)) {
          this.logger.log(
            `Paystack M-Pesa STK pending (${body?.message || 'Charge attempted'}) for ${reference}`,
          );
          return accept(body, 'http_error_pending');
        }
      }
      const message = this.axiosMessage(error, 'Failed to initiate M-Pesa charge');
      this.logger.error(`Paystack charge error: ${message}`);
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  async checkTransactionStatus(
    transactionRequestId: string,
  ): Promise<TransactionStatusResponse> {
    this.assertConfigured();
    try {
      const response = await this.client.get<{
        status: boolean;
        message?: string;
        data?: PaystackTransactionData;
      }>(`/transaction/verify/${encodeURIComponent(transactionRequestId)}`);

      if (!response.data?.status || !response.data.data) {
        logPaystackTest({
          stage: 'verify_failed',
          reference: transactionRequestId,
          message: response.data?.message || 'Failed to verify transaction',
        });
        throw new HttpException(
          response.data?.message || 'Failed to verify transaction',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = response.data.data;
      logPaystackTest({
        stage: 'verify',
        reference: data.reference || transactionRequestId,
        status: data.status,
        amountSubunits: data.amount,
        currency: data.currency,
        gatewayResponse: data.gateway_response,
        paidAt: data.paid_at,
        customerEmail: data.customer?.email,
        metadataPaymentId: data.metadata?.paymentId,
      });
      return mapVerifyToStatus(data);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = this.axiosMessage(
        error,
        'Failed to check transaction status',
      );
      this.logger.error(`Paystack verify error: ${message}`);
      throw new HttpException(message, HttpStatus.BAD_GATEWAY);
    }
  }

  async createMpesaRecipient(params: {
    name: string;
    msisdn: string;
  }): Promise<string> {
    this.assertConfigured();
    const accountNumber = toPaystackMpesaAccountNumber(params.msisdn);
    const name = params.name.trim().slice(0, 80) || 'Streamer';
    try {
      const response = await this.client.post('/transferrecipient', {
        type: 'mobile_money',
        name,
        account_number: accountNumber,
        bank_code: 'MPESA',
        currency: 'KES',
      });
      const code = response.data?.data?.recipient_code as string | undefined;
      logPaystackTest({
        stage: 'transfer-recipient',
        accountNumber,
        recipientCode: code,
        message: response.data?.message,
      });
      if (!code) {
        throw new HttpException(
          'Paystack did not return a payout recipient',
          HttpStatus.BAD_GATEWAY,
        );
      }
      return code;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = this.axiosMessage(error, 'Failed to save M-Pesa payout recipient');
      this.logger.error(`Paystack transfer recipient error: ${message}`);
      throw new HttpException(message, HttpStatus.BAD_GATEWAY);
    }
  }

  async createKepssRecipient(params: {
    name: string;
    accountNumber: string;
    bankCode: string;
  }): Promise<string> {
    this.assertConfigured();
    const accountNumber = params.accountNumber.replace(/\s+/g, '');
    const name = params.name.trim().slice(0, 80) || 'Streamer';
    try {
      const response = await this.client.post('/transferrecipient', {
        type: 'kepss',
        name,
        account_number: accountNumber,
        bank_code: params.bankCode.trim(),
        currency: 'KES',
      });
      const code = response.data?.data?.recipient_code as string | undefined;
      logPaystackTest({
        stage: 'transfer-recipient-bank',
        accountNumber: `****${accountNumber.slice(-4)}`,
        bankCode: params.bankCode,
        recipientCode: code,
        message: response.data?.message,
      });
      if (!code) {
        throw new HttpException(
          'Paystack did not return a bank payout recipient',
          HttpStatus.BAD_GATEWAY,
        );
      }
      return code;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = this.axiosMessage(error, 'Failed to save bank payout recipient');
      this.logger.error(`Paystack bank recipient error: ${message}`);
      throw new HttpException(message, HttpStatus.BAD_GATEWAY);
    }
  }

  async listKenyaBanks(): Promise<{ name: string; code: string }[]> {
    this.assertConfigured();
    const parse = (rows: unknown): { name: string; code: string }[] => {
      if (!Array.isArray(rows)) return [];
      const seen = new Set<string>();
      const out: { name: string; code: string }[] = [];
      for (const row of rows) {
        const rec = row as { code?: string; name?: string; slug?: string };
        const code = String(rec?.code || rec?.slug || '').trim();
        const name = String(rec?.name || '').trim();
        if (!code || !name || seen.has(code)) continue;
        seen.add(code);
        out.push({ name, code });
      }
      out.sort((a, b) => a.name.localeCompare(b.name));
      return out;
    };
    try {
      const withCurrency = await this.client.get('/bank', {
        params: { country: 'kenya', currency: 'KES' },
      });
      let out = parse(withCurrency.data?.data);
      if (out.length === 0) {
        const kenyaOnly = await this.client.get('/bank', {
          params: { country: 'kenya' },
        });
        out = parse(kenyaOnly.data?.data);
      }
      return out;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = this.axiosMessage(error, 'Failed to load Kenyan banks');
      throw new HttpException(message, HttpStatus.BAD_GATEWAY);
    }
  }

  async initiateKesTransfer(params: {
    amountKes: number;
    recipientCode: string;
    reference: string;
    reason: string;
  }): Promise<{ reference: string; transferCode: string; status: string }> {
    this.assertConfigured();
    const amount = toKesSubunits(params.amountKes);
    try {
      const response = await this.client.post('/transfer', {
        source: 'balance',
        amount,
        recipient: params.recipientCode,
        reason: params.reason.slice(0, 80),
        reference: params.reference,
        currency: 'KES',
      });
      const data = response.data?.data as
        | {
            reference?: string;
            transfer_code?: string;
            status?: string;
          }
        | undefined;
      const status = String(data?.status || '').toLowerCase();
      logPaystackTest({
        stage: 'transfer',
        reference: data?.reference || params.reference,
        transferCode: data?.transfer_code,
        status,
        amountSubunits: amount,
        message: response.data?.message,
      });
      if (status === 'otp' || String(response.data?.message || '').toLowerCase().includes('otp')) {
        throw new HttpException(
          'Paystack transfer OTP is enabled. Disable transfer OTP in the Paystack dashboard so streamer payouts can send automatically.',
          HttpStatus.BAD_GATEWAY,
        );
      }
      if (!data?.reference && !data?.transfer_code) {
        throw new HttpException(
          'Paystack did not queue the payout transfer',
          HttpStatus.BAD_GATEWAY,
        );
      }
      return {
        reference: data.reference || params.reference,
        transferCode: data.transfer_code || '',
        status,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = this.axiosMessage(error, 'Failed to send payout via Paystack');
      this.logger.error(`Paystack transfer error: ${message}`);
      throw new HttpException(
        mapPaystackPayoutError(message),
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  verifySignature(rawBody: Buffer | string | undefined, signature?: string): boolean {
    if (!rawBody) return false;
    return verifyPaystackSignature(rawBody, signature, this.secretKey);
  }

  toWebhookPayload(body: PaystackWebhookBody): WebhookPayload | null {
    return mapWebhookToPayload(body);
  }

  private assertConfigured() {
    if (!this.secretKey) {
      throw new HttpException(
        'Paystack is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private axiosMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as { message?: string } | undefined;
      return data?.message || error.message || fallback;
    }
    return error instanceof Error ? error.message : fallback;
  }
}
