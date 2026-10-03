/**
 * Decimal — число с фиксированной точкой поверх bigint.
 *
 * Значение = value / 10^scale.
 *   1258.2  -> { value: 12582n, scale: 1 }
 *   -0.05   -> { value: -5n,    scale: 2 }
 *
 * Функции модуля никогда не изменяют аргументы — всегда возвращают новый объект.
 */

const DECIMAL_PATTERN = /^(-)?(\d*)(?:\.(\d*))?$/;

export function pow10(exponent) {
  return 10n ** BigInt(exponent);
}

export function createDecimal(value, scale = 0) {
  return normalize({ value, scale });
}

export const ZERO = createDecimal(0n);
export const ONE = createDecimal(1n);

/** Убирает лишние нули в дробной части: 1.500 -> 1.5 */
export function normalize({ value, scale }) {
  while (scale > 0 && value % 10n === 0n) {
    value /= 10n;
    scale -= 1;
  }
  return { value, scale };
}

/** "12.50" -> { value: 125n, scale: 1 }. Бросает SyntaxError на невалидной строке. */
export function fromString(input) {
  const match = DECIMAL_PATTERN.exec(input.trim());
  if (!match || (!match[2] && !match[3])) {
    throw new SyntaxError(`Invalid decimal: "${input}"`);
  }
  const [, sign, intPart, fracPart = ''] = match;
  const digits = BigInt((intPart || '0') + fracPart);
  return createDecimal(sign ? -digits : digits, fracPart.length);
}

/**
 * Делит число на части для вывода (разделители тысяч, обрезка дроби).
 * { value: -12582n, scale: 1 } -> { sign: '-', int: '1258', frac: '2' }
 */
export function toParts({ value, scale }) {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(scale + 1, '0');
  const split = digits.length - scale;
  return {
    sign: negative ? '-' : '',
    int: digits.slice(0, split),
    frac: digits.slice(split),
  };
}

/** { value: 12582n, scale: 1 } -> "1258.2" */
export function toString(decimal) {
  const { sign, int, frac } = toParts(decimal);
  return sign + int + (frac ? `.${frac}` : '');
}
