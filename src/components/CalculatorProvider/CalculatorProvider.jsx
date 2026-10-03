import { useEffect, useReducer } from 'react';
import { CalculatorDispatchContext, CalculatorStateContext } from '../../hooks/useCalculator';
import { readStorage, writeStorage } from '../../hooks/useLocalStorage';
import { ANGLE_UNIT, initialState, MODE } from '../../utils/calculator/model';
import { calculatorReducer } from '../../utils/calculator/reducer';

/** Сохраняются только настройки (режим и единицы углов), не выражение. */
export const SETTINGS_STORAGE_KEY = 'calc:settings';

const isSettings = (value) =>
  value !== null &&
  typeof value === 'object' &&
  Object.values(MODE).includes(value.mode) &&
  Object.values(ANGLE_UNIT).includes(value.angleUnit);

function init(state) {
  const settings = readStorage(SETTINGS_STORAGE_KEY, null, isSettings);
  return settings ? { ...state, mode: settings.mode, angleUnit: settings.angleUnit } : state;
}

export function CalculatorProvider({ children }) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState, init);
  const { mode, angleUnit } = state;

  useEffect(() => {
    writeStorage(SETTINGS_STORAGE_KEY, { mode, angleUnit });
  }, [mode, angleUnit]);

  return (
    <CalculatorStateContext value={state}>
      <CalculatorDispatchContext value={dispatch}>{children}</CalculatorDispatchContext>
    </CalculatorStateContext>
  );
}
