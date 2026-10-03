import { describe, expect, it } from 'vitest';
import { divide, PRECISION } from './arithmetic';
import { createDecimal, fromString, pow10, toString } from './decimal';
import { DECIMAL_ERROR } from './errors';
import { ANGLE_UNIT, cos, E, exp, factorial, ln, log10, PI, power, sin, sqrt, tan } from './math';

/*
 * Эталоны посчитаны в Python: decimal с getcontext().prec = 60 (для приведения
 * больших углов — π на 200 знаков), затем округление до 34 значащих цифр ROUND_HALF_UP.
 */

const d = fromString;
const s = toString;
const { DEG, RAD } = ANGLE_UNIT;

/** "0." + n нулей + цифры: число вида 0.000…digits */
const tiny = (zeros, digits, sign = '') => `${sign}0.${'0'.repeat(zeros)}${digits}`;

function significantDigits({ value }) {
  return (value < 0n ? -value : value).toString().replace(/0+$/, '').length;
}

/** Нецелые результаты — не больше PRECISION значащих цифр; Decimal нормализован. */
function checked(result) {
  if (result.scale > 0) {
    expect(significantDigits(result)).toBeLessThanOrEqual(PRECISION);
    expect(result.value % 10n).not.toBe(0n);
  }
  return result;
}

function expectError(fn, code) {
  let error;
  try {
    fn();
  } catch (caught) {
    error = caught;
  }
  expect(error, `expected DecimalError(${code})`).toBeDefined();
  expect(error.name).toBe('DecimalError');
  expect(error.code).toBe(code);
}

/** Аргументы функций не должны меняться. */
function callFrozen(fn, ...args) {
  const copies = args.map((arg) => (typeof arg === 'object' ? { ...arg } : arg));
  const result = fn(...args);
  args.forEach((arg, i) => expect(arg).toEqual(copies[i]));
  return checked(result);
}

const run = (fn, ...args) => s(callFrozen(fn, ...args));

describe('constants', () => {
  it('PI and E are rounded to 34 significant digits', () => {
    expect(s(checked(PI))).toBe('3.141592653589793238462643383279503');
    expect(s(checked(E))).toBe('2.718281828459045235360287471352662');
  });
});

describe('sqrt', () => {
  it('irrational roots', () => {
    expect(run(sqrt, d('2'))).toBe('1.414213562373095048801688724209698');
    expect(run(sqrt, d('3'))).toBe('1.732050807568877293527446341505872');
    expect(run(sqrt, d('0.0002'))).toBe('0.01414213562373095048801688724209698');
    expect(run(sqrt, d('123456789.123456789'))).toBe('11111.1110661111109694305549817493');
  });

  it('exact roots', () => {
    expect(run(sqrt, d('2.25'))).toBe('1.5');
    expect(run(sqrt, d('0'))).toBe('0');
    expect(run(sqrt, d('1'))).toBe('1');
    expect(run(sqrt, d('144'))).toBe('12');
  });

  it('tiny and huge arguments', () => {
    expect(run(sqrt, createDecimal(1n, 900))).toBe(tiny(449, '1'));
    expect(run(sqrt, createDecimal(pow10(1000)))).toBe(`1${'0'.repeat(500)}`);
    // √(10^1000 − 1) = 10^500 − 5·10^-501: целая часть точна, дробь округляется
    expect(run(sqrt, createDecimal(pow10(1000) - 1n))).toBe(`1${'0'.repeat(500)}`);
  });

  it('negative -> DOMAIN', () => {
    expectError(() => sqrt(d('-1')), DECIMAL_ERROR.DOMAIN);
    expectError(() => sqrt(d('-0.0001')), DECIMAL_ERROR.DOMAIN);
  });
});

