import { appendFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { Logger } from '@nestjs/common';

const logger = new Logger('PaystackTestLog');

export type PaystackTestLogRow = {
  stage: string;
  at?: string;
  [key: string]: unknown;
};

function logPath(): string {
  return join(process.cwd(), 'logs', 'paystack-test.jsonl');
}

/** Append one JSON line for Paystack test checkouts (local file + Nest log). */
export function logPaystackTest(row: PaystackTestLogRow): void {
  const line = {
    ...row,
    at: row.at || new Date().toISOString(),
  };
  logger.log(`[Paystack test] ${JSON.stringify(line)}`);
  try {
    const file = logPath();
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, `${JSON.stringify(line)}\n`, 'utf8');
  } catch (err) {
    logger.warn(
      `Could not write Paystack test log file: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
