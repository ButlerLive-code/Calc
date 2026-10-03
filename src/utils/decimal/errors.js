export const DECIMAL_ERROR = Object.freeze({
  DIVISION_BY_ZERO: 'DIVISION_BY_ZERO',
  OVERFLOW: 'OVERFLOW',
  DOMAIN: 'DOMAIN', // аргумент вне области определения: √(-1), ln(0), (-1)!
});

/**
 * Ошибка вычисления. Содержит машинный `code`, а не текст для пользователя:
 * текст подставляет UI по коду.
 */
export class DecimalError extends Error {
  constructor(code) {
    super(code);
    this.name = 'DecimalError';
    this.code = code;
  }
}