describe('ln', () => {
  it('reference values', () => {
    expect(run(ln, d('2'))).toBe('0.6931471805599453094172321214581766');
    expect(run(ln, d('0.5'))).toBe('-0.6931471805599453094172321214581766');
    expect(run(ln, d('10'))).toBe('2.302585092994045684017991454684364');
    expect(run(ln, d('0.001'))).toBe('-6.907755278982137052053974364053093');
    expect(run(ln, d('123.456'))).toBe('4.815884817283263883109232105166526');
  });

  it('ln 1 = 0 and arguments near 1', () => {
    expect(run(ln, d('1'))).toBe('0');
    expect(run(ln, d('1.0000000001'))).toBe('0.00000000009999999999500000000033333333330833');
    // регрессия: раньше считалось в фиксированной точке на 44 знака и теряло относительную точность
    expect(run(ln, d('1.000000000000000000000000000007'))).toBe(
      '0.0000000000000000000000000000069999999999999999999999999999755',
    );
    expect(run(ln, d('0.99999999999999999997'))).toBe('-0.00000000000000000003000000000000000000045');
    expect(run(log10, d('1.000000000000000000000000000007'))).toBe(
      '0.000000000000000000000000000003040061373322762793557902432405595',
    );
    expect(run(log10, d('0.99999999999999999997'))).toBe(
      '-0.00000000000000000001302883445709755482972930008435462',
    );
  });

  it('boundaries of the near-1 branch', () => {
    expect(run(ln, d('1.5'))).toBe('0.4054651081081643819780131154643491');
    expect(run(ln, d('0.6'))).toBe('-0.5108256237659906832055140963036619');
    expect(run(ln, d('1.99'))).toBe('0.6881346387364010273741383824998088');
    expect(run(log10, d('1.5'))).toBe('0.1760912590556812420812890085306223');
    expect(run(log10, d('0.6'))).toBe('-0.2218487496163563674912332020203917');
  });

  it('very large and very small arguments', () => {
    expect(run(ln, createDecimal(pow10(999)))).toBe('2300.28250790105163833397346322968');
    expect(run(ln, createDecimal(1n, 999))).toBe('-2300.28250790105163833397346322968');
  });

  it('0 and negative -> DOMAIN', () => {
    expectError(() => ln(d('0')), DECIMAL_ERROR.DOMAIN);
    expectError(() => ln(d('-1')), DECIMAL_ERROR.DOMAIN);
  });
});

describe('log10', () => {
  it('exact powers of ten', () => {
    expect(run(log10, d('1000'))).toBe('3');
    expect(run(log10, d('1'))).toBe('0');
    expect(run(log10, d('0.01'))).toBe('-2');
    expect(run(log10, createDecimal(1n, 500))).toBe('-500');
    expect(run(log10, createDecimal(pow10(999)))).toBe('999');
  });

  it('reference values', () => {
    expect(run(log10, d('2'))).toBe('0.301029995663981195213738894724493');
    expect(run(log10, d('5'))).toBe('0.698970004336018804786261105275507');
    expect(run(log10, d('7'))).toBe('0.8450980400142568307122162585926362');
    expect(run(log10, d('0.3'))).toBe('-0.5228787452803375627049720967448847');
  });

  it('0 and negative -> DOMAIN', () => {
    expectError(() => log10(d('0')), DECIMAL_ERROR.DOMAIN);
    expectError(() => log10(d('-10')), DECIMAL_ERROR.DOMAIN);
  });
});

