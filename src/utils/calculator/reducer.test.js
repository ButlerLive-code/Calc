import { describe, expect, it } from 'vitest';
import { fromString, toString } from '../decimal';
import { getDisplay } from './display';
import { ACTION, ANGLE_UNIT, CONSTANT, ERROR_CODE, FUNCTION, initialState, MODE, POSTFIX, STATUS } from './model';
import { calculatorReducer } from './reducer';

/**
 * Нажатия как на клавиатуре калькулятора:
 * цифры, ".", + - * / ^, "=", "C", "<" (⌫), "±", "%", "(", ")"
 * и объекты-действия для остального.
 */
const KEY_ACTIONS = {
  '.': { type: ACTION.INPUT_DOT },
  '+': { type: ACTION.INPUT_OPERATOR, operator: '+' },
  '-': { type: ACTION.INPUT_OPERATOR, operator: '−' },
  '*': { type: ACTION.INPUT_OPERATOR, operator: '×' },
  '/': { type: ACTION.INPUT_OPERATOR, operator: '÷' },
  '^': { type: ACTION.INPUT_OPERATOR, operator: '^' },
  '=': { type: ACTION.EVALUATE },
  C: { type: ACTION.CLEAR },
  '<': { type: ACTION.BACKSPACE },
  '±': { type: ACTION.TOGGLE_SIGN },
  '%': { type: ACTION.PERCENT },
  '(': { type: ACTION.OPEN_PAREN },
  ')': { type: ACTION.CLOSE_PAREN },
};

function press(keys, state = initialState) {
  const actions = typeof keys === 'string' ? keys.split(' ').filter(Boolean).flatMap(splitKey) : keys;
  return actions.reduce(calculatorReducer, state);
}

function splitKey(key) {
  // "123" -> три цифры; остальные ключи — по таблице
  if (/^\d+$/.test(key)) return [...key].map((digit) => ({ type: ACTION.INPUT_DIGIT, digit: Number(digit) }));
  if (KEY_ACTIONS[key]) return [KEY_ACTIONS[key]];
  throw new Error(`Unknown key ${key}`);
}

const display = (keys, state) => getDisplay(press(keys, state));
const result = (keys, state) => {
  const next = press(keys, state);
  expect(next.status).toBe(STATUS.RESULT);
  return toString(next.evaluation.result);
};

describe('ввод чисел', () => {
  it('начинается с 0 и заменяет ведущий ноль', () => {
    expect(display('').value).toBe('0');
    expect(display('0 0 7').value).toBe('7');
  });

  it('сохраняет точку и хвостовые нули при наборе', () => {
    expect(display('12 .').value).toBe('12.');
    expect(display('1 . 50').value).toBe('1.50');
    expect(display('. 5').value).toBe('0.5');
    expect(display('1 . . 2').value).toBe('1.2');
  });

  it('группирует тысячи', () => {
    expect(display('1234567 . 89').value).toBe('1,234,567.89');
  });

  it('ограничивает длину ввода', () => {
    expect(display('12345678901234567890').value).toBe('1,234,567,890,123,456');
  });
});

describe('арифметика', () => {
  it('считает пример из макета', () => {
    expect(result('6291 / 5 =')).toBe('1258.2');
    expect(display('6291 / 5 =')).toEqual({ expression: '6,291÷5', value: '1,258.2', errorCode: null });
  });

  it('точна для десятичных дробей', () => {
    expect(result('. 1 + . 2 =')).toBe('0.3');
  });

  it('соблюдает приоритет операций', () => {
    expect(result('2 + 3 * 4 =')).toBe('14');
    expect(result('2 * 3 ^ 2 =')).toBe('18');
    expect(result('2 ^ 3 ^ 2 =')).toBe('512');
  });

  it('заменяет оператор при повторном нажатии', () => {
    expect(result('5 + * 2 =')).toBe('10');
  });

  it('использует 0, если начать с оператора', () => {
    expect(result('+ 5 =')).toBe('5');
  });

  it('игнорирует висящий оператор при "="', () => {
    expect(result('5 + =')).toBe('5');
  });

  it('повторяет последнюю операцию при повторном "="', () => {
    expect(result('2 + 3 = =')).toBe('8');
    expect(result('10 / 2 = = =')).toBe('1.25');
  });

  it('продолжает от результата', () => {
    expect(result('2 + 3 = * 2 =')).toBe('10');
  });

  it('начинает новое выражение цифрой после результата', () => {
    expect(result('2 + 3 = 4 + 1 =')).toBe('5');
  });

  it('показывает промежуточный результат после оператора', () => {
    expect(display('6291 /').value).toBe('6,291');
    expect(display('2 + 3 *').value).toBe('5');
  });

  it('округляет показ до DISPLAY_DIGITS, не теряя точности внутри', () => {
    const state = press('1 / 3 =');
    expect(display('', state).value).toBe('0.3333333333333333');
    expect(result('* 3 =', state)).toBe('0.9999999999999999999999999999999999');
    expect(display('1 / 3 = * 3 =').value).toBe('1');
  });

  it('показывает огромные числа в экспоненциальной записи', () => {
    expect(display('10 ^ 50 =').value).toBe('1e+50');
    expect(display('1 / 3 ^ 30 =').value).toBe('4.856935749618861e-15');
  });
});

