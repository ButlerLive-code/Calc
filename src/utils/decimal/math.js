import {
  compare,
  digitCount,
  divide,
  fit,
  isInteger,
  isNegative,
  isZero,
  MAX_INTEGER_DIGITS,
  MAX_SCALE,
  multiply,
  PRECISION,
  roundSignificant,
} from './arithmetic';
import { createDecimal, ONE, pow10, ZERO } from './decimal';
import { DECIMAL_ERROR, DecimalError } from './errors';

/**
 * Трансцендентные функции на bigint.
 *
 * Внутри — числа с фиксированной точкой: bigint X = x * 10^W, где W = PRECISION + GUARD.
 * Ряды считаются на запасной точности, результат округляется до PRECISION через fit().
 */

export const ANGLE_UNIT = Object.freeze({ DEG: 'deg', RAD: 'rad' });

const GUARD = 10;
const W = PRECISION + GUARD;
const UNIT = pow10(W);
/** Порог «машинного нуля» для sin/cos/tan: остаток погрешности округления π. */
const SNAP_THRESHOLD = createDecimal(1n, PRECISION - 2); // 1e-32
/** Выше — xʸ через exp(y·ln x), а не точным возведением в степень. */
const MAX_EXACT_POWER_DIGITS = 5000;
const MAX_FACTORIAL = 3000n;

// ---------- фиксированная точка ----------

function toFixed(x, w = W) {
  return x.scale <= w ? x.value * pow10(w - x.scale) : x.value / pow10(x.scale - w);
}

function fromFixed(value, w = W) {
  return fit(createDecimal(value, w));
}

function mulFixed(a, b, unit = UNIT) {
  return (a * b) / unit;
}

/** Σ z^(2k+1)/(2k+1) — atanh для |z| < 1 */
function atanhFixed(z, unit = UNIT) {
  const z2 = mulFixed(z, z, unit);
  let power = z;
  let sum = 0n;
  for (let k = 1n; power !== 0n; k += 2n) {
    sum += power / k;
    power = mulFixed(power, z2, unit);
  }
  return sum;
}

/** atan(1/n) = Σ (-1)^k / ((2k+1) n^(2k+1)) */
function atanInverseFixed(n, unit) {
  const n2 = n * n;
  let power = unit / n;
  let sum = 0n;
  for (let k = 1n, sign = 1n; power !== 0n; k += 2n, sign = -sign) {
    sum += (sign * power) / k;
    power /= n2;
  }
  return sum;
}

const piCache = new Map();
/** π формулой Мэчина: π = 16·atan(1/5) − 4·atan(1/239) */
function piFixed(w = W) {
  if (!piCache.has(w)) {
    const unit = pow10(w + 5);
    const pi = 16n * atanInverseFixed(5n, unit) - 4n * atanInverseFixed(239n, unit);
    piCache.set(w, pi / 100000n);
  }
  return piCache.get(w);
}

const LN2 = 2n * atanhFixed(UNIT / 3n); // ln 2 = 2·atanh(1/3)
const LN10 = 3n * LN2 + 2n * atanhFixed(UNIT / 9n); // ln 10 = 3·ln 2 + ln 1.25

/** ln x для x > 0, результат в фиксированной точке. */
function lnFixed(x) {
  // x = m · 10^k, m ∈ [1, 10)
  const digits = digitCount(x.value);
  const k = BigInt(digits - 1 - x.scale);
  let m = (x.value * UNIT) / pow10(digits - 1);
  // m = r · 2^p, r ∈ [0.75, 1.5] -> |z| ≤ 0.2, ряд сходится быстро
  let p = 0n;
  while (m * 2n > 3n * UNIT) {
    m /= 2n;
    p += 1n;
  }
  const z = ((m - UNIT) * UNIT) / (m + UNIT);
  return k * LN10 + p * LN2 + 2n * atanhFixed(z);
}

/** e^x для x в фиксированной точке; результат — Decimal. */
function expFromFixed(x) {
  if (x > BigInt(MAX_INTEGER_DIGITS + 1) * LN10) {
    throw new DecimalError(DECIMAL_ERROR.OVERFLOW);
  }
  if (x < -BigInt(MAX_SCALE + 1) * LN10) {
    return ZERO;
  }
  // x = n·ln 2 + r, |r| ≤ ln2 / 2
  let n = x / LN2;
  let r = x - n * LN2;
  if (r * 2n > LN2) {
    n += 1n;
    r -= LN2;
  } else if (r * 2n < -LN2) {
    n -= 1n;
    r += LN2;
  }
  let term = UNIT;
  let sum = UNIT;
  for (let k = 1n; term !== 0n; k += 1n) {
    term = mulFixed(term, r) / k;
    sum += term;
  }
  const mantissa = createDecimal(sum, W);
  const twoPower = createDecimal(2n ** (n < 0n ? -n : n));
  // Результат приближённый: целую часть тоже округляем до PRECISION значащих цифр
  return roundSignificant(n >= 0n ? multiply(mantissa, twoPower) : divide(mantissa, twoPower));
}

