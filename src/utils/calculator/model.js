import { ANGLE_UNIT, DECIMAL_ERROR } from '../decimal';

/**
 * Модель состояния калькулятора.
 *
 * Выражение хранится списком токенов и вычисляется одним движком
 * (utils/expression) в обоих режимах — обычном и инженерном.
 * Все числа — bigint: готовые операнды как Decimal, набираемое число как InputNumber.
 */

export const MODE = Object.freeze({
  BASIC: 'basic',
  SCIENTIFIC: 'scientific',
});

export { ANGLE_UNIT } from '../decimal';

export const STATUS = Object.freeze({
  EDITING: 'editing', // пользователь набирает выражение
  RESULT: 'result', // показан результат после "="
  ERROR: 'error', // вычисление завершилось ошибкой (см. errorCode)
});

/** Коды ошибок в state.errorCode. Текст для пользователя — в компоненте Display. */
export const ERROR_CODE = Object.freeze({
  ...DECIMAL_ERROR,
  SYNTAX: 'SYNTAX',
});

export const TOKEN = Object.freeze({
  NUMBER: 'number', // { type, value: Decimal }
  CONSTANT: 'constant', // { type, value: 'π' | 'e' }
  OPERATOR: 'operator', // { type, value: '+' | '−' | '×' | '÷' | '^' }
  FUNCTION: 'function', // { type, value: 'sin' | ... } — открывает скобку: "sin("
  LPAREN: 'lparen', // { type }
  RPAREN: 'rparen', // { type }
  POSTFIX: 'postfix', // { type, value: '!' | '²' | '⁻¹' }
});

export const OPERATOR = Object.freeze({
  ADD: '+',
  SUBTRACT: '−',
  MULTIPLY: '×',
  DIVIDE: '÷',
  POWER: '^',
});

export const FUNCTION = Object.freeze({
  SIN: 'sin',
  COS: 'cos',
  TAN: 'tan',
  LN: 'ln',
  LOG: 'log',
  SQRT: '√',
});

export const CONSTANT = Object.freeze({
  PI: 'π',
  E: 'e',
});

export const POSTFIX = Object.freeze({
  FACTORIAL: '!',
  SQUARE: '²',
  RECIPROCAL: '⁻¹',
});

export const ACTION = Object.freeze({
  INPUT_DIGIT: 'INPUT_DIGIT', // { digit: 0..9 }
  INPUT_DOT: 'INPUT_DOT',
  INPUT_OPERATOR: 'INPUT_OPERATOR', // { operator }
  INPUT_FUNCTION: 'INPUT_FUNCTION', // { name }
  INPUT_CONSTANT: 'INPUT_CONSTANT', // { name }
  INPUT_POSTFIX: 'INPUT_POSTFIX', // { operator }
  OPEN_PAREN: 'OPEN_PAREN',
  CLOSE_PAREN: 'CLOSE_PAREN',
  EVALUATE: 'EVALUATE',
  CLEAR: 'CLEAR',
  BACKSPACE: 'BACKSPACE',
  TOGGLE_SIGN: 'TOGGLE_SIGN',
  PERCENT: 'PERCENT',
  LOAD_VALUE: 'LOAD_VALUE', // { value: Decimal } — подставить число (из истории)
  SET_MODE: 'SET_MODE', // { mode }
  SET_ANGLE_UNIT: 'SET_ANGLE_UNIT', // { unit }
});

/** Максимум цифр в набираемом числе. */
export const MAX_INPUT_DIGITS = 16;

/**
 * @typedef {{ value: bigint, scale: number }} Decimal
 *
 * Набираемое число. Не нормализуется, чтобы сохранять "1.50" и "12." во время ввода.
 * @typedef {Object} InputNumber
 * @property {bigint} digits     модуль числа без точки: "1.50" -> 150n
 * @property {number} scale      цифр после точки: "1.50" -> 2
 * @property {boolean} hasDot    точка уже введена ("12." -> true при scale 0)
 * @property {boolean} negative  знак (отдельно, чтобы был возможен "-0")
 *
 * @typedef {{ type: string, value?: Decimal | string }} Token
 *
 * @typedef {Object} Evaluation   последнее успешное вычисление
 * @property {number} id          растёт с каждым "=" — по нему история ловит новые результаты
 * @property {Token[]} tokens     вычисленное выражение
 * @property {Decimal} result
 *
 * @typedef {Object} CalculatorState
 * @property {Token[]} tokens               завершённая часть выражения
 * @property {InputNumber | null} input     число в наборе (null — сразу после оператора/скобки)
 * @property {string} status                STATUS.*
 * @property {Evaluation | null} evaluation
 * @property {{ operator: string, operand: Decimal } | null} lastOperation  для повторного "="
 * @property {string | null} errorCode      ERROR_CODE.*
 * @property {string} mode                  MODE.*
 * @property {string} angleUnit             ANGLE_UNIT.*
 */

/** @type {InputNumber} */
export const ZERO_INPUT = Object.freeze({ digits: 0n, scale: 0, hasDot: false, negative: false });

/** @type {CalculatorState} */
export const initialState = Object.freeze({
  tokens: [],
  input: ZERO_INPUT,
  status: STATUS.EDITING,
  evaluation: null,
  lastOperation: null,
  errorCode: null,
  mode: MODE.BASIC,
  angleUnit: ANGLE_UNIT.DEG,
});

/**
 * Запись истории. Числа хранятся строками: bigint не сериализуется в JSON.
 * @typedef {Object} HistoryEntry
 * @property {string} id
 * @property {string} expression  "6,291÷5"
 * @property {string} result      "1258.2" (toString(Decimal) — без форматирования)
 * @property {number} timestamp
 */
