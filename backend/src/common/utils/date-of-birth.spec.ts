import {
  DATE_OF_BIRTH_UNDERAGE,
  parseAdultDateOfBirth,
} from './date-of-birth';

describe('parseAdultDateOfBirth', () => {
  const now = new Date(2026, 9, 2);

  it('accepts an 18th birthday on the cutoff day', () => {
    expect(parseAdultDateOfBirth('2008-10-02', now).toISOString()).toBe(
      '2008-10-02T00:00:00.000Z',
    );
  });

  it('rejects the day before turning 18', () => {
    expect(() => parseAdultDateOfBirth('2008-10-03', now)).toThrow(
      DATE_OF_BIRTH_UNDERAGE,
    );
  });

  it('rejects missing and malformed values', () => {
    expect(() => parseAdultDateOfBirth('')).toThrow(/date of birth/i);
    expect(() => parseAdultDateOfBirth('02-10-2000')).toThrow(/YYYY-MM-DD/);
    expect(() => parseAdultDateOfBirth('2000-13-01')).toThrow(/valid/);
  });
});
