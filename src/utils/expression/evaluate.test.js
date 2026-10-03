import { describe, expect, it } from 'vitest';
import { DECIMAL_ERROR, E, fromString, PI, toString } from '../decimal';
import { ANGLE_UNIT, CONSTANT, FUNCTION, OPERATOR, POSTFIX, TOKEN } from '../calculator/model';
import { endsOperand, evaluate } from './evaluate';

/**
 * Компактная запись выражения -> токены. Токены разделяются пробелами:
 *   "2 + 3 × 4", "sin( 30 ) + cos( 60 )", "( − 3 ) ²", "5 !".
 * Функция пишется с открывающей скобкой ("√(") — как токен FUNCTION в модели.
 */
const OPERATORS = new Set(Object.values(OPERATOR));
const FUNCTIONS = new Set(Object.values(FUNCTION));
const CONSTANTS = new Set(Object.values(CONSTANT));
const POSTFIXES = new Set(Object.values(POSTFIX));

function tokenize(source) {
  if (source.trim() === '') return [];
  return source
    .trim()
    .split(/\s+/)
    .map((part) => {
      if (part === '(') return { type: TOKEN.LPAREN };
      if (part === ')') return { type: TOKEN.RPAREN };
      if (OPERATORS.has(part)) return { type: TOKEN.OPERATOR, value: part };
      if (CONSTANTS.has(part)) return { type: TOKEN.CONSTANT, value: part };
      if (POSTFIXES.has(part)) return { type: TOKEN.POSTFIX, value: part };
      if (part.endsWith('(') && FUNCTIONS.has(part.slice(0, -1))) {
        return { type: TOKEN.FUNCTION, value: part.slice(0, -1) };
      }
      if (/^\d+(\.\d+)?$/.test(part)) return { type: TOKEN.NUMBER, value: fromString(part) };
      throw new Error(`test tokenizer: unknown part "${part}"`);
    });
}

const calc = (source, options) => toString(evaluate(tokenize(source), options));

function expectDecimalError(source, code, options) {
  let error;
  try {
    evaluate(tokenize(source), options);
  } catch (caught) {
    error = caught;
  }
  expect(error, `"${source}" should throw ${code}`).toBeDefined();
  expect(error.name).toBe('DecimalError');
  expect(error.code).toBe(code);
}

describe('arithmetic and precedence', () => {
  it.each([
    ['7', '7'],
    ['2 + 3 × 4', '14'],
    ['2 × 3 + 4', '10'],
    ['( 2 + 3 ) × 4', '20'],
    ['10 − 4 − 3', '3'],
    ['100 ÷ 10 ÷ 5', '2'],
    ['8 ÷ 4 × 2', '4'],
    ['2 + 3 × 4 ^ 2', '50'],
    ['2 ^ 3 ^ 2', '512'],
    ['( 2 ^ 3 ) ^ 2', '64'],
    ['2 ^ 10 − 1', '1023'],
    ['0.1 + 0.2', '0.3'],
    ['1 ÷ 3 × 3', '0.9999999999999999999999999999999999'],
    ['( ( ( 1 + 2 ) ) )', '3'],
    ['( 1 + 2 ) × ( 3 + 4 )', '21'],
  ])('%s = %s', (source, expected) => {
    expect(calc(source)).toBe(expected);
  });
});

describe('unary minus', () => {
  it.each([
    ['− 5', '-5'],
    ['− 2 + 3', '1'],
    ['− 2 × 3', '-6'],
    ['2 × − 3', '-6'],
    ['2 − − 3', '5'],
    ['− − 3', '3'],
    ['− ( 2 + 3 )', '-5'],
    ['( − 2 ) × ( − 3 )', '6'],
    // ^ связывает сильнее унарного минуса
    ['− 2 ^ 2', '-4'],
    ['( − 2 ) ^ 2', '4'],
    ['2 ^ − 2', '0.25'],
    ['2 ^ − 2 ^ 2', '0.0625'],
    ['1 − − 2 ^ 2', '5'],
    ['2 × − 3 ^ 2', '-18'],
  ])('%s = %s', (source, expected) => {
    expect(calc(source)).toBe(expected);
  });
});

describe('postfix operators bind tightest', () => {
  it.each([
    ['5 !', '120'],
    ['3 ²', '9'],
    ['4 ⁻¹', '0.25'],
    ['− 3 ²', '-9'],
    ['( − 3 ) ²', '9'],
    ['− 1 !', '-1'],
    ['2 ^ 3 !', '64'],
    ['2 ^ 3 ²', '512'],
    ['3 ! !', '720'],
    ['4 ² ⁻¹', '0.0625'],
    ['5 ! ÷ 3 !', '20'],
    ['( 2 + 3 ) !', '120'],
    ['2 × 3 ²', '18'],
    ['√( 9 ) !', '6'],
  ])('%s = %s', (source, expected) => {
    expect(calc(source)).toBe(expected);
  });
});

describe('functions', () => {
  it.each([
    ['sin( 30 ) + cos( 60 )', '1'],
    ['√( √( 16 ) )', '2'],
    ['√( 2 ) × √( 2 )', '2'],
    ['√( 3 ² + 4 ² )', '5'],
    ['log( 1000 )', '3'],
    ['log( 10 ^ 5 ) + ln( 1 )', '5'],
    ['log( 0.01 ) × 2', '-4'],
    ['tan( 45 )', '1'],
    ['cos( 180 )', '-1'],
    ['sin( − 30 )', '-0.5'],
    ['− sin( 30 )', '-0.5'],
    ['sin( 30 ) ²', '0.25'],
    ['sin( 15 × 2 )', '0.5'],
    ['sin( 90 ) ^ 2 + cos( 90 ) ^ 2', '1'],
    ['log( √( 100 ) ) + 1', '2'],
    ['ln( 2 )', '0.6931471805599453094172321214581766'],
  ])('%s = %s', (source, expected) => {
    expect(calc(source)).toBe(expected);
  });
});

