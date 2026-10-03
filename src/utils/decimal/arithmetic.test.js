import { describe, expect, it } from 'vitest';
import {
  abs,
  add,
  compare,
  divide,
  fit,
  isInteger,
  isNegative,
  MAX_INTEGER_DIGITS,
  MAX_SCALE,
  isZero,
  multiply,
  negate,
  percent,
  PRECISION,
  round,
  roundSignificant,
  subtract,
} from './arithmetic';
import { fromString, toString } from './decimal';
import { DECIMAL_ERROR, DecimalError } from './errors';

const d = fromString;
const s = toString;

describe('add / subtract', () => {
  it('is exact for decimal fractions', () => {
    expect(s(add(d('0.1'), d('0.2')))).toBe('0.3');
    expect(s(subtract(d('0.3'), d('0.1')))).toBe('0.2');
  });

  it('aligns different scales and carries across the point', () => {
    expect(s(add(d('1.5'), d('2.25')))).toBe('3.75');
    expect(s(add(d('1.05'), d('2.97')))).toBe('4.02');
  });

  it('handles signs', () => {
    expect(s(add(d('-1.5'), d('0.5')))).toBe('-1');
    expect(s(subtract(d('1'), d('2.5')))).toBe('-1.5');
  });

  it('works beyond Number.MAX_SAFE_INTEGER', () => {
    expect(s(add(d('9007199254740993'), d('1')))).toBe('9007199254740994');
    expect(s(add(d('99999999999999999999.99'), d('0.01')))).toBe('100000000000000000000');
  });
});

describe('multiply', () => {
  it('adds scales', () => {
    expect(s(multiply(d('1.5'), d('1.5')))).toBe('2.25');
    expect(s(multiply(d('0.1'), d('0.2')))).toBe('0.02');
  });

  it('handles signs and zero', () => {
    expect(s(multiply(d('-2'), d('3.5')))).toBe('-7');
    expect(s(multiply(d('-2'), d('-3')))).toBe('6');
    expect(s(multiply(d('123.45'), d('0')))).toBe('0');
  });
});

describe('divide', () => {
  it('returns exact results without trailing zeros', () => {
    expect(s(divide(d('6291'), d('5')))).toBe('1258.2');
    expect(s(divide(d('1'), d('8')))).toBe('0.125');
    expect(s(divide(d('0.3'), d('0.1')))).toBe('3');
  });

  it('keeps PRECISION significant digits and rounds half away from zero', () => {
    expect(s(divide(d('1'), d('3')))).toBe('0.' + '3'.repeat(PRECISION));
    expect(s(divide(d('2'), d('3')))).toBe('0.' + '6'.repeat(PRECISION - 1) + '7');
    expect(s(divide(d('-2'), d('3')))).toBe('-0.' + '6'.repeat(PRECISION - 1) + '7');
    expect(s(divide(d('2'), d('-3')))).toBe('-0.' + '6'.repeat(PRECISION - 1) + '7');
    expect(s(divide(d('100'), d('3')))).toBe('33.' + '3'.repeat(PRECISION - 2));
  });

  it('does not lose very small or very large quotients', () => {
    const tiny = divide(d('1'), d('3000000000000000000000000'));
    expect(s(tiny)).toBe('0.' + '0'.repeat(24) + '3'.repeat(PRECISION));
    const small = divide(d('0.000000000000000000001'), d('3'));
    expect(s(small)).toBe('0.' + '0'.repeat(21) + '3'.repeat(PRECISION));
    // целая часть длиннее PRECISION — делится нацело с округлением
    expect(s(divide(d('1' + '0'.repeat(40)), d('3')))).toBe('3'.repeat(40));
  });

  it('respects custom precision', () => {
    expect(s(divide(d('1'), d('3'), 2))).toBe('0.33');
    expect(s(divide(d('10'), d('4'), 1))).toBe('3');
  });

  it('rounding up to the next power of ten stays within precision', () => {
    expect(s(divide(d('0.99999'), d('1'), 3))).toBe('1');
    expect(s(divide(d('2'), d('3'), 1))).toBe('0.7');
    expect(s(divide(d('9.99'), d('1.0000001'), 2))).toBe('10');
  });

  it('throws a coded error on division by zero', () => {
    expect(() => divide(d('1'), d('0'))).toThrow(DecimalError);
    expect(() => divide(d('1'), d('0.00'))).toThrow(
      expect.objectContaining({ code: DECIMAL_ERROR.DIVISION_BY_ZERO }),
    );
  });

  it('zero divided by anything is zero', () => {
    expect(s(divide(d('0'), d('7')))).toBe('0');
  });
});