// ---------- константы ----------

export const PI = fromFixed(piFixed());
export const E = expFromFixed(UNIT);

// ---------- степени и корни ----------

/** Целочисленный квадратный корень (метод Ньютона). */
function isqrt(n) {
  if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  for (;;) {
    const next = (x + n / x) >> 1n;
    if (next >= x) return x;
    x = next;
  }
}

export function sqrt(x) {
  if (isNegative(x)) throw new DecimalError(DECIMAL_ERROR.DOMAIN);
  if (isZero(x)) return ZERO;
  // sqrt(v / 10^s) · 10^r = sqrt(v · 10^(2r − s))
  const r = Math.ceil(x.scale / 2) + PRECISION + 2;
  return fit(createDecimal(isqrt(x.value * pow10(2 * r - x.scale)), r));
}

export function exp(x) {
  return expFromFixed(toFixed(x));
}

/**
 * ln x при x ∈ (0.5, 2): 2·atanh((x−1)/(x+1)) без вычитания констант и с запасом
 * знаков под малый результат — иначе у ln(1 + 1e-30) теряется относительная точность.
 * Возвращает { value, w } — фиксированную точку ширины w.
 */
function lnNearOneFixed(x) {
  const one = pow10(x.scale);
  const diff = x.value - one;
  const w = W + Math.max(digitCount(one) - digitCount(diff), 0);
  const unit = pow10(w);
  return { value: 2n * atanhFixed((diff * unit) / (x.value + one), unit), w };
}

function isNearOne(x) {
  const one = pow10(x.scale);
  return 2n * x.value > one && x.value < 2n * one;
}

export function ln(x) {
  if (isNegative(x) || isZero(x)) throw new DecimalError(DECIMAL_ERROR.DOMAIN);
  if (isNearOne(x)) {
    const { value, w } = lnNearOneFixed(x);
    return fromFixed(value, w);
  }
  return fromFixed(lnFixed(x));
}

export function log10(x) {
  if (isNegative(x) || isZero(x)) throw new DecimalError(DECIMAL_ERROR.DOMAIN);
  // Точные степени десяти: log(1000) = 3, log(0.01) = −2
  if (/^10*$/.test(x.value.toString())) {
    return createDecimal(BigInt(digitCount(x.value) - 1 - x.scale));
  }
  if (isNearOne(x)) {
    const { value, w } = lnNearOneFixed(x);
    return fromFixed((value * UNIT) / LN10, w);
  }
  return fromFixed((lnFixed(x) * UNIT) / LN10);
}

export function power(base, exponent) {
  if (isInteger(exponent)) {
    const n = exponent.value;
    if (n === 0n) return ONE;
    if (isZero(base)) {
      if (n < 0n) throw new DecimalError(DECIMAL_ERROR.DIVISION_BY_ZERO);
      return ZERO;
    }
    const absN = n < 0n ? -n : n;
    const integerDigits = digitCount(base.value) - base.scale;
    // |base| ≥ 10 и огромный показатель — переполнение без вычисления
    if (n > 0n && integerDigits > 1 && BigInt(integerDigits - 1) * absN > BigInt(MAX_INTEGER_DIGITS)) {
      throw new DecimalError(DECIMAL_ERROR.OVERFLOW);
    }
    if (BigInt(digitCount(base.value)) * absN <= BigInt(MAX_EXACT_POWER_DIGITS)) {
      const exact = fit(createDecimal(base.value ** absN, base.scale * Number(absN)));
      return n > 0n ? exact : divide(ONE, exact);
    }
    const magnitude = expFromFixed(mulFixed(lnFixed(absDecimal(base)), toFixed(exponent)));
    return isNegative(base) && absN % 2n === 1n ? createDecimal(-magnitude.value, magnitude.scale) : magnitude;
  }

  if (isNegative(base)) throw new DecimalError(DECIMAL_ERROR.DOMAIN);
  if (isZero(base)) {
    if (isNegative(exponent)) throw new DecimalError(DECIMAL_ERROR.DIVISION_BY_ZERO);
    return ZERO;
  }
  return expFromFixed(mulFixed(lnFixed(base), toFixed(exponent)));
}

function absDecimal(x) {
  return x.value < 0n ? createDecimal(-x.value, x.scale) : x;
}

