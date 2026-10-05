// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CalculatorProvider } from '../CalculatorProvider/CalculatorProvider';
import { HistoryProvider } from '../HistoryProvider/HistoryProvider';
import { ThemeProvider } from '../ThemeProvider/ThemeProvider';
import { Calculator } from './Calculator';

function renderApp() {
  return render(
    <ThemeProvider>
      <CalculatorProvider>
        <HistoryProvider>
          <Calculator />
        </HistoryProvider>
      </CalculatorProvider>
    </ThemeProvider>,
  );
}

const press = (name) => fireEvent.click(screen.getByRole('button', { name }));
const value = () => screen.getByTestId('display-value').textContent;
const expression = () => screen.getByTestId('display-expression').textContent;

describe('Calculator', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('computes 6,291 ÷ 5 like the mockup', () => {
    renderApp();
    ['6', '2', '9', '1'].forEach(press);
    press('Разделить');
    press('5');
    press('Равно');

    expect(value()).toBe('1,258.2');
    expect(expression()).toBe('6,291÷5');
    expect(screen.getByText('1,258.2')).toBeTruthy();
    expect(screen.getByText('6,291÷5')).toBeTruthy();
  });

  it('shows the typed number with grouping while editing', () => {
    renderApp();
    ['1', '2', '3', '4'].forEach(press);
    expect(value()).toBe('1,234');
    press('Стереть');
    expect(value()).toBe('123');
    press('Очистить');
    expect(value()).toBe('0');
  });

  it('shows a Russian message on division by zero', () => {
    renderApp();
    press('7');
    press('Разделить');
    press('0');
    press('Равно');
    expect(value()).toBe('Деление на ноль');
  });

  it('switches to the scientific keypad and back', () => {
    renderApp();
    expect(screen.queryByRole('button', { name: 'Синус' })).toBeNull();

    const modeGroup = screen.getByRole('group', { name: 'Режим калькулятора' });
    fireEvent.click(within(modeGroup).getByRole('button', { name: 'Инженерный' }));
    expect(screen.getByRole('button', { name: 'Синус' }).textContent).toBe('sin');
    expect(within(modeGroup).getByRole('button', { name: 'Инженерный' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(within(modeGroup).getByRole('button', { name: 'Обычный' }));
    expect(screen.queryByRole('button', { name: 'Синус' })).toBeNull();
  });

  it('evaluates scientific input: 3 x² = 9', () => {
    renderApp();
    press('Инженерный');
    press('3');
    press('Квадрат');
    press('Равно');
    expect(value()).toBe('9');
  });

  it('toggles the angle unit and persists settings', () => {
    renderApp();
    press('Инженерный');
    const toggle = screen.getByRole('button', { name: /Единицы углов: градусы/ });
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: /Единицы углов: радианы/ })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('calc:settings'))).toEqual({ mode: 'scientific', angleUnit: 'rad' });

    cleanup();
    renderApp();
    expect(screen.getByRole('button', { name: /Единицы углов: радианы/ })).toBeTruthy();
  });

  it('ignores invalid stored settings', () => {
    localStorage.setItem('calc:settings', JSON.stringify({ mode: 'weird', angleUnit: 'rad' }));
    renderApp();
    expect(screen.queryByRole('button', { name: 'Синус' })).toBeNull();
  });

  it('toggles the theme on <html> and stores it', () => {
    renderApp();
    const toggle = screen.getByRole('button', { name: 'Переключить тему' });
    const initial = document.documentElement.dataset.theme;
    expect(['dark', 'light']).toContain(initial);

    fireEvent.click(toggle);
    const next = initial === 'dark' ? 'light' : 'dark';
    expect(document.documentElement.dataset.theme).toBe(next);
    expect(JSON.parse(localStorage.getItem('calc:theme'))).toBe(next);
    expect(toggle.getAttribute('aria-pressed')).toBe(String(next === 'dark'));
  });

  it('restores the stored theme', () => {
    localStorage.setItem('calc:theme', JSON.stringify('light'));
    renderApp();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('keeps an unfinished expression after a page reload', () => {
    renderApp();
    ['1', '2'].forEach(press);
    press('Сложить');
    press('3');

    cleanup(); // «перезагрузка страницы»
    renderApp();
    expect(expression()).toBe('12+3');
    expect(value()).toBe('3');

    press('Равно');
    expect(value()).toBe('15');
  });

  it('keeps the result after reload without duplicating it in history', () => {
    renderApp();
    press('2');
    press('Сложить');
    press('3');
    press('Равно');

    cleanup();
    renderApp();
    expect(value()).toBe('5');
    expect(JSON.parse(localStorage.getItem('calc:history'))).toHaveLength(1);

    // новое вычисление после перезагрузки записывается как обычно
    press('Умножить');
    press('2');
    press('Равно');
    expect(JSON.parse(localStorage.getItem('calc:history'))).toHaveLength(2);
  });

  it('starts from zero when the saved session is corrupted', () => {
    localStorage.setItem('calc:session', '{"v":1,"tokens":"oops"');
    renderApp();
    expect(value()).toBe('0');
    press('7');
    expect(value()).toBe('7');
  });

  it('does not store the system theme until the user picks one', () => {
    renderApp();
    expect(localStorage.getItem('calc:theme')).toBeNull();
  });

  it('records results in history and loads them back', () => {
    renderApp();
    ['1', '2'].forEach(press);
    press('Сложить');
    press('3');
    press('Равно');
    press('Очистить');

    fireEvent.click(screen.getByRole('button', { name: 'История' }));
    const dialog = screen.getByRole('dialog', { name: 'История вычислений' });
    expect(within(dialog).getByText('12+3')).toBeTruthy();
    fireEvent.click(within(dialog).getByText('15'));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(value()).toBe('15');
    expect(JSON.parse(localStorage.getItem('calc:history'))).toHaveLength(1);
  });

  it('accepts input from the physical keyboard', () => {
    renderApp();
    for (const key of ['7', '*', '6', 'Enter']) {
      fireEvent.keyDown(window, { key });
    }
    expect(value()).toBe('42');
    expect(expression()).toBe('7×6');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(value()).toBe('0');
  });

  it('ignores the keyboard while the history dialog is open', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'История' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: '5' });
    expect(value()).toBe('0');
  });
});
