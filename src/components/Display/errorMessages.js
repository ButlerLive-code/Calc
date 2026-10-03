import { ERROR_CODE } from '../../utils/calculator/model';

/** Тексты ошибок для пользователя (в state хранится только код). */
export const ERROR_MESSAGE = Object.freeze({
  [ERROR_CODE.DIVISION_BY_ZERO]: 'Деление на ноль',
  [ERROR_CODE.OVERFLOW]: 'Слишком большое число',
  [ERROR_CODE.DOMAIN]: 'Недопустимое значение',
  [ERROR_CODE.SYNTAX]: 'Ошибка в выражении',
});

export const FALLBACK_ERROR = 'Ошибка';
