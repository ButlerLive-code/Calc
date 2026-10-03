import { createDecimal, digitCount } from '../decimal';
import { MAX_INPUT_DIGITS } from './model';

/** Операции над набираемым числом (InputNumber). Все — чистые функции. */

/** Сколько цифр набрано: "0.05" -> 3, "12.5" -> 3 */
export function inputDigitCount(input) {
  return Math.max(digitCount(input.digits), input.scale + 1);
}

export function appendDigit(input, digit) {
  const next = BigInt(digit);
  if (input.digits === 0n && !input.hasDot) {
    return { ...input, digits: next };
  }
  if (inputDigitCount(input) >= MAX_INPUT_DIGITS) {
    return input;
  }
  return {
    ...input,
    digits: input.digits * 10n + next,
    scale: input.hasDot ? input.scale + 1 : input.scale,
  };
}

export function appendDot(input) {
  return input.hasDot ? input : { ...input, hasDot: true };
}

/** Удаляет последний символ. Возвращает null, если число стёрто целиком. */
export function removeLast(input) {
  if (input.scale > 0) {
    return { ...input, digits: input.digits / 10n, scale: input.scale - 1 };
  }
  if (input.hasDot) {
    return { ...input, hasDot: false };
  }
  if (input.digits >= 10n) {
    return { ...input, digits: input.digits / 10n };
  }
  return null;
}

export function toggleSign(input) {
  return { ...input, negative: !input.negative };
}

export function isPristine(input) {
  return input.digits === 0n && !input.hasDot && !input.negative;
}

export function inputToDecimal(input) {
  return createDecimal(input.negative ? -input.digits : input.digits, input.scale);
}

export function decimalToInput(decimal) {
  const negative = decimal.value < 0n;
  return {
    digits: negative ? -decimal.value : decimal.value,
    scale: decimal.scale,
    hasDot: decimal.scale > 0,
    negative,
  };
}
