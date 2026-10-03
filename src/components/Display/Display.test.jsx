// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CalculatorStateContext } from '../../hooks/useCalculator';
import { ERROR_CODE, initialState, STATUS } from '../../utils/calculator/model';
import { Display } from './Display';
import { ERROR_MESSAGE } from './errorMessages';

const renderWith = (state) =>
  render(
    <CalculatorStateContext value={state}>
      <Display />
    </CalculatorStateContext>,
  );

describe('Display', () => {
  afterEach(cleanup);

  it('shows 0 initially with an empty expression', () => {
    renderWith(initialState);
    expect(screen.getByTestId('display-value').textContent).toBe('0');
    expect(screen.getByTestId('display-expression').textContent).toBe('');
    expect(screen.getByTestId('display-value').getAttribute('aria-live')).toBe('polite');
  });

  it.each(Object.values(ERROR_CODE))('shows Russian text for %s', (code) => {
    renderWith({ ...initialState, input: null, status: STATUS.ERROR, errorCode: code });
    expect(screen.getByTestId('display-value').textContent).toBe(ERROR_MESSAGE[code]);
  });

  it('passes the text length to CSS for font shrinking', () => {
    const input = { digits: 1234567890123456n, scale: 0, hasDot: false, negative: false };
    renderWith({ ...initialState, input });
    const node = screen.getByTestId('display-value');
    expect(node.textContent).toBe('1,234,567,890,123,456');
    expect(node.style.getPropertyValue('--chars')).toBe('21');
  });
});
