export const PLATFORM_FEE_PERCENT_KEY = 'platform_fee_percent';
export const SETTLEMENT_PERIOD_HOURS_KEY = 'settlement_period_hours';
export const MIN_WITHDRAWAL_KES_KEY = 'min_withdrawal_kes';
export const WITHDRAWAL_FEE_KES_KEY = 'withdrawal_fee_kes';

export const DEFAULT_PLATFORM_FEE_PERCENT = '5';
export const DEFAULT_SETTLEMENT_PERIOD_HOURS = '24';
export const DEFAULT_MIN_WITHDRAWAL_KES = '500';
export const DEFAULT_WITHDRAWAL_FEE_KES = '0';

export type FinanceConfig = {
  platformFeePercent: string;
  feePercentHundredths: bigint;
  settlementPeriodHours: number;
  minWithdrawalCents: bigint;
  withdrawalFeeCents: bigint;
};
