// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCalculatorState } from '../../hooks/useCalculator';
import { getDisplay } from '../../utils/calculator/display';
import { HISTORY_STORAGE_KEY } from '../../utils/history';
import { CalculatorProvider } from '../CalculatorProvider/CalculatorProvider';
import { HistoryProvider } from '../HistoryProvider/HistoryProvider';
import { HistoryPanel } from './HistoryPanel';

function DisplayValue() {
  const state = useCalculatorState();
  return <output data-testid="value">{getDisplay(state).value}</output>;
}

function renderPanel(onClose = vi.fn()) {
  render(
    <CalculatorProvider>
      <HistoryProvider>
        <DisplayValue />
        <HistoryPanel onClose={onClose} />
      </HistoryProvider>
    </CalculatorProvider>,
  );
  return onClose;
}

const seed = (value) => localStorage.setItem(HISTORY_STORAGE_KEY, typeof value === 'string' ? value : JSON.stringify(value));
const stored = () => JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY));

const ENTRIES = [
  { id: 'b', expression: '6,291÷5', result: '1258.2', timestamp: 2 },
  { id: 'a', expression: '2+2', result: '4', timestamp: 1 },
];

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

describe('HistoryPanel', () => {
  it('показывает записи, новые сверху', () => {
    seed(ENTRIES);
    renderPanel();
    const dialog = screen.getByRole('dialog', { name: 'История вычислений' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe('6,291÷51,258.2');
    expect(items[1].textContent).toBe('2+24');
  });

  it('фокусирует кнопку закрытия при открытии', () => {
    renderPanel();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Закрыть' }));
  });

  it('пустое состояние: текст и неактивная кнопка «Очистить»', () => {
    renderPanel();
    expect(screen.getByText('Пока нет вычислений')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Очистить' }).disabled).toBe(true);
  });

  it('клик по записи подставляет число и закрывает панель', () => {
    seed(ENTRIES);
    const onClose = renderPanel();
    expect(screen.getByTestId('value').textContent).toBe('0');
    fireEvent.click(screen.getByText('1,258.2'));
    expect(screen.getByTestId('value').textContent).toBe('1,258.2');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('«Очистить» очищает список и хранилище', () => {
    seed(ENTRIES);
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Очистить' }));
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByText('Пока нет вычислений')).toBeTruthy();
    expect(stored()).toEqual([]);
  });

  it('Escape, кнопка закрытия и клик по подложке закрывают панель', () => {
    const onClose = renderPanel();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('dialog').parentElement);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('не падает на повреждённом JSON', () => {
    seed('{not json');
    renderPanel();
    expect(screen.getByText('Пока нет вычислений')).toBeTruthy();
  });

  it('отбрасывает только битые записи', () => {
    seed([ENTRIES[0], { id: 'x', expression: '1', result: 'NaN', timestamp: 1 }, 'junk']);
    renderPanel();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });
});
