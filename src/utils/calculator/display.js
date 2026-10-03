import { createDecimal, digitCount, round, toParts } from '../decimal';
import { endsOperand, evaluate } from '../expression/evaluate';
import { STATUS, TOKEN } from './model';
import { completeTokens } from './reducer';

/** Значащих цифр на экране (внутри считается с PRECISION = 34). */
export const DISPLAY_DIGITS = 16;
/** Меньше этого по модулю — экспоненциальная запись. */
const MIN_PLAIN_EXPONENT = -9;

const GROUP_SEPARATOR = ',';

/** "1234567" -> "1,234,567" */
export function groupThousands(intDigits) {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
}

/** Набираемое число как есть, с разделителями и хвостовыми нулями: "1,234.50" */
export function formatInput(input) {
  const { int, frac } = toParts({ value: input.digits, scale: input.scale });
  return (input.negative ? '-' : '') + groupThousands(int) + (input.hasDot ? `.${frac}` : '');
}

/** Порядок числа: 1258.2 -> 3, 0.05 -> -2 */
function exponentOf(decimal) {
  return digitCount(decimal.value) - 1 - decimal.scale;
}

function formatScientific(decimal) {
  let exponent = exponentOf(decimal);
  // Мантисса в [1, 10): value / 10^(digits - 1)
  let mantissa = round(createDecimal(decimal.value, digitCount(decimal.value) - 1), DISPLAY_DIGITS - 1);
  if (exponentOf(mantissa) > 0) {
    // округление 9.99…9 -> 10
    mantissa = createDecimal(mantissa.value, mantissa.scale + 1);
    exponent += 1;
  }
  const { sign, int, frac } = toParts(mantissa);
  return `${sign}${int}${frac ? `.${frac}` : ''}e${exponent >= 0 ? '+' : ''}${exponent}`;
}

/** Результат для экрана: до DISPLAY_DIGITS значащих цифр, иначе экспонента. */
export function formatDecimal(decimal) {
  if (decimal.value === 0n) return '0';
  const exponent = exponentOf(decimal);
  if (exponent >= DISPLAY_DIGITS || exponent < MIN_PLAIN_EXPONENT) {
    return formatScientific(decimal);
  }
  const rounded = round(decimal, Math.max(DISPLAY_DIGITS - 1 - exponent, 0));
  if (exponentOf(rounded) >= DISPLAY_DIGITS) return formatScientific(rounded);
  const { sign, int, frac } = toParts(rounded);
  return sign + groupThousands(int) + (frac ? `.${frac}` : '');
}

export function formatToken(token, previous) {
  switch (token.type) {
    case TOKEN.NUMBER:
      return formatDecimal(token.value);
    case TOKEN.FUNCTION:
      return `${token.value}(`;
    case TOKEN.LPAREN:
      return '(';
    case TOKEN.RPAREN:
      return ')';
    case TOKEN.OPERATOR:
      // унарный минус пишем как знак числа
      return endsOperand(previous) ? token.value : '-';
    default:
      return token.value;
  }
}

export function formatTokens(tokens) {
  return tokens.map((token, i) => formatToken(token, tokens[i - 1])).join('');
}

/** Промежуточный результат при наборе: "6,291÷" -> "6,291". */
function preview(state) {
  try {
    const tokens = completeTokens(state.tokens);
    return tokens.length > 0 ? formatDecimal(evaluate(tokens, { angleUnit: state.angleUnit })) : '0';
  } catch {
    return '';
  }
}

/**
 * Что показать на дисплее.
 * @returns {{ expression: string, value: string, errorCode: string | null }}
 */
export function getDisplay(state) {
  switch (state.status) {
    case STATUS.RESULT:
      return {
        expression: formatTokens(state.evaluation.tokens),
        value: formatDecimal(state.evaluation.result),
        errorCode: null,
      };
    case STATUS.ERROR:
      return { expression: formatTokens(state.tokens), value: '', errorCode: state.errorCode };
    default: {
      const input = state.input ? formatInput(state.input) : '';
      return {
        expression: state.tokens.length > 0 ? formatTokens(state.tokens) + input : '',
        value: state.input ? input : preview(state),
        errorCode: null,
      };
    }
  }
}
