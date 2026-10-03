import { memo, useMemo } from 'react';
import { useCalculatorDispatch, useCalculatorState } from '../../hooks/useCalculator';
import { ACTION, ANGLE_UNIT, CONSTANT, FUNCTION, OPERATOR, POSTFIX } from '../../utils/calculator/model';
import { Button } from '../Button/Button';
import styles from './ScientificKeypad.module.css';

const fn = (name, label, ariaLabel) => ({
  id: `fn-${name}`,
  label,
  ariaLabel,
  variant: 'medium',
  action: { type: ACTION.INPUT_FUNCTION, name },
});

const postfix = (operator, label, ariaLabel) => ({
  id: `postfix-${operator}`,
  label,
  ariaLabel,
  variant: 'medium',
  action: { type: ACTION.INPUT_POSTFIX, operator },
});

const constant = (name, ariaLabel) => ({
  id: `const-${name}`,
  label: name,
  ariaLabel,
  variant: 'low',
  action: { type: ACTION.INPUT_CONSTANT, name },
});

/** 5 колонок × 3 ряда; последняя ячейка — переключатель Deg/Rad. */
const KEYS = [
  { id: 'lparen', label: '(', ariaLabel: 'Открывающая скобка', variant: 'low', action: { type: ACTION.OPEN_PAREN } },
  { id: 'rparen', label: ')', ariaLabel: 'Закрывающая скобка', variant: 'low', action: { type: ACTION.CLOSE_PAREN } },
  postfix(POSTFIX.SQUARE, 'x²', 'Квадрат'),
  {
    id: 'power',
    label: 'xʸ',
    ariaLabel: 'Степень',
    variant: 'medium',
    action: { type: ACTION.INPUT_OPERATOR, operator: OPERATOR.POWER },
  },
  fn(FUNCTION.SQRT, '√', 'Квадратный корень'),
  fn(FUNCTION.SIN, 'sin', 'Синус'),
  fn(FUNCTION.COS, 'cos', 'Косинус'),
  fn(FUNCTION.TAN, 'tan', 'Тангенс'),
  constant(CONSTANT.PI, 'Число пи'),
  constant(CONSTANT.E, 'Число e'),
  fn(FUNCTION.LN, 'ln', 'Натуральный логарифм'),
  fn(FUNCTION.LOG, 'log', 'Десятичный логарифм'),
  postfix(POSTFIX.FACTORIAL, 'n!', 'Факториал'),
  postfix(POSTFIX.RECIPROCAL, '1/x', 'Обратное число'),
];

const ANGLE_LABEL = {
  [ANGLE_UNIT.DEG]: 'градусы',
  [ANGLE_UNIT.RAD]: 'радианы',
};

/** Отдельный компонент: только он перерисовывается при смене состояния. */
function AngleUnitToggle() {
  const { angleUnit } = useCalculatorState();
  const dispatch = useCalculatorDispatch();
  const next = angleUnit === ANGLE_UNIT.DEG ? ANGLE_UNIT.RAD : ANGLE_UNIT.DEG;

  return (
    <button
      type="button"
      className={styles.angle}
      onClick={() => dispatch({ type: ACTION.SET_ANGLE_UNIT, unit: next })}
      aria-label={`Единицы углов: ${ANGLE_LABEL[angleUnit]}. Переключить на ${ANGLE_LABEL[next]}`}
    >
      <span className={angleUnit === ANGLE_UNIT.DEG ? styles.angleActive : styles.angleInactive}>Deg</span>
      <span className={angleUnit === ANGLE_UNIT.RAD ? styles.angleActive : styles.angleInactive}>Rad</span>
    </button>
  );
}

export const ScientificKeypad = memo(function ScientificKeypad() {
  const dispatch = useCalculatorDispatch();
  const handlers = useMemo(() => KEYS.map((key) => () => dispatch(key.action)), [dispatch]);

  return (
    <div className={styles.keypad} role="group" aria-label="Инженерные функции">
      {KEYS.map((key, index) => (
        <Button
          key={key.id}
          label={key.label}
          ariaLabel={key.ariaLabel}
          variant={key.variant}
          size="compact"
          onClick={handlers[index]}
        />
      ))}
      <AngleUnitToggle />
    </div>
  );
});
