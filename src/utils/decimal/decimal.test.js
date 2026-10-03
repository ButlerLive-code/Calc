import { describe, expect, it } from 'vitest';
import { createDecimal, fromString, toParts, toString, ZERO } from './decimal';

describe('decimal model', () => {
  it('parses strings into bigint + scale', () => {
    expect(fromString('1258.2')).toEqual({ value: 12582n, scale: 1 });
    expect(fromString('-0.05')).toEqual({ value: -5n, scale: 2 });
    expect(fromString('.5')).toEqual({ value: 5n, scale: 1 });
    expect(fromString('7.')).toEqual({ value: 7n, scale: 0 });
  });

  it('normalizes trailing zeros', () => {
    expect(fromString('1.500')).toEqual({ value: 15n, scale: 1 });
    expect(createDecimal(1000n, 3)).toEqual({ value: 1n, scale: 0 });
  });

  it('formats back to a string', () => {
    expect(toString(fromString('1258.2'))).toBe('1258.2');
    expect(toString(fromString('-0.05'))).toBe('-0.05');
    expect(toString(ZERO)).toBe('0');
  });

  it('keeps precision beyond Number limits', () => {
    const big = '123456789012345678901234567890.000000000000000000001';
    expect(toString(fromString(big))).toBe(big);
  });

  it('rejects invalid input', () => {
    expect(() => fromString('')).toThrow(SyntaxError);
    expect(() => fromString('1.2.3')).toThrow(SyntaxError);
    expect(() => fromString('abc')).toThrow(SyntaxError);
  });
});

describe('toParts', () => {
  it('splits into sign, integer and fraction strings', () => {
    expect(toParts(fromString('1258.2'))).toEqual({ sign: '', int: '1258', frac: '2' });
    expect(toParts(fromString('-1258.2'))).toEqual({ sign: '-', int: '1258', frac: '2' });
  });

  it('keeps leading zeros of the fraction', () => {
    expect(toParts(fromString('1.05'))).toEqual({ sign: '', int: '1', frac: '05' });
    expect(toParts(fromString('-0.005'))).toEqual({ sign: '-', int: '0', frac: '005' });
  });

  it('returns an empty fraction for integers', () => {
    expect(toParts(fromString('42'))).toEqual({ sign: '', int: '42', frac: '' });
    expect(toParts(ZERO)).toEqual({ sign: '', int: '0', frac: '' });
  });
});
