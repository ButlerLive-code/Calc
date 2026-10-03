import { describe, expect, it } from 'vitest';
import { fromString } from './decimal';
import { OPERATOR, TOKEN } from './calculator/model';
import { createEntry, createId, HISTORY_LIMIT, prependEntry, sanitizeHistory } from './history';

const entry = (id, result = '1') => ({ id, expression: '1+1', result, timestamp: 1 });

describe('sanitizeHistory', () => {
  it('возвращает [] для не-массивов', () => {
    for (const raw of [null, undefined, 42, 'x', {}, { 0: entry('a') }]) {
      expect(sanitizeHistory(raw)).toEqual([]);
    }
  });

  it('отбрасывает битые записи, оставляя корректные', () => {
    const good = entry('a', '-1258.2');
    const raw = [
      null,
      'str',
      good,
      { ...entry('b'), id: 1 },
      { ...entry('c'), expression: null },
      { ...entry('d'), result: 12 },
      { ...entry('e'), result: 'abc' },
      { ...entry('f'), timestamp: '1' },
      { ...entry('g'), timestamp: Number.NaN },
      { id: 'h' },
      entry('a'), // дубль id
    ];
    expect(sanitizeHistory(raw)).toEqual([good]);
  });

  it('убирает лишние поля и обрезает до HISTORY_LIMIT', () => {
    const raw = Array.from({ length: HISTORY_LIMIT + 5 }, (_, i) => ({ ...entry(`id${i}`), extra: true }));
    const result = sanitizeHistory(raw);
    expect(result).toHaveLength(HISTORY_LIMIT);
    expect(result[0]).toEqual(entry('id0'));
  });
});

describe('createEntry', () => {
  it('форматирует выражение и хранит результат строкой без группировки', () => {
    const evaluation = {
      id: 1,
      tokens: [
        { type: TOKEN.NUMBER, value: fromString('6291') },
        { type: TOKEN.OPERATOR, value: OPERATOR.DIVIDE },
        { type: TOKEN.NUMBER, value: fromString('5') },
      ],
      result: fromString('1258.2'),
    };
    expect(createEntry(evaluation, 123, 'x')).toEqual({
      id: 'x',
      expression: '6,291÷5',
      result: '1258.2',
      timestamp: 123,
    });
  });
});

describe('prependEntry', () => {
  it('добавляет в начало и держит лимит', () => {
    const full = Array.from({ length: HISTORY_LIMIT }, (_, i) => entry(`id${i}`));
    const next = prependEntry(full, entry('new'));
    expect(next).toHaveLength(HISTORY_LIMIT);
    expect(next[0].id).toBe('new');
    expect(next.at(-1).id).toBe(`id${HISTORY_LIMIT - 2}`);
  });
});

describe('createId', () => {
  it('выдаёт уникальные строки', () => {
    const ids = new Set(Array.from({ length: 100 }, createId));
    expect(ids.size).toBe(100);
  });
});
