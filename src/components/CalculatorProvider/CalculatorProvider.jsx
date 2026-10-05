import { useEffect, useReducer } from 'react';
import { CalculatorDispatchContext, CalculatorStateContext } from '../../hooks/useCalculator';
import { readStorage, writeStorage } from '../../hooks/useLocalStorage';
import { ANGLE_UNIT, initialState, MODE } from '../../utils/calculator/model';
import { calculatorReducer } from '../../utils/calculator/reducer';
import { deserializeSession, serializeSession, SESSION_STORAGE_KEY } from '../../utils/calculator/session';

/** Настройки (режим и единицы углов) — отдельно от выражения: их не сбрасывает "C". */
export const SETTINGS_STORAGE_KEY = 'calc:settings';

const isSettings = (value) =>
  value !== null &&
  typeof value === 'object' &&
  Object.values(MODE).includes(value.mode) &&
  Object.values(ANGLE_UNIT).includes(value.angleUnit);

function init(state) {
  const settings = readStorage(SETTINGS_STORAGE_KEY, null, isSettings);
  const session = deserializeSession(readStorage(SESSION_STORAGE_KEY, null));
  return {
    ...state,
    ...(settings && { mode: settings.mode, angleUnit: settings.angleUnit }),
    ...session,
  };
}

export function CalculatorProvider({ children }) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState, init);
  const { mode, angleUnit } = state;

  useEffect(() => {
    writeStorage(SETTINGS_STORAGE_KEY, { mode, angleUnit });
  }, [mode, angleUnit]);

  // Текущее выражение переживает перезагрузку страницы.
  useEffect(() => {
    writeStorage(SESSION_STORAGE_KEY, serializeSession(state));
  }, [state]);

  return (
    <CalculatorStateContext value={state}>
      <CalculatorDispatchContext value={dispatch}>{children}</CalculatorDispatchContext>
    </CalculatorStateContext>
  );
}
