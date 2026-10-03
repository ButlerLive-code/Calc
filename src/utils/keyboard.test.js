import { describe, expect, it } from 'vitest';
import { ACTION, MODE, OPERATOR, POSTFIX } from './calculator/model';
import { keyToAction } from './keyboard';

const basic = (key, modifiers = {}) => keyToAction({ key, ...modifiers }, MODE.BASIC);
const scientific = (key) => keyToAction({ key }, MODE.SCIENTIFIC);

describe('keyToAction', () => {
  it('maps digits', () => {
    expect(basic('7')).toEqual({ type: ACTION.INPUT_DIGIT, digit: 7 });
    expect(basic('0')).toEqual({ type: ACTION.INPUT_DIGIT, digit: 0 });
  });

  it('maps operators to calculator symbols', () => {
    expect(basic('-')).toEqual({ type: ACTION.INPUT_OPERATOR, operator: OPERATOR.SUBTRACT });
    expect(basic('*')).toEqual({ type: ACTION.INPUT_OPERATOR, operator: OPERATOR.MULTIPLY });
    expect(basic('x')).toEqual({ type: ACTION.INPUT_OPERATOR, operator: OPERATOR.MULTIPLY });
    expect(basic('/')).toEqual({ type: ACTION.INPUT_OPERATOR, operator: OPERATOR.DIVIDE });
  });

  it('maps service keys', () => {
    expect(basic('Enter').type).toBe(ACTION.EVALUATE);
    expect(basic('=').type).toBe(ACTION.EVALUATE);
    expect(basic('Backspace').type).toBe(ACTION.BACKSPACE);
    expect(basic('Escape').type).toBe(ACTION.CLEAR);
    expect(basic(',').type).toBe(ACTION.INPUT_DOT);
    expect(basic('%').type).toBe(ACTION.PERCENT);
  });

  it('enables scientific keys only in scientific mode', () => {
    expect(basic('(')).toBeNull();
    expect(basic('^')).toBeNull();
    expect(scientific('(').type).toBe(ACTION.OPEN_PAREN);
    expect(scientific('^')).toEqual({ type: ACTION.INPUT_OPERATOR, operator: OPERATOR.POWER });
    expect(scientific('!')).toEqual({ type: ACTION.INPUT_POSTFIX, operator: POSTFIX.FACTORIAL });
  });

  it('ignores shortcuts with modifiers and unknown keys', () => {
    expect(basic('c', { metaKey: true })).toBeNull();
    expect(basic('1', { ctrlKey: true })).toBeNull();
    expect(basic('a')).toBeNull();
    expect(basic('Tab')).toBeNull();
  });
});