export function factorial(x) {
  if (!isInteger(x) || isNegative(x)) throw new DecimalError(DECIMAL_ERROR.DOMAIN);
  if (x.value > MAX_FACTORIAL) throw new DecimalError(DECIMAL_ERROR.OVERFLOW);
  let result = 1n;
  for (let i = 2n; i <= x.value; i += 1n) result *= i;
  return fit(createDecimal(result));
}

// ---------- тригонометрия ----------

/** Остаток от деления угла в градусах на 360, точно: результат в [0, 360). */
function reduceDegrees(x) {
  const full = 360n * pow10(x.scale);
  let value = x.value % full;
  if (value < 0n) value += full;
  return createDecimal(value, x.scale);
}

/** Для углов, кратных 90°, — точный номер четверти 0..3, иначе null. */
function quarterTurn(degrees) {
  return degrees.scale === 0 && degrees.value % 90n === 0n ? Number(degrees.value / 90n) : null;
}

/** Угол -> радианы в фиксированной точке ширины w, приведённые к [−π, π]. */
function toReducedRadians(x, unit, w = W) {
  if (unit === ANGLE_UNIT.DEG) {
    const degrees = reduceDegrees(x);
    const pi = piFixed(w);
    let radians = (toFixed(degrees, w) * pi) / (180n * pow10(w));
    if (radians > pi) radians -= 2n * pi;
    return radians;
  }
  // Для больших аргументов π нужна с дополнительными знаками
  const extra = Math.max(digitCount(x.value) - x.scale, 0);
  const twoPi = 2n * piFixed(w + extra);
  let radians = toFixed(x, w + extra) % twoPi;
  if (radians > twoPi / 2n) radians -= twoPi;
  if (radians < -twoPi / 2n) radians += twoPi;
  return radians / pow10(extra);
}

function sinCosFixed(radians, unit = UNIT) {
  const r2 = mulFixed(radians, radians, unit);
  let sinTerm = radians;
  let cosTerm = unit;
  let sinSum = radians;
  let cosSum = unit;
  for (let k = 1n; sinTerm !== 0n || cosTerm !== 0n; k += 1n) {
    sinTerm = -mulFixed(sinTerm, r2, unit) / ((2n * k) * (2n * k + 1n));
    cosTerm = -mulFixed(cosTerm, r2, unit) / ((2n * k - 1n) * (2n * k));
    sinSum += sinTerm;
    cosSum += cosTerm;
  }
  return { sin: sinSum, cos: cosSum };
}

/** Убирает «шум» округления π: sin(180°)·rad -> 0, а не 1e-34. */
function snap(value) {
  return compare(absDecimal(value), SNAP_THRESHOLD) < 0 ? ZERO : value;
}

function sinCos(x, unit) {
  if (unit === ANGLE_UNIT.DEG) {
    const quarter = quarterTurn(reduceDegrees(x));
    if (quarter !== null) {
      return {
        sin: createDecimal([0n, 1n, 0n, -1n][quarter]),
        cos: createDecimal([1n, 0n, -1n, 0n][quarter]),
      };
    }
  }
  // |x| < 1: ширина растёт на число нулей после запятой, чтобы малый sin не терял знаки.
  // Шума от π здесь нет, поэтому и snap не нужен.
  const extra = Math.max(x.scale - digitCount(x.value), 0);
  const w = W + (extra > 0 ? extra + 3 : 0);
  const { sin, cos } = sinCosFixed(toReducedRadians(x, unit, w), pow10(w));
  const toDecimal = (value) => (extra > 0 ? fromFixed(value, w) : snap(fromFixed(value, w)));
  // fixed — для tan: делим до округления, иначе ошибка в последнем знаке
  return { sin: toDecimal(sin), cos: toDecimal(cos), fixed: { sin, cos, w } };
}

export function sin(x, unit = ANGLE_UNIT.DEG) {
  if (unit === ANGLE_UNIT.RAD && digitCount(x.value) - x.scale < -17) {
    return x; // sin x ≈ x, погрешность x³/6 за пределами PRECISION
  }
  return sinCos(x, unit).sin;
}

export function cos(x, unit = ANGLE_UNIT.DEG) {
  return sinCos(x, unit).cos;
}

export function tan(x, unit = ANGLE_UNIT.DEG) {
  const { sin: s, cos: c, fixed } = sinCos(x, unit);
  if (isZero(c)) throw new DecimalError(DECIMAL_ERROR.DOMAIN);
  if (!fixed || isZero(s)) return divide(s, c);
  return divide(createDecimal(fixed.sin, fixed.w), createDecimal(fixed.cos, fixed.w));
}

