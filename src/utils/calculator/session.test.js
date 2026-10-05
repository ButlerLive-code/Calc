import { describe, expect, it } from 'vitest';
import { fromString, MAX_INTEGER_DIGITS, MAX_SCALE } from '../decimal';
import { getDisplay } from './display';
import { ACTION, CONSTANT, FUNCTION, initialState, POSTFIX, STATUS } from './model';
import { calculatorReducer } from './reducer';
import { deserializeSession, serializeSession } from './session';

const digits = (text) => [...text].map((digit) => ({ type: ACTION.INPUT_DIGIT, digit: Number(digit) }));
const op = (operator) => ({ type: ACTION.INPUT_OPERATOR, operator });
const run = (actions) => actions.reduce(calculatorReducer, initialState);

/** Как при перезагрузке: состояние -> JSON-строка -> состояние. */
function reload(state) {
  const restored = deserializeSession(JSON.parse(JSON.stringify(serializeSession(state))));
  return { ...initialState, mode: state.mode, angleUnit: state.angleUnit, ...restored };
}

describe('session round trip', () => {
  it('keeps an unfinished expression and the typed number', () => {
    const state = run([...digits('6291'), op('÷'), ...digits('5'), { type: ACTION.INPUT_DOT }, ...digits('50')]);
    const restored = reload(state);
    expect(getDisplay(restored)).toEqual(getDisplay(state));
    expect(getDisplay(restored).value).toBe('5.50');
  });

  it('keeps a result and repeated "=" still works after reload', () => {
    const state = run([...digits('2'), op('+'), ...digits('3'), { type: ACTION.EVALUATE }]);
    const restored = reload(state);
    expect(restored.status).toBe(STATUS.RESULT);
    expect(getDisplay(restored).value).toBe('5');
    expect(getDisplay(calculatorReducer(restored, { type: ACTION.EVALUATE })).value).toBe('8');
  });

  it('keeps scientific tokens', () => {
    const state = run([
      { type: ACTION.INPUT_FUNCTION, name: FUNCTION.SIN },
      ...digits('30'),
      { type: ACTION.CLOSE_PAREN },
      op('+'),
      { type: ACTION.INPUT_CONSTANT, name: CONSTANT.PI },
      { type: ACTION.INPUT_POSTFIX, operator: POSTFIX.SQUARE },
    ]);
    const restored = reload(state);
    expect(getDisplay(restored).expression).toBe('sin(30)+π²');
    expect(calculatorReducer(restored, { type: ACTION.EVALUATE }).status).toBe(STATUS.RESULT);
  });

  it('keeps the error screen', () => {
    const state = run([...digits('1'), op('÷'), ...digits('0'), { type: ACTION.EVALUATE }]);
    expect(reload(state)).toMatchObject({ status: STATUS.ERROR, errorCode: 'DIVISION_BY_ZERO' });
  });

  it('keeps numbers beyond Number precision exactly', () => {
    const big = fromString('123456789012345678901234567890.123');
    const state = { ...initialState, tokens: [{ type: 'number', value: big }, { type: 'operator', value: '+' }], input: null };
    expect(reload(state).tokens[0].value).toEqual(big);
  });

  // Результаты в поле ввода длиннее того, что можно набрать с клавиатуры (16 цифр)
  it.each([
    ['± on a long result', [...digits('1'), op('÷'), ...digits('3'), { type: ACTION.EVALUATE }, { type: ACTION.TOGGLE_SIGN }], '-0.3333333333333333333333333333333333'],
    ['% on a long result', [...digits('1'), op('÷'), ...digits('7'), { type: ACTION.EVALUATE }, { type: ACTION.PERCENT }], '0.001428571428571428571428571428571429'],
    ['a huge value from history', [{ type: ACTION.LOAD_VALUE, value: fromString('1' + '0'.repeat(50)) }], '100' + ',000'.repeat(16)],
  ])('keeps %s', (_, actions, shown) => {
    const state = run(actions);
    expect(getDisplay(state).value).toBe(shown);
    expect(getDisplay(reload(state)).value).toBe(shown);
  });

  it('keeps "-0" and a trailing dot while typing', () => {
    const state = run([{ type: ACTION.TOGGLE_SIGN }, { type: ACTION.INPUT_DOT }]);
    expect(getDisplay(reload(state)).value).toBe('-0.');
  });
});

describe('deserializeSession rejects bad data', () => {
  const valid = serializeSession(run([...digits('12'), op('+'), ...digits('3')]));

  it.each([
    ['null', null],
    ['not an object', 'hello'],
    ['wrong version', { ...valid, v: 99 }],
    ['unknown status', { ...valid, status: 'weird' }],
    ['tokens not an array', { ...valid, tokens: 'x' }],
    ['bad number in token', { ...valid, tokens: [{ type: 'number', value: '1.2.3' }] }],
    ['unknown operator', { ...valid, tokens: [{ type: 'number', value: '1' }, { type: 'operator', value: '%' }] }],
    ['unknown token type', { ...valid, tokens: [{ type: 'script', value: 'alert' }] }],
    ['digits not a number string', { ...valid, input: { ...valid.input, digits: '12a' } }],
    ['digits longer than any possible number', { ...valid, input: { ...valid.input, digits: '9'.repeat(MAX_INTEGER_DIGITS + MAX_SCALE + 1) } }],
    ['scale beyond MAX_SCALE', { ...valid, input: { ...valid.input, scale: MAX_SCALE + 1, hasDot: true } }],
    ['scale without dot', { ...valid, input: { ...valid.input, scale: 2, hasDot: false } }],
    ['result status without evaluation', { ...valid, status: STATUS.RESULT, evaluation: null }],
    ['error status without code', { ...valid, status: STATUS.ERROR, errorCode: null }],
    ['unknown error code', { ...valid, errorCode: 'BOOM' }],
  ])('%s -> null', (_, raw) => {
    expect(deserializeSession(raw)).toBeNull();
  });

  it('accepts the valid sample', () => {
    expect(deserializeSession(valid)).not.toBeNull();
  });

  it('falls back to "0" when nothing is being typed', () => {
    expect(deserializeSession({ ...valid, tokens: [], input: null }).input).toEqual(initialState.input);
  });
});
