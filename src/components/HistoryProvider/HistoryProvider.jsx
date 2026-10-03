import { useCallback, useMemo, useRef } from 'react';
import { HistoryContext } from '../../hooks/useHistory';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { createEntry, createId, HISTORY_STORAGE_KEY, prependEntry, sanitizeHistory } from '../../utils/history';

const EMPTY = [];
// Массив принимается всегда: битые записи отфильтровываются ниже, а не обнуляют историю.
const isArray = (value) => Array.isArray(value);

export function HistoryProvider({ children }) {
  const [stored, setStored] = useLocalStorage(HISTORY_STORAGE_KEY, EMPTY, isArray);
  const entries = useMemo(() => sanitizeHistory(stored), [stored]);

  // Защита от повторной записи того же результата, даже если
  // компонент с useRecordEvaluation перемонтировался.
  const lastEvaluation = useRef(null);

  const addEntry = useCallback(
    (evaluation) => {
      if (!evaluation || evaluation === lastEvaluation.current) return;
      lastEvaluation.current = evaluation;
      const entry = createEntry(evaluation, Date.now(), createId());
      setStored((current) => prependEntry(sanitizeHistory(current), entry));
    },
    [setStored],
  );

  const removeEntry = useCallback(
    (id) => setStored((current) => sanitizeHistory(current).filter((entry) => entry.id !== id)),
    [setStored],
  );

  const clearHistory = useCallback(() => setStored(EMPTY), [setStored]);

  const value = useMemo(
    () => ({ entries, addEntry, removeEntry, clearHistory }),
    [entries, addEntry, removeEntry, clearHistory],
  );

  return <HistoryContext value={value}>{children}</HistoryContext>;
}
