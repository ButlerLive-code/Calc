import { createDecimal, pow10 } from './decimal';
import { DECIMAL_ERROR, DecimalError } from './errors';

/** Значащих цифр в дробных результатах (как у decimal128). */
export const PRECISION = 34;
/** Целые части длиннее — OVERFLOW (защита от зависания на огромных bigint). */
export const MAX_INTEGER_DIGITS = 1000;
/** Числа меньше 10^-MAX_SCALE округляются до нуля. */
export const MAX_SCALE = 1000;

/** Количество цифр в |value|: 0n -> 1, -123n -> 3 */
export function digitCount(value) {
  return (value < 0n ? -value : value).toString().length;
}

/** Приводит два числа к общему scale: 1.5 и 2.25 -> [150n, 225n, 2] */
function align(a, b) {
  const scale = Math.max(a.scale, b.scale);
  return [a.value * pow10(scale - a.scale), b.value * pow10(scale - b.scale), scale];
}

/** Целочисленное деление с округлением половины от нуля: 5/2 -> 3, -5/2 -> -3 */
function divideRounded(numerator, denominator) {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const absRemainder = remainder < 0n ? -remainder : remainder;
  const absDenominator = denominator < 0n ? -denominator : denominator;
  if (absRemainder * 2n < absDenominator) {
    return quotient;
  }
  return (numerator < 0n) === (denominator < 0n) ? quotient + 1n : quotient - 1n;
}

/**
 * Применяет ограничения точности к результату операции:
 * - целая часть длиннее MAX_INTEGER_DIGITS -> OVERFLOW;
 * - дробная часть обрезается так, чтобы всего было не больше PRECISION значащих цифр
 *   (целые числа не округляются — bigint хранит их точно);
 * - scale не больше MAX_SCALE.
 */
export function fit(a) {
  if (digitCount(a.value) - a.scale > MAX_INTEGER_DIGITS) {
    throw new DecimalError(DECIMAL_ERROR.OVERFLOW);
  }
  const excess = Math.min(a.scale, digitCount(a.value) - PRECISION);
  const scale = Math.min(a.scale - Math.max(excess, 0), MAX_SCALE);
  return round(a, scale);
}

/**
 * Округляет до `digits` значащих цифр, в том числе целую часть:
 * для приближённых результатов (exp, дробные степени), где «точные» хвостовые цифры были бы выдумкой.
 * 123456789 при 3 цифрах -> 123000000
 */
export function roundSignificant(a, digits = PRECISION) {
  const excess = digitCount(a.value) - digits;
  if (excess <= 0) return a;
  if (excess <= a.scale) return round(a, a.scale - excess);
  const integer = round(a, 0);
  const factor = pow10(digitCount(integer.value) - digits);
  return createDecimal(divideRounded(integer.value, factor) * factor);
}

export function add(a, b) {
  const [x, y, scale] = align(a, b);
  return fit(createDecimal(x + y, scale));
}

export function subtract(a, b) {
  const [x, y, scale] = align(a, b);
  return fit(createDecimal(x - y, scale));
}

export function multiply(a, b) {
  return fit(createDecimal(a.value * b.value, a.scale + b.scale));
}

/**
 * a / b с `precision` значащими цифрами (округление половины от нуля, один раз).
 * Бросает DecimalError(DIVISION_BY_ZERO).
 */
export function divide(a, b, precision = PRECISION) {
  if (b.value === 0n) {
    throw new DecimalError(DECIMAL_ERROR.DIVISION_BY_ZERO);
  }
  if (a.value === 0n) {
    return createDecimal(0n);
  }
  // Порядок частного: |a/b| ∈ (10^(m-1), 10^(m+1)), m = intDigits(a) - intDigits(b).
  const magnitude = digitCount(a.value) - a.scale - (digitCount(b.value) - b.scale);
  let scale = Math.min(Math.max(precision - magnitude, 0), MAX_SCALE);

  // (av / 10^as) / (bv / 10^bs) * 10^scale = av * 10^(bs + scale) / (bv * 10^as)
  const numeratorAt = (s) => a.value * pow10(b.scale + s);
  const denominator = b.value * pow10(a.scale);
  if (scale > 0 && digitCount(numeratorAt(scale) / denominator) > precision) {
    scale -= 1;
  }
  return fit(createDecimal(divideRounded(numeratorAt(scale), denominator), scale));
}

export function negate(a) {
  return createDecimal(-a.value, a.scale);
}

export function abs(a) {
  return a.value < 0n ? negate(a) : a;
}

/** x% -> x / 100 */
export function percent(a) {
  return fit(createDecimal(a.value, a.scale + 2));
}

/** Округляет до `places` знаков после запятой (половина — от нуля). */
export function round(a, places) {
  if (!Number.isInteger(places) || places < 0) {
    throw new RangeError(`round: places must be a non-negative integer, got ${places}`);
  }
  if (a.scale <= places) {
    return a;
  }
  return createDecimal(divideRounded(a.value, pow10(a.scale - places)), places);
}

/** -1, 0 или 1 */
export function compare(a, b) {
  const [x, y] = align(a, b);
  if (x === y) return 0;
  return x < y ? -1 : 1;
}

export function isZero(a) {
  return a.value === 0n;
}

export function isNegative(a) {
  return a.value < 0n;
}

export function isInteger(a) {
  return a.scale === 0;
}
