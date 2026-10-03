import { memo, useMemo } from 'react';
import { useCalculatorDispatch } from '../../hooks/useCalculator';
import { ACTION, OPERATOR } from '../../utils/calculator/model';
import { Button } from '../Button/Button';
import { BackspaceIcon, PlusMinusIcon } from './icons';
import styles from './Keypad.module.css';

const digit = (value) => ({
  id: `digit-${value}`,
  label: String(value),
  variant: 'low',
  action: { type: ACTION.INPUT_DIGIT, digit: value },
});

const operator = (value, ariaLabel) => ({
  id: `operator-${value}`,
  label: value,
  ariaLabel,
  variant: 'high',
  action: { type: ACTION.INPUT_OPERATOR, operator: value },
});

/** Раскладка из макета: 4 колонки × 5 рядов. */
const KEYS = [
  { id: 'clear', label: 'C', ariaLabel: 'Очистить', variant: 'medium', action: { type: ACTION.CLEAR } },
  {
    id: 'sign',
    label: <PlusMinusIcon />,
    ariaLabel: 'Сменить знак',
    variant: 'medium',
    action: { type: ACTION.TOGGLE_SIGN },
  },
  { id: 'percent', label: '%', ariaLabel: 'Процент', variant: 'medium', action: { type: ACTION.PERCENT } },
  operator(OPERATOR.DIVIDE, 'Разделить'),
  digit(7),
  digit(8),
  digit(9),
  operator(OPERATOR.MULTIPLY, 'Умножить'),
  digit(4),
  digit(5),
  digit(6),
  operator(OPERATOR.SUBTRACT, 'Вычесть'),
  digit(1),
  digit(2),
  digit(3),
  operator(OPERATOR.ADD, 'Сложить'),
  { id: 'dot', label: '.', ariaLabel: 'Десятичная точка', variant: 'low', action: { type: ACTION.INPUT_DOT } },
  digit(0),
  {
    id: 'backspace',
    label: <BackspaceIcon />,
    ariaLabel: 'Стереть',
    variant: 'low',
    action: { type: ACTION.BACKSPACE },
  },
  { id: 'evaluate', label: '=', ariaLabel: 'Равно', variant: 'high', action: { type: ACTION.EVALUATE } },
];

export const Keypad = memo(function Keypad() {
  const dispatch = useCalculatorDispatch();

  // Стабильные обработчики: Button мемоизирован и не перерисовывается при смене дисплея.
  const handlers = useMemo(() => KEYS.map((key) => () => dispatch(key.action)), [dispatch]);

  return (
    <div className={styles.keypad} role="group" aria-label="Основная клавиатура">
      {KEYS.map((key, index) => (
        <Button
          key={key.id}
          label={key.label}
          ariaLabel={key.ariaLabel}
          variant={key.variant}
          onClick={handlers[index]}
        />
      ))}
    </div>
  );
});