describe('exp', () => {
  it('reference values', () => {
    expect(run(exp, d('0'))).toBe('1');
    expect(run(exp, d('1'))).toBe('2.718281828459045235360287471352662');
    expect(run(exp, d('-1'))).toBe('0.3678794411714423215955237701614609');
    expect(run(exp, d('0.5'))).toBe('1.648721270700128146848650787814164');
    expect(run(exp, d('10'))).toBe('22026.46579480671651695790064528424');
    expect(run(exp, d('-10'))).toBe('0.00004539992976248485153559151556055061');
    expect(run(exp, createDecimal(1n, 30))).toBe('1.000000000000000000000000000001');
  });

  it('large positive -> OVERFLOW', () => {
    // e^2303 имеет 1001 цифру в целой части
    expectError(() => exp(d('2303')), DECIMAL_ERROR.OVERFLOW);
    expectError(() => exp(d('1000000')), DECIMAL_ERROR.OVERFLOW);
  });

  it('e^2302 fits: 1000 integer digits, only PRECISION of them significant', () => {
    // Python decimal: 5.570540566930308508854215062204624e+999
    const result = s(exp(d('2302')));
    expect(result).toHaveLength(1000);
    expect(result).toBe('5570540566930308508854215062204624' + '0'.repeat(1000 - 34));
  });

  it('large negative -> 0, near the limit rounds to 10^-1000 grid', () => {
    expect(run(exp, d('-1000000'))).toBe('0');
    expect(run(exp, d('-2400'))).toBe('0');
    // e^-2302 = 1.795…e-1000 -> на шаге 10^-1000 это 2e-1000
    expect(run(exp, d('-2302'))).toBe(tiny(999, '2'));
  });
});

describe('power', () => {
  it('integer exponents are exact', () => {
    expect(run(power, d('2'), d('10'))).toBe('1024');
    expect(run(power, d('-2'), d('3'))).toBe('-8');
    expect(run(power, d('-2'), d('4'))).toBe('16');
    expect(run(power, d('1.5'), d('2'))).toBe('2.25');
    expect(run(power, d('7'), d('0'))).toBe('1');
  });

  it('negative integer exponents', () => {
    expect(run(power, d('2'), d('-3'))).toBe('0.125');
    expect(run(power, d('3'), d('-1'))).toBe('0.3333333333333333333333333333333333');
    expect(run(power, d('-2'), d('-3'))).toBe('-0.125');
    expect(run(power, d('7'), d('-200'))).toBe(tiny(169, '955854957947707407905656148883196'));
  });

  it('fractional exponents', () => {
    expect(run(power, d('2'), d('0.5'))).toBe('1.414213562373095048801688724209698');
    expect(run(power, d('10'), d('0.5'))).toBe('3.162277660168379331998893544432719');
    expect(run(power, d('2.5'), d('1.5'))).toBe('3.952847075210474164998616930540898');
    expect(run(power, d('0'), d('0.5'))).toBe('0');
  });

  it('large exponent via exp·ln', () => {
    expect(run(power, d('1.0000001'), d('1000000'))).toBe('1.105170912549793416638382709346716');
  });

  it('0^0 = 1, 0^n = 0, 0^negative -> DIVISION_BY_ZERO', () => {
    expect(run(power, d('0'), d('0'))).toBe('1');
    expect(run(power, d('0'), d('5'))).toBe('0');
    expectError(() => power(d('0'), d('-1')), DECIMAL_ERROR.DIVISION_BY_ZERO);
    expectError(() => power(d('0'), d('-0.5')), DECIMAL_ERROR.DIVISION_BY_ZERO);
  });

  it('negative base with non-integer exponent -> DOMAIN', () => {
    const third = divide(d('1'), d('3'));
    expectError(() => power(d('-8'), third), DECIMAL_ERROR.DOMAIN);
    expectError(() => power(d('-2'), d('0.5')), DECIMAL_ERROR.DOMAIN);
  });

  it('tiny results', () => {
    expect(run(power, d('0.5'), d('3000'))).toBe(tiny(903, '8128548625557735440471878057468511'));
  });

  it('huge results -> OVERFLOW quickly', () => {
    const start = performance.now();
    expectError(() => power(d('9'), d('531441')), DECIMAL_ERROR.OVERFLOW);
    expectError(() => power(d('10'), d('1000')), DECIMAL_ERROR.OVERFLOW);
    expectError(() => power(d('1.5'), d('6000')), DECIMAL_ERROR.OVERFLOW);
    expectError(() => power(d('-1.5'), d('6001')), DECIMAL_ERROR.OVERFLOW);
    expectError(() => power(d('123456789'), d('1000000000')), DECIMAL_ERROR.OVERFLOW);
    expect(performance.now() - start).toBeLessThan(200);
  });

  it('largest power of ten that fits', () => {
    expect(s(power(d('10'), d('999')))).toBe(`1${'0'.repeat(999)}`);
  });
});