describe('ошибки', () => {
  it('деление на ноль', () => {
    const state = press('5 / 0 =');
    expect(state.status).toBe(STATUS.ERROR);
    expect(getDisplay(state).errorCode).toBe(ERROR_CODE.DIVISION_BY_ZERO);
  });

  it('после ошибки цифра начинает заново, оператор сбрасывает', () => {
    expect(display('5 / 0 = 7').value).toBe('7');
    expect(press('5 / 0 = +')).toMatchObject({ status: STATUS.EDITING, tokens: [] });
  });
});

describe('служебные кнопки', () => {
  it('C сбрасывает всё, но не режим', () => {
    const state = press([{ type: ACTION.SET_MODE, mode: MODE.SCIENTIFIC }, ...[1, 2].map((digit) => ({ type: ACTION.INPUT_DIGIT, digit }))]);
    const cleared = calculatorReducer(state, { type: ACTION.CLEAR });
    expect(cleared.mode).toBe(MODE.SCIENTIFIC);
    expect(getDisplay(cleared).value).toBe('0');
  });

  it('⌫ стирает цифры, затем оператор и возвращает число в ввод', () => {
    expect(display('12 . 5 <').value).toBe('12.');
    expect(display('12 . 5 < <').value).toBe('12');
    expect(display('7 <').value).toBe('0');
    expect(display('5 + 3 <').expression).toBe('5+');
    expect(display('5 + 3 < <').value).toBe('5');
    expect(result('5 + 3 < < 6 =')).toBe('56');
  });

  it('⌫ после результата очищает', () => {
    expect(display('2 + 3 = <').value).toBe('0');
  });

  it('± меняет знак набираемого числа и результата', () => {
    expect(display('5 ±').value).toBe('-5');
    expect(display('±').value).toBe('-0');
    expect(result('5 ± + 2 =')).toBe('-3');
    expect(display('2 + 3 = ±').value).toBe('-5');
  });

  it('% работает как в iOS', () => {
    expect(display('50 %').value).toBe('0.5');
    expect(result('200 + 10 % =')).toBe('220');
    expect(result('200 - 10 % =')).toBe('180');
    expect(result('200 * 10 % =')).toBe('20');
  });
});

describe('инженерный режим', () => {
  const fn = (name) => ({ type: ACTION.INPUT_FUNCTION, name });
  const constant = (name) => ({ type: ACTION.INPUT_CONSTANT, name });
  const postfix = (operator) => ({ type: ACTION.INPUT_POSTFIX, operator });
  const keys = (sequence) => sequence.flatMap((key) => (typeof key === 'string' ? key.split(' ').flatMap(splitKey) : [key]));

  it('скобки меняют порядок вычисления', () => {
    expect(result('( 2 + 3 ) * 4 =')).toBe('20');
    expect(result('2 * ( 3 + 4 =')).toBe('14'); // незакрытая скобка закрывается сама
  });

  it('неявное умножение: 2π, 3(4)', () => {
    expect(result(keys(['2', constant(CONSTANT.PI), '=']))).toBe('6.283185307179586476925286766559006');
    expect(result('3 ( 4 ) =')).toBe('12');
  });

  it('унарный минус после скобки', () => {
    expect(result('( - 2 ) * 3 =')).toBe('-6');
    expect(display('( - 2').expression).toBe('(-2');
  });

  it('функции и постфиксные операторы', () => {
    expect(result(keys([fn(FUNCTION.SIN), '30 ) =']))).toBe('0.5');
    expect(result(keys([fn(FUNCTION.SQRT), '16 =']))).toBe('4');
    expect(result(keys(['5', postfix(POSTFIX.FACTORIAL), '=']))).toBe('120');
    expect(result(keys(['3', postfix(POSTFIX.SQUARE), '+ 1 =']))).toBe('10');
    expect(result(keys(['4', postfix(POSTFIX.RECIPROCAL), '=']))).toBe('0.25');
    expect(display(keys([fn(FUNCTION.LOG), '100 )'])).expression).toBe('log(100)');
  });

  it('учитывает единицу угла', () => {
    const rad = { type: ACTION.SET_ANGLE_UNIT, unit: ANGLE_UNIT.RAD };
    const state = press(keys([rad, fn(FUNCTION.COS), constant(CONSTANT.PI), '=']));
    expect(toString(state.evaluation.result)).toBe('-1');
  });

  it('ошибки области определения', () => {
    expect(press(keys([fn(FUNCTION.SQRT), '- 4 ='])).errorCode).toBe(ERROR_CODE.DOMAIN);
    expect(press(keys([fn(FUNCTION.TAN), '90 ='])).errorCode).toBe(ERROR_CODE.DOMAIN);
  });

  it('заменяет набранный по умолчанию 0 константой', () => {
    expect(display(keys([constant(CONSTANT.E)])).expression).toBe('e');
  });
});

describe('история', () => {
  it('LOAD_VALUE подставляет число', () => {
    const load = { type: ACTION.LOAD_VALUE, value: fromString('1258.2') };
    expect(getDisplay(press([load])).value).toBe('1,258.2');
    expect(result(['2 +'.split(' ').flatMap(splitKey), load, KEY_ACTIONS['=']].flat())).toBe('1260.2');
  });

  it('id вычисления растёт с каждым "=" и переживает C', () => {
    const state = press('1 + 1 = C 2 + 2 =');
    expect(state.evaluation.id).toBe(2);
  });
});
