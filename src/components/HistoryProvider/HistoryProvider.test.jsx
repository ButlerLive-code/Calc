// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { StrictMode, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCalculatorDispatch, useCalculatorState } from '../../hooks/useCalculator';
import { useHistory, useRecordEvaluation } from '../../hooks/useHistory';
import { ACTION, OPERATOR } from '../../utils/calculator/model';
import { HISTORY_STORAGE_KEY } from '../../utils/history';
import { CalculatorProvider } from '../CalculatorProvider/CalculatorProvider';
import { HistoryProvider } from './HistoryProvider';

const probe = { dispatch: null, history: null };

function Probe() {
  const state = useCalculatorState();
  const dispatch = useCalculatorDispatch();
  const history = useHistory();
  useRecordEvaluation(state.evaluation);
  useEffect(() => {
    probe.dispatch = dispatch;
    probe.history = history;
  });
  return (
    <ul>
      {history.entries.map((entry) => (
        <li key={entry.id}>{`${entry.expression}=${entry.result}`}</li>
      ))}
    </ul>
  );
}

function renderApp() {
  return render(
    <StrictMode>
      <CalculatorProvider>
        <HistoryProvider>
          <Probe />
        </HistoryProvider>
      </CalculatorProvider>
    </StrictMode>,
  );
}

const send = (...actions) => act(() => actions.forEach((action) => probe.dispatch(action)));
const digit = (d) => ({ type: ACTION.INPUT_DIGIT, digit: d });
const op = (operator) => ({ type: ACTION.INPUT_OPERATOR, operator });
const EVALUATE = { type: ACTION.EVALUATE };
const items = () => screen.queryAllByRole('listitem').map((li) => li.textContent);
const stored = () => JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY));

// Node 25 подменяет jsdom-овский localStorage своим (без --localstorage-file он нерабочий),
// поэтому в тестах — простое хранилище в памяти.
function createMemoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear(),
    key: (i) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}

beforeEach(() => {
  const storage = createMemoryStorage();
  vi.stubGlobal('localStorage', storage);
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('useRecordEvaluation', () => {
  it('ничего не пишет без вычислений', () => {
    renderApp();
    expect(items()).toEqual([]);
  });

  it('записывает результат "=" один раз (StrictMode, перерисовки)', () => {
    renderApp();
    send(digit(2), op(OPERATOR.ADD), digit(3), EVALUATE);
    expect(items()).toEqual(['2+3=5']);
    send({ type: ACTION.CLEAR }); // evaluation сохраняется в state — дубля быть не должно
    expect(items()).toEqual(['2+3=5']);
  });

  it('повторный "=" без новой операции не дублирует запись', () => {
    renderApp();
    send(digit(7), EVALUATE, EVALUATE);
    expect(items()).toEqual(['7=7']);
  });

  it('новый "=" добавляет запись в начало и сохраняет в localStorage', () => {
    renderApp();
    send(digit(2), op(OPERATOR.ADD), digit(3), EVALUATE);
    send(digit(4), op(OPERATOR.MULTIPLY), digit(5), EVALUATE);
    expect(items()).toEqual(['4×5=20', '2+3=5']);
    expect(stored().map((entry) => entry.result)).toEqual(['20', '5']);
  });

  it('повтор последней операции "=" — это новое вычисление', () => {
    renderApp();
    send(digit(2), op(OPERATOR.ADD), digit(3), EVALUATE);
    send(EVALUATE); // отдельное нажатие — отдельный рендер
    expect(items()).toEqual(['5+3=8', '2+3=5']);
  });

  it('история переживает перезагрузку', () => {
    renderApp();
    send(digit(9), op(OPERATOR.SUBTRACT), digit(1), EVALUATE);
    cleanup();
    renderApp();
    expect(items()).toEqual(['9−1=8']);
  });

  it('removeEntry удаляет одну запись', () => {
    renderApp();
    send(digit(1), EVALUATE);
    send(digit(2), op(OPERATOR.ADD), digit(2), EVALUATE);
    act(() => probe.history.removeEntry(probe.history.entries[1].id));
    expect(items()).toEqual(['2+2=4']);
    expect(stored()).toHaveLength(1);
  });
});

describe('useHistory', () => {
  it('бросает ошибку вне провайдера', () => {
    function Lonely() {
      useHistory();
      return null;
    }
    const spy = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Lonely />)).toThrow(/HistoryProvider/);
    } finally {
      console.error = spy;
    }
  });
});
