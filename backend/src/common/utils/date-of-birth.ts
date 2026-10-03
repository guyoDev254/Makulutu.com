export const MIN_ACCOUNT_AGE_YEARS = 18;

export const DATE_OF_BIRTH_REQUIRED = 'Enter your date of birth.';
export const DATE_OF_BIRTH_INVALID =
  'Enter a valid date of birth as YYYY-MM-DD.';
export const DATE_OF_BIRTH_UNDERAGE =
  'You must be 18 or older to register.';

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export class DateOfBirthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DateOfBirthError';
  }
}

function calendarAgeYears(
  birthY: number,
  birthM: number,
  birthD: number,
  now: Date,
): number {
  let age = now.getFullYear() - birthY;
  const month = now.getMonth() + 1;
  const day = now.getDate();
  if (month < birthM || (month === birthM && day < birthD)) {
    age -= 1;
  }
  return age;
}

/** Parse YYYY-MM-DD and require age >= 18 in the local calendar. */
export function parseAdultDateOfBirth(
  raw: string | null | undefined,
  now: Date = new Date(),
): Date {
  const value = String(raw ?? '').trim();
  if (!value) {
    throw new DateOfBirthError(DATE_OF_BIRTH_REQUIRED);
  }
  const match = YMD.exec(value);
  if (!match) {
    throw new DateOfBirthError(DATE_OF_BIRTH_INVALID);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    throw new DateOfBirthError(DATE_OF_BIRTH_INVALID);
  }
  if (utc.getTime() > Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) {
    throw new DateOfBirthError(DATE_OF_BIRTH_INVALID);
  }
  if (year < 1900) {
    throw new DateOfBirthError(DATE_OF_BIRTH_INVALID);
  }
  if (calendarAgeYears(year, month, day, now) < MIN_ACCOUNT_AGE_YEARS) {
    throw new DateOfBirthError(DATE_OF_BIRTH_UNDERAGE);
  }
  return utc;
}

export function isAdultDateOfBirth(
  raw: string | null | undefined,
  now: Date = new Date(),
): boolean {
  try {
    parseAdultDateOfBirth(raw, now);
    return true;
  } catch {
    return false;
  }
}
