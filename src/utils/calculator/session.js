import { fromString, MAX_INTEGER_DIGITS, MAX_SCALE, toString } from '../decimal';
import { CONSTANT, ERROR_CODE, FUNCTION, OPERATOR, POSTFIX, STATUS, TOKEN, ZERO_INPUT } from './model';

/**
 * Сохранение текущего выражения между перезагрузками страницы.
 * bigint не сериализуется в JSON, поэтому числа пишутся строками:
 * Decimal -> "1258.2", InputNumber.digits -> "150".
 * Чтение строго проверяет данные: при любой ошибке возвращается null (начинаем с нуля).
 */

export const SESSION_STORAGE_KEY = 'calc:session';
const VERSION = 1;
/**
 * В поле ввода попадает не только набранное с клавиатуры (до 16 цифр), но и результаты
 * (±, %, подстановка из истории) — поэтому пределы как у ядра чисел, а не как у клавиатуры.
 */
const MAX_INPUT_DIGITS_STORED = MAX_INTEGER_DIGITS + MAX_SCALE;
const DIGITS_PATTERN = new RegExp(`^\\d{1,${MAX_INPUT_DIGITS_STORED}}$`);

const VALUES_BY_TOKEN = {
  [TOKEN.OPERATOR]: Object.values(OPERATOR),
  [TOKEN.FUNCTION]: Object.values(FUNCTION),
  [TOKEN.CONSTANT]: Object.values(CONSTANT),
  [TOKEN.POSTFIX]: Object.values(POSTFIX),
};

// ---------- запись ----------

function serializeToken(token) {
  if (token.type === TOKEN.NUMBER) return { type: token.type, value: toString(token.value) };
  return token.value === undefined ? { type: token.type } : { type: token.type, value: token.value };
}

function serializeInput(input) {
  return input && { digits: input.digits.toString(), scale: input.scale, hasDot: input.hasDot, negative: input.negative };
}

/** Состояние калькулятора -> объект, пригодный для JSON. Настройки (режим, углы) хранятся отдельно. */
export function serializeSession(state) {
  return {
    v: VERSION,
    tokens: state.tokens.map(serializeToken),
    input: serializeInput(state.input),
    status: state.status,
    evaluation: state.evaluation && {
      id: state.evaluation.id,
      tokens: state.evaluation.tokens.map(serializeToken),
      result: toString(state.evaluation.result),
    },
    lastOperation: state.lastOperation && {
      operator: state.lastOperation.operator,
      operand: toString(state.lastOperation.operand),
    },
    errorCode: state.errorCode,
  };
}

// ---------- чтение ----------

class InvalidSession extends Error {}

function check(condition) {
  if (!condition) throw new InvalidSession();
}

function parseDecimal(value) {
  check(typeof value === 'string');
  return fromString(value); // SyntaxError на мусоре
}

function parseToken(raw) {
  check(raw !== null && typeof raw === 'object');
  switch (raw.type) {
    case TOKEN.NUMBER:
      return { type: TOKEN.NUMBER, value: parseDecimal(raw.value) };
    case TOKEN.LPAREN:
    case TOKEN.RPAREN:
      return { type: raw.type };
    default:
      check(VALUES_BY_TOKEN[raw.type]?.includes(raw.value));
      return { type: raw.type, value: raw.value };
  }
}

function parseTokens(raw) {
  check(Array.isArray(raw));
  return raw.map(parseToken);
}

function parseInput(raw) {
  if (raw === null) return null;
  check(typeof raw === 'object');
  const { digits, scale, hasDot, negative } = raw;
  check(typeof digits === 'string' && DIGITS_PATTERN.test(digits));
  check(Number.isInteger(scale) && scale >= 0 && scale <= MAX_SCALE);
  check(typeof hasDot === 'boolean' && typeof negative === 'boolean');
  check(hasDot || scale === 0);
  return { digits: BigInt(digits), scale, hasDot, negative };
}

function parseEvaluation(raw) {
  if (raw === null) return null;
  check(typeof raw === 'object' && Number.isInteger(raw.id) && raw.id > 0);
  return { id: raw.id, tokens: parseTokens(raw.tokens), result: parseDecimal(raw.result) };
}

function parseLastOperation(raw) {
  if (raw === null) return null;
  check(typeof raw === 'object' && Object.values(OPERATOR).includes(raw.operator));
  return { operator: raw.operator, operand: parseDecimal(raw.operand) };
}

/**
 * Объект из хранилища -> часть состояния калькулятора, или null, если данные не годятся.
 * @returns {Partial<import('./model').CalculatorState> | null}
 */
export function deserializeSession(raw) {
  try {
    check(raw !== null && typeof raw === 'object' && raw.v === VERSION);
    check(Object.values(STATUS).includes(raw.status));
    check(raw.errorCode === null || Object.values(ERROR_CODE).includes(raw.errorCode));

    const session = {
      tokens: parseTokens(raw.tokens),
      input: parseInput(raw.input),
      status: raw.status,
      evaluation: parseEvaluation(raw.evaluation),
      lastOperation: parseLastOperation(raw.lastOperation),
      errorCode: raw.errorCode,
    };

    check(session.status !== STATUS.RESULT || session.evaluation !== null);
    check(session.status !== STATUS.ERROR || session.errorCode !== null);
    if (session.status === STATUS.EDITING && session.tokens.length === 0 && session.input === null) {
      session.input = ZERO_INPUT;
    }
    return session;
  } catch (error) {
    if (error instanceof InvalidSession || error instanceof SyntaxError || error instanceof TypeError) return null;
    throw error;
  }
}
