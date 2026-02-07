import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

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
  private readonly callbackUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('MEGAPAY_API_KEY');
    this.email = this.configService.get<string>('MEGAPAY_EMAIL');
    this.baseUrl = this.configService.get<string>('MEGAPAY_BASE_URL') || 'https://megapay.co.ke/backend/v1';
    
    // Construct callback URL for webhook notifications
    // Priority: NGROK_URL > WEBHOOK_BASE_URL > BASE_URL > localhost
    // Note: Remove any trailing slashes and trim whitespace
    const ngrokUrl = this.configService.get<string>('NGROK_URL')?.trim();
    const webhookBaseUrlRaw = ngrokUrl || 
                          this.configService.get<string>('WEBHOOK_BASE_URL')?.trim() || 
                          this.configService.get<string>('BASE_URL')?.trim() || 
                          'http://localhost:3001';
    
    // Remove trailing slash if present
    const webhookBaseUrl = webhookBaseUrlRaw.replace(/\/$/, '');
    this.callbackUrl = `${webhookBaseUrl}/megapay/webhook`;

    if (!this.apiKey || !this.email) {
      this.logger.warn('MegaPay API credentials not configured');
    }
    
    if (ngrokUrl) {
      this.logger.log(`✅ Using ngrok for webhook: ${this.callbackUrl}`);
    } else {
      this.logger.log(`MegaPay callback URL configured: ${this.callbackUrl}`);
    }
    
    // Log warning if using localhost in production-like environment
    if (this.callbackUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
      this.logger.warn('⚠️  Warning: Using localhost callback URL in production!');
    }
  }

  /**
   * Initiate STK Push to customer's phone
   */
  async initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
    try {
      // Format phone number (ensure it starts with 254)
      const formattedPhone = this.formatPhoneNumber(request.msisdn);

      const payload = {
        api_key: this.apiKey,
        email: this.email,
        amount: request.amount.toString(),
        msisdn: formattedPhone,
        reference: request.reference || `SUB_${Date.now()}`,
        callback_url: this.callbackUrl,
      };

      this.logger.log(`Initiating STK Push with callback URL: ${this.callbackUrl}`);
      this.logger.debug(`STK Push payload: ${JSON.stringify({ ...payload, api_key: '***', email: '***' })}`);

      const response = await axios.post<STKPushResponse>(
        `${this.baseUrl}/initiatestk`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.success === '200') {
        this.logger.log(
          `STK Push initiated successfully: ${response.data.transaction_request_id}`,
        );
        return response.data;
      }

      throw new HttpException(
        'Failed to initiate STK Push',
        HttpStatus.BAD_REQUEST,
      );
    } catch (error) {
      this.logger.error(`STK Push error: ${error.message}`, error.stack);
      if (error.response) {
        throw new HttpException(
          error.response.data || 'STK Push failed',
          error.response.status || HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'Failed to initiate STK Push',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check transaction status
   */
  async checkTransactionStatus(
    transactionRequestId: string,
  ): Promise<TransactionStatusResponse> {
    try {
      const payload = {
        api_key: this.apiKey,
        email: this.email,
        transaction_request_id: transactionRequestId,
      };

      const response = await axios.post<TransactionStatusResponse>(
        `${this.baseUrl}/transactionstatus`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Transaction status check error: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to check transaction status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Format phone number to 254 format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove any spaces, dashes, or other characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }
    // If doesn't start with 254, add it
    else if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }

    return cleaned;
  }

  /**
   * Validate webhook payload
   */
  validateWebhook(payload: any): payload is WebhookPayload {
    return (
      payload &&
      typeof payload.ResponseCode === 'number' &&
      payload.TransactionID &&
      (typeof payload.TransactionAmount === 'number' || payload.TransactionAmount !== undefined)
    );
  }
}
