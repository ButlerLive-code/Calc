import { createContext, useContext } from 'react';

// Состояние и dispatch разнесены, чтобы кнопки (им нужен только dispatch)
// не перерисовывались при каждом изменении дисплея.
// Провайдер — components/CalculatorProvider.
export const CalculatorStateContext = createContext(null);
export const CalculatorDispatchContext = createContext(null);

export function useCalculatorState() {
  const state = useContext(CalculatorStateContext);
  if (state === null) {
    throw new Error('useCalculatorState must be used inside <CalculatorProvider>');
  }
  return state;
}

export function useCalculatorDispatch() {
  const dispatch = useContext(CalculatorDispatchContext);
  if (dispatch === null) {
    throw new Error('useCalculatorDispatch must be used inside <CalculatorProvider>');
  }
  return dispatch;
}
