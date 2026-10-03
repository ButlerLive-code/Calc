import { createContext, useContext, useEffect, useRef } from 'react';

// Провайдер — components/HistoryProvider.
export const HistoryContext = createContext(null);

/** @returns {{ entries: import('../utils/calculator/model').HistoryEntry[], addEntry: Function, removeEntry: Function, clearHistory: Function }} */
export function useHistory() {
  const context = useContext(HistoryContext);
  if (context === null) {
    throw new Error('useHistory must be used inside <HistoryProvider>');
  }
  return context;
}

/**
 * Записывает в историю каждый новый результат "=".
 * Новизна определяется по объекту evaluation: повторные эффекты StrictMode
 * и перерисовки с тем же объектом запись не дублируют.
 * @param {import('../utils/calculator/model').Evaluation | null} evaluation
 */
export function useRecordEvaluation(evaluation) {
  const { addEntry } = useHistory();
  const lastRecorded = useRef(null);

  useEffect(() => {
    if (evaluation === null || evaluation === lastRecorded.current) return;
    lastRecorded.current = evaluation;
    addEntry(evaluation);
  }, [evaluation, addEntry]);
}
