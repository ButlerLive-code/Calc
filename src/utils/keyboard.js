import { ACTION, MODE, OPERATOR, POSTFIX } from './calculator/model';

const OPERATOR_KEYS = {
  '+': OPERATOR.ADD,
  '-': OPERATOR.SUBTRACT,
  '*': OPERATOR.MULTIPLY,
  x: OPERATOR.MULTIPLY,
  '/': OPERATOR.DIVIDE,
};

const SIMPLE_KEYS = {
  '.': { type: ACTION.INPUT_DOT },
  ',': { type: ACTION.INPUT_DOT },
  Enter: { type: ACTION.EVALUATE },
  '=': { type: ACTION.EVALUATE },
  Backspace: { type: ACTION.BACKSPACE },
  Escape: { type: ACTION.CLEAR },
  Delete: { type: ACTION.CLEAR },
  '%': { type: ACTION.PERCENT },
};

/** Клавиши, доступные только в инженерном режиме. */
const SCIENTIFIC_KEYS = {
  '^': { type: ACTION.INPUT_OPERATOR, operator: OPERATOR.POWER },
  '(': { type: ACTION.OPEN_PAREN },
  ')': { type: ACTION.CLOSE_PAREN },
  '!': { type: ACTION.INPUT_POSTFIX, operator: POSTFIX.FACTORIAL },
};

/**
 * Клавиша -> действие калькулятора или null.
 * @param {{ key: string, ctrlKey?: boolean, metaKey?: boolean, altKey?: boolean }} event
 * @param {string} mode MODE.*
 */
export function keyToAction({ key, ctrlKey, metaKey, altKey }, mode) {
  if (ctrlKey || metaKey || altKey) return null;
  if (/^\d$/.test(key)) return { type: ACTION.INPUT_DIGIT, digit: Number(key) };
  if (OPERATOR_KEYS[key]) return { type: ACTION.INPUT_OPERATOR, operator: OPERATOR_KEYS[key] };
  if (SIMPLE_KEYS[key]) return SIMPLE_KEYS[key];
  if (mode === MODE.SCIENTIFIC && SCIENTIFIC_KEYS[key]) return SCIENTIFIC_KEYS[key];
  return null;
}
