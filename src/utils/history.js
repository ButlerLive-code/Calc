import { fromString, toString } from './decimal';
import { formatTokens } from './calculator/display';

/** Сколько последних вычислений хранить. */
export const HISTORY_LIMIT = 50;

/** Ключ localStorage. */
export const HISTORY_STORAGE_KEY = 'calc:history';

/** @typedef {import('./calculator/model').HistoryEntry} HistoryEntry */

function isParsableDecimal(text) {
  try {
    fromString(text);
    return true;
  } catch {
    return false;
  }
}

/** Проверка одной записи, прочитанной из хранилища. */
export function isValidEntry(entry) {
  return (
    entry !== null &&
    typeof entry === 'object' &&
    typeof entry.id === 'string' &&
    typeof entry.expression === 'string' &&
    typeof entry.result === 'string' &&
    typeof entry.timestamp === 'number' &&
    Number.isFinite(entry.timestamp) &&
    isParsableDecimal(entry.result)
  );
}

/**
 * Очищает данные из хранилища: не массив -> [], битые записи и дубли id отбрасываются,
 * остальные сохраняются (не более HISTORY_LIMIT).
 * @param {unknown} raw
 * @returns {HistoryEntry[]}
 */
export function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const entries = [];
  for (const entry of raw) {
    if (!isValidEntry(entry) || seen.has(entry.id)) continue;
    seen.add(entry.id);
    entries.push({
      id: entry.id,
      expression: entry.expression,
      result: entry.result,
      timestamp: entry.timestamp,
    });
    if (entries.length === HISTORY_LIMIT) break;
  }
  return entries;
}

/**
 * Запись истории из результата "=".
 * @param {import('./calculator/model').Evaluation} evaluation
 * @param {number} now
 * @param {string} id
 * @returns {HistoryEntry}
 */
export function createEntry(evaluation, now, id) {
  return {
    id,
    expression: formatTokens(evaluation.tokens),
    result: toString(evaluation.result),
    timestamp: now,
  };
}

/** Новая запись в начало, хвост обрезается до HISTORY_LIMIT. */
export function prependEntry(entries, entry) {
  return [entry, ...entries].slice(0, HISTORY_LIMIT);
}

let fallbackCounter = 0;

/** Уникальный id записи; crypto.randomUUID есть не везде (например, http без TLS). */
export function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  fallbackCounter += 1;
  return `${Date.now().toString(36)}-${fallbackCounter.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