describe('constants', () => {
  it('π and e evaluate to PI and E', () => {
    expect(evaluate(tokenize('π'))).toEqual(PI);
    expect(evaluate(tokenize('e'))).toEqual(E);
    expect(calc('2 × π')).toBe('6.283185307179586476925286766559006');
    expect(calc('− π')).toBe('-3.141592653589793238462643383279503');
    // E округлена до 34 знаков, поэтому ln(e) = 1 − 1.8e-34 (эталон из Python)
    expect(calc('ln( e )')).toBe('0.9999999999999999999999999999999998');
    expect(calc('π − π')).toBe('0');
  });
});

describe('angle unit option', () => {
  it('defaults to degrees', () => {
    expect(calc('sin( 90 )')).toBe('1');
    expect(calc('sin( 90 )', { angleUnit: ANGLE_UNIT.DEG })).toBe('1');
  });

  it('radians', () => {
    const rad = { angleUnit: ANGLE_UNIT.RAD };
    expect(calc('sin( 90 )', rad)).toBe('0.8939966636005578905182694984042099');
    expect(calc('sin( 30 )', rad)).toBe('-0.9880316240928617899877489072944582');
    expect(calc('sin( π )', rad)).toBe('0');
    expect(calc('cos( π )', rad)).toBe('-1');
    expect(calc('sin( π ÷ 6 )', rad)).toBe('0.5');
    expect(calc('cos( π ÷ 2 )', rad)).toBe('0');
    expectDecimalError('tan( π ÷ 2 )', DECIMAL_ERROR.DOMAIN, rad);
  });

  it('does not affect non-trigonometric functions', () => {
    const rad = { angleUnit: ANGLE_UNIT.RAD };
    expect(calc('√( 16 ) + log( 100 ) + ln( 1 )', rad)).toBe('6');
  });
});

describe('DecimalError propagation', () => {
  it.each([
    ['1 ÷ 0', DECIMAL_ERROR.DIVISION_BY_ZERO],
    ['1 ÷ ( 2 − 2 )', DECIMAL_ERROR.DIVISION_BY_ZERO],
    ['0 ⁻¹', DECIMAL_ERROR.DIVISION_BY_ZERO],
    ['0 ^ − 1', DECIMAL_ERROR.DIVISION_BY_ZERO],
    ['√( − 4 )', DECIMAL_ERROR.DOMAIN],
    ['ln( 0 )', DECIMAL_ERROR.DOMAIN],
    ['log( − 1 )', DECIMAL_ERROR.DOMAIN],
    ['tan( 90 )', DECIMAL_ERROR.DOMAIN],
    ['( − 1 ) !', DECIMAL_ERROR.DOMAIN],
    ['2.5 !', DECIMAL_ERROR.DOMAIN],
    ['( − 8 ) ^ ( 1 ÷ 3 )', DECIMAL_ERROR.DOMAIN],
    ['450 !', DECIMAL_ERROR.OVERFLOW],
    ['10 ^ 1000', DECIMAL_ERROR.OVERFLOW],
    ['9 ^ 9 ^ 9', DECIMAL_ERROR.OVERFLOW],
    ['1 + sin( 30 ) × 2 ÷ 0', DECIMAL_ERROR.DIVISION_BY_ZERO],
  ])('%s -> %s', (source, code) => {
    expectDecimalError(source, code);
  });
});

describe('syntax errors', () => {
  it.each([
    ['empty', ''],
    ['trailing operator', '2 +'],
    ['only operator', '−'],
    ['empty parentheses', '( )'],
    ['empty function call', 'sin( )'],
    ['unclosed parenthesis', '( 2 + 3'],
    ['unclosed function', 'sin( 30'],
    ['extra closing parenthesis', '( 2 ) )'],
    ['closing parenthesis first', ') 2 ('],
    ['two numbers in a row', '2 3'],
    ['two constants in a row', 'π e'],
    ['number after closing parenthesis', '( 2 ) 3'],
    ['implicit multiplication before parenthesis', '2 ( 3 )'],
    ['implicit multiplication before function', '2 sin( 30 )'],
    ['operator after "("', '( × 2 )'],
    ['binary operator at start', '× 2'],
    ['power at start', '^ 2'],
    ['two binary operators', '2 + × 3'],
    ['operator before ")"', '( 2 + ) 3'],
    ['postfix at start', '! 5'],
    ['postfix after operator', '2 + ²'],
    ['postfix after "("', '( ! 2 )'],
  ])('%s: "%s"', (_, source) => {
    expect(() => evaluate(tokenize(source))).toThrow(SyntaxError);
  });

  it('unknown token type', () => {
    expect(() => evaluate([{ type: 'bogus' }])).toThrow(SyntaxError);
  });
});

describe('endsOperand', () => {
  it('true for tokens that close an operand', () => {
    for (const token of tokenize('2 π ) !')) expect(endsOperand(token)).toBe(true);
  });

  it('false for operators, functions, "(" and undefined', () => {
    for (const token of tokenize('+ − × ÷ ^ sin( (')) expect(endsOperand(token)).toBe(false);
    expect(endsOperand(undefined)).toBe(false);
  });
});

describe('purity', () => {
  it('does not mutate tokens', () => {
    const tokens = tokenize('( 2 + 3 ) × − 4 ²');
    const snapshot = structuredClone(tokens);
    expect(calc('( 2 + 3 ) × − 4 ²')).toBe('-80');
    evaluate(tokens);
    expect(tokens).toEqual(snapshot);
  });
});
