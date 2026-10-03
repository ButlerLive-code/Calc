import { memo } from 'react';
import { useCalculatorDispatch } from '../../hooks/useCalculator';
import { ACTION, MODE } from '../../utils/calculator/model';
import styles from './ModeSwitch.module.css';

const OPTIONS = [
  { mode: MODE.BASIC, label: 'Обычный' },
  { mode: MODE.SCIENTIFIC, label: 'Инженерный' },
];

/** Сегментированный переключатель режима. mode передаётся пропом, чтобы не подписываться на весь state. */
export const ModeSwitch = memo(function ModeSwitch({ mode }) {
  const dispatch = useCalculatorDispatch();

  return (
    <div className={styles.switch} role="group" aria-label="Режим калькулятора">
      {OPTIONS.map((option) => {
        const isActive = option.mode === mode;
        return (
          <button
            key={option.mode}
            type="button"
            className={isActive ? `${styles.option} ${styles.active}` : styles.option}
            aria-pressed={isActive}
            onClick={() => dispatch({ type: ACTION.SET_MODE, mode: option.mode })}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
});
