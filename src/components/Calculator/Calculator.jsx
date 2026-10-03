import '@fontsource/work-sans/300.css';
import '@fontsource/work-sans/400.css';
import { useCallback, useState } from 'react';
import { useCalculatorDispatch, useCalculatorState } from '../../hooks/useCalculator';
import { useRecordEvaluation } from '../../hooks/useHistory';
import { MODE } from '../../utils/calculator/model';
import { Display } from '../Display/Display';
import { HistoryPanel } from '../HistoryPanel/HistoryPanel';
import { Keypad } from '../Keypad/Keypad';
import { ScientificKeypad } from '../ScientificKeypad/ScientificKeypad';
import { Toolbar } from '../Toolbar/Toolbar';
import styles from './Calculator.module.css';
import { useKeyboardInput } from './useKeyboardInput';

export function Calculator() {
  const { mode, evaluation } = useCalculatorState();
  const dispatch = useCalculatorDispatch();
  const [isHistoryOpen, setHistoryOpen] = useState(false);
  const isScientific = mode === MODE.SCIENTIFIC;

  useRecordEvaluation(evaluation);
  useKeyboardInput(dispatch, mode);

  const openHistory = useCallback(() => setHistoryOpen(true), []);
  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  return (
    <main className={isScientific ? `${styles.calculator} ${styles.scientific}` : styles.calculator}>
      <h1 className={styles.visuallyHidden}>Калькулятор</h1>
      <Toolbar mode={mode} onOpenHistory={openHistory} />
      <Display />
      <div className={styles.keypads}>
        {isScientific && <ScientificKeypad />}
        <Keypad />
      </div>
      {isHistoryOpen && <HistoryPanel onClose={closeHistory} />}
    </main>
  );
}
