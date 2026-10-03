import { useCalculatorState } from '../../hooks/useCalculator';
import { getDisplay } from '../../utils/calculator/display';
import { MODE } from '../../utils/calculator/model';
import { ERROR_MESSAGE, FALLBACK_ERROR } from './errorMessages';
import styles from './Display.module.css';

/** Длина строки для подбора размера шрифта (CSS: --chars). */
const charsStyle = (text) => ({ '--chars': Math.max(text.length, 1) });

export function Display() {
  const state = useCalculatorState();
  const { expression, value, errorCode } = getDisplay(state);
  const text = errorCode ? (ERROR_MESSAGE[errorCode] ?? FALLBACK_ERROR) : value;
  const className = [styles.display, state.mode === MODE.SCIENTIFIC && styles.scientific].filter(Boolean).join(' ');

  return (
    <section className={className} aria-label="Дисплей">
      <div className={styles.expression} style={charsStyle(expression)} data-testid="display-expression">
        {expression}
      </div>
      <div
        className={errorCode ? `${styles.value} ${styles.error}` : styles.value}
        style={charsStyle(text)}
        aria-live="polite"
        aria-atomic="true"
        data-testid="display-value"
      >
        {text}
      </div>
    </section>
  );
}