describe('factorial', () => {
  it('small values are exact', () => {
    expect(run(factorial, d('0'))).toBe('1');
    expect(run(factorial, d('1'))).toBe('1');
    expect(run(factorial, d('5'))).toBe('120');
    expect(run(factorial, d('20'))).toBe('2432902008176640000');
    expect(run(factorial, d('25'))).toBe('15511210043330985984000000');
  });

  it('449! has 998 digits, 450! (1001 digits) -> OVERFLOW', () => {
    const result = s(factorial(d('449')));
    expect(result).toHaveLength(998);
    expect(result.startsWith('3851930518028072576321584769121287554839')).toBe(true);
    expectError(() => factorial(d('450')), DECIMAL_ERROR.OVERFLOW);
  });

  it('3001! -> OVERFLOW instantly', () => {
    const start = performance.now();
    expectError(() => factorial(d('3001')), DECIMAL_ERROR.OVERFLOW);
    expectError(() => factorial(createDecimal(pow10(50))), DECIMAL_ERROR.OVERFLOW);
    expect(performance.now() - start).toBeLessThan(50);
  });

  it('non-integer or negative -> DOMAIN', () => {
    expectError(() => factorial(d('2.5')), DECIMAL_ERROR.DOMAIN);
    expectError(() => factorial(d('-1')), DECIMAL_ERROR.DOMAIN);
  });
});

describe('trigonometry in degrees (default)', () => {
  const cases = [
    // угол, sin, cos, tan (null — DOMAIN)
    ['0', '0', '1', '0'],
    ['30', '0.5', '0.8660254037844386467637231707529362', '0.5773502691896257645091487805019575'],
    ['45', '0.707106781186547524400844362104849', '0.707106781186547524400844362104849', '1'],
    ['60', '0.8660254037844386467637231707529362', '0.5', '1.732050807568877293527446341505872'],
    ['90', '1', '0', null],
    ['180', '0', '-1', '0'],
    ['270', '-1', '0', null],
    ['360', '0', '1', '0'],
    ['-30', '-0.5', '0.8660254037844386467637231707529362', '-0.5773502691896257645091487805019575'],
    ['-90', '-1', '0', null],
    ['390', '0.5', '0.8660254037844386467637231707529362', '0.5773502691896257645091487805019575'],
    ['0.5', '0.008726535498373934964888213973584423', '0.9999619230641712887373551648269833', '0.00872686779075878933453619806120191'],
    ['100000000000000000000', '-0.984807753012208059366743024589523', '0.1736481776669303488517166267693148', '-5.671281819617709530994418439863964'],
    ['123456789.987654321', '-0.1734359744057061606661807840185819', '-0.9848451466001867024530673409661744', '0.1761048170917322988052716695023257'],
  ];

  it.each(cases)('%s°', (angle, sinRef, cosRef, tanRef) => {
    expect(run(sin, d(angle))).toBe(sinRef);
    expect(run(cos, d(angle))).toBe(cosRef);
    expect(run(sin, d(angle), DEG)).toBe(sinRef);
    if (tanRef === null) {
      expectError(() => tan(d(angle)), DECIMAL_ERROR.DOMAIN);
    } else {
      expect(run(tan, d(angle))).toBe(tanRef);
    }
  });

  it('small angles keep full precision', () => {
    const ref = '0.0000000000000000000001745329251994329576923690768488613';
    expect(run(sin, createDecimal(1n, 20))).toBe(ref);
    expect(run(tan, createDecimal(1n, 20))).toBe(ref);
    expect(run(cos, createDecimal(1n, 20))).toBe('1');
    expect(run(sin, createDecimal(-1n, 20))).toBe(`-${ref}`);
    // не «прилипает» к нулю, хотя меньше порога snap
    expect(run(sin, createDecimal(1n, 40))).toBe(tiny(41, '1745329251994329576923690768488613'));
    expect(run(sin, d('-0.0000001234'))).toBe('-0.000000002153736296961002696258788043028828');
    expect(run(cos, d('-0.0000001234'))).toBe('0.9999999999999999976807099815763538');
    expect(run(tan, d('-0.0000001234'))).toBe('-0.000000002153736296961002701253927138887188');
  });
});

