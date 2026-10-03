import { useEffect, useRef } from 'react';
import { useCalculatorDispatch } from '../../hooks/useCalculator';
import { useHistory } from '../../hooks/useHistory';
import { ACTION } from '../../utils/calculator/model';
import { formatDecimal } from '../../utils/calculator/display';
import { fromString } from '../../utils/decimal';
import styles from './HistoryPanel.module.css';

const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/** Модальная панель истории вычислений. Монтируется, когда открыта. */
export function HistoryPanel({ onClose }) {
  const { entries, clearHistory } = useHistory();
  const dispatch = useCalculatorDispatch();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Фокус внутрь при открытии, обратно — при закрытии.
  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      // Фокус не уходит из диалога.
      const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    // capture: Escape/Tab не доходят до глобальных обработчиков клавиатуры калькулятора
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  function selectEntry(entry) {
    dispatch({ type: ACTION.LOAD_VALUE, value: fromString(entry.result) });
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="История вычислений"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>История</h2>
          <button
            type="button"
            className={styles.clear}
            onClick={clearHistory}
            disabled={entries.length === 0}
          >
            Очистить
          </button>
          <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {entries.length === 0 ? (
          <p className={styles.empty}>Пока нет вычислений</p>
        ) : (
          <ul className={styles.list}>
            {entries.map((entry) => (
              <li key={entry.id}>
                <button type="button" className={styles.entry} onClick={() => selectEntry(entry)}>
                  <span className={styles.expression}>{entry.expression}</span>
                  <span className={styles.result}>{formatDecimal(fromString(entry.result))}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
