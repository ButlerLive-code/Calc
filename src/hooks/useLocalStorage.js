import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Чтение/запись localStorage. Хранилище может быть недоступно (приватный режим,
 * запрет cookies) или содержать мусор — тогда используется значение по умолчанию.
 */
export function readStorage(key, fallback, validate = () => true) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // нет места или хранилище запрещено — работаем без сохранения
  }
}

/**
 * useState, синхронизированный с localStorage.
 * @param {string} key
 * @param {*} initialValue  значение (или функция) по умолчанию
 * @param {(value: unknown) => boolean} [validate]  проверка прочитанных данных
 */
export function useLocalStorage(key, initialValue, validate) {
  const [value, setValue] = useState(() =>
    readStorage(key, typeof initialValue === 'function' ? initialValue() : initialValue, validate),
  );
  // Пишем только после явного изменения: значение по умолчанию (например, тема ОС)
  // не должно «застывать» в хранилище при первом открытии.
  const changedRef = useRef(false);

  useEffect(() => {
    if (changedRef.current) writeStorage(key, value);
  }, [key, value]);

  const update = useCallback((next) => {
    changedRef.current = true;
    setValue(next);
  }, []);

  const reset = useCallback(() => {
    update(typeof initialValue === 'function' ? initialValue() : initialValue);
  }, [initialValue, update]);

  return [value, update, reset];
}