describe('trigonometry in radians', () => {
  const cases = [
    ['1', '0.841470984807896506652502321630299', '0.5403023058681397174009366074429766', '1.55740772465490223050697480745836'],
    ['-1', '-0.841470984807896506652502321630299', '0.5403023058681397174009366074429766', '-1.55740772465490223050697480745836'],
    ['0.5', '0.4794255386042030002732879352155714', '0.8775825618903727161162815826038297', '0.5463024898437905132551794657802854'],
    ['3', '0.1411200080598672221007448028081103', '-0.9899924966004454572715727947312613', '-0.1425465430742778052956354105339135'],
    ['100', '-0.5063656411097587936565576104597854', '0.8623188722876839341019385139508425', '-0.5872139151569290766778096356445879'],
    ['1000000000000000000000000000000', '-0.09011690191213805803038642895298733', '-0.9959311944053957023942485879970486', '0.09048506806330217256622313805004127'],
  ];

  it.each(cases)('%s rad', (angle, sinRef, cosRef, tanRef) => {
    expect(run(sin, d(angle), RAD)).toBe(sinRef);
    expect(run(cos, d(angle), RAD)).toBe(cosRef);
    expect(run(tan, d(angle), RAD)).toBe(tanRef);
  });

  it('PI fractions: noise of the rounded PI snaps to exact values', () => {
    const sixth = divide(PI, d('6'));
    const half = divide(PI, d('2'));
    expect(run(sin, sixth, RAD)).toBe('0.5');
    expect(run(cos, sixth, RAD)).toBe('0.8660254037844386467637231707529362');
    expect(run(sin, PI, RAD)).toBe('0');
    expect(run(cos, PI, RAD)).toBe('-1');
    expect(run(tan, PI, RAD)).toBe('0');
    expect(run(sin, half, RAD)).toBe('1');
    expect(run(cos, half, RAD)).toBe('0');
    expectError(() => tan(half, RAD), DECIMAL_ERROR.DOMAIN);
  });

  it('small angles', () => {
    expect(run(sin, createDecimal(1n, 20), RAD)).toBe('0.00000000000000000001');
    expect(run(cos, createDecimal(1n, 20), RAD)).toBe('1');
    expect(run(tan, createDecimal(1n, 20), RAD)).toBe('0.00000000000000000001');
    expect(run(sin, createDecimal(1n, 10), RAD)).toBe('0.00000000009999999999999999999983333333333333');
    expect(run(cos, createDecimal(1n, 10), RAD)).toBe('0.999999999999999999995');
    expect(run(tan, createDecimal(1n, 10), RAD)).toBe('0.0000000001000000000000000000003333333333333');
    expect(run(sin, createDecimal(1n, 16), RAD)).toBe('0.00000000000000009999999999999999999999999999999983');
    expect(run(cos, createDecimal(1n, 16), RAD)).toBe('0.999999999999999999999999999999995');
    expect(run(sin, d('-0.000000000001'), RAD)).toBe('-0.0000000000009999999999999999999999998333333333');
    expect(run(tan, d('-0.000000000001'), RAD)).toBe('-0.000000000001000000000000000000000000333333333');
    expect(run(sin, d('0.000001'), RAD)).toBe('0.0000009999999999998333333333333416666667');
    expect(run(cos, d('0.000001'), RAD)).toBe('0.9999999999995000000000000416666667');
    expect(run(tan, d('0.000001'), RAD)).toBe('0.000001000000000000333333333333466666667');
  });

  it('degrees and radians differ', () => {
    expect(run(sin, d('90'), RAD)).toBe('0.8939966636005578905182694984042099');
    expect(run(cos, d('90'), RAD)).toBe('-0.4480736161291701523654773143996395');
  });
});