describe('precision limits', () => {
  it('chained operations do not grow the scale without bound', () => {
    const third = divide(d('1'), d('3'));
    const ninth = multiply(third, third);
    expect(ninth.scale).toBe(PRECISION);
    expect(s(ninth)).toBe('0.' + '1'.repeat(PRECISION));
  });

  it('integers stay exact even when longer than PRECISION', () => {
    const big = '9'.repeat(60);
    expect(s(add(d(big), d('1')))).toBe('1' + '0'.repeat(60));
    expect(s(multiply(d(big), d(big))).length).toBe(120);
  });

  it('adding a tiny fraction to a huge number keeps PRECISION significant digits', () => {
    // 31 цифра в целой части -> остаётся 3 знака дроби: 0.0015 -> 0.002
    const result = add(d('1' + '0'.repeat(30)), d('0.0015'));
    expect(s(result)).toBe('1' + '0'.repeat(30) + '.002');
  });

  it('throws OVERFLOW when the integer part exceeds MAX_INTEGER_DIGITS', () => {
    const huge = d('1' + '0'.repeat(MAX_INTEGER_DIGITS - 1));
    expect(() => multiply(huge, d('10'))).toThrow(
      expect.objectContaining({ code: DECIMAL_ERROR.OVERFLOW }),
    );
  });

  it('fit rounds tiny values below 10^-MAX_SCALE to zero', () => {
    expect(s(fit(d('0.' + '0'.repeat(MAX_SCALE) + '1')))).toBe('0');
  });
});

describe('unary operations', () => {
  it('negate / abs', () => {
    expect(s(negate(d('1.5')))).toBe('-1.5');
    expect(s(negate(d('-1.5')))).toBe('1.5');
    expect(s(negate(d('0')))).toBe('0');
    expect(s(abs(d('-0.25')))).toBe('0.25');
  });

  it('percent divides by 100', () => {
    expect(s(percent(d('50')))).toBe('0.5');
    expect(s(percent(d('0.5')))).toBe('0.005');
    expect(s(percent(d('-200')))).toBe('-2');
  });

  it('round', () => {
    expect(s(round(d('2.5'), 0))).toBe('3');
    expect(s(round(d('-2.5'), 0))).toBe('-3');
    expect(s(round(d('1.2345'), 2))).toBe('1.23');
    expect(s(round(d('1.235'), 2))).toBe('1.24');
    expect(s(round(d('0.99999999999999999999'), 10))).toBe('1');
    expect(s(round(d('1.5'), 3))).toBe('1.5');
    expect(() => round(d('15'), -1)).toThrow(RangeError);
  });
});

describe('roundSignificant', () => {
  it('rounds the fraction first, then the integer part', () => {
    expect(s(roundSignificant(d('1.23456'), 3))).toBe('1.23');
    expect(s(roundSignificant(d('123456789'), 3))).toBe('123000000');
    expect(s(roundSignificant(d('123556789.5'), 3))).toBe('124000000');
    expect(s(roundSignificant(d('-999.9'), 2))).toBe('-1000');
    expect(s(roundSignificant(d('12'), 3))).toBe('12');
  });
});

describe('comparison', () => {
  it('compare', () => {
    expect(compare(d('1.5'), d('1.50'))).toBe(0);
    expect(compare(d('1.05'), d('1.5'))).toBe(-1);
    expect(compare(d('-1'), d('-2'))).toBe(1);
  });

  it('predicates', () => {
    expect(isZero(d('0.000'))).toBe(true);
    expect(isZero(d('0.001'))).toBe(false);
    expect(isNegative(d('-0.001'))).toBe(true);
    expect(isNegative(d('0'))).toBe(false);
    expect(isInteger(d('3.0'))).toBe(true);
    expect(isInteger(d('3.5'))).toBe(false);
  });
});

it('operations do not mutate their arguments', () => {
  const a = d('1.5');
  const b = d('2');
  add(a, b);
  multiply(a, b);
  divide(a, b);
  negate(a);
  round(a, 0);
  expect(a).toEqual({ value: 15n, scale: 1 });
  expect(b).toEqual({ value: 2n, scale: 0 });
});
