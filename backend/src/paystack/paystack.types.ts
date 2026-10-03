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

export interface PaystackChargeData {
  reference?: string;
  status?: string;
  display_text?: string;
  id?: number;
  message?: string;
}

export interface PaystackTransactionData {
  id?: number;
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  gateway_response?: string;
  paid_at?: string | null;
  created_at?: string;
  receipt_number?: string | null;
  authorization?: { authorization_code?: string };
  customer?: { email?: string; phone?: string };
  metadata?: PaystackMetadata;
}

export interface PaystackTransferData {
  amount?: number;
  currency?: string;
  reference?: string;
  status?: string;
  transfer_code?: string;
  reason?: string;
  recipient?: { recipient_code?: string } | number;
}

export interface PaystackMetadata {
  paymentId?: string;
  msisdn?: string;
  [key: string]: unknown;
}

export interface PaystackWebhookBody {
  event?: string;
  data?: PaystackTransactionData & PaystackTransferData;
}

export interface PaystackInitializeResponse {
  authorization_url?: string;
  access_code?: string;
  reference?: string;
}
