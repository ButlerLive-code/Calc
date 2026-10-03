import {
  add,
  cos,
  divide,
  E,
  factorial,
  ln,
  log10,
  multiply,
  negate,
  ONE,
  PI,
  power,
  sin,
  sqrt,
  subtract,
  tan,
} from '../decimal';
import { ANGLE_UNIT, CONSTANT, FUNCTION, OPERATOR, POSTFIX, TOKEN } from '../calculator/model';

/**
 * Вычисляет список токенов алгоритмом сортировочной станции (shunting-yard):
 * токены -> обратная польская запись -> стек значений.
 *
 * Приоритеты: + − (1) < × ÷ (2) < унарный минус (3) < ^ (4, правоассоциативный).
 * Постфиксные (!, ², ⁻¹) применяются сразу к значению слева.
 * Функция (sin, √, ...) открывает скобку и применяется к её содержимому.
 *
 * Бросает DecimalError (ошибки вычисления) или SyntaxError (некорректное выражение).
 */

const UNARY_MINUS = 'neg';

const BINARY = {
  [OPERATOR.ADD]: { precedence: 1, right: false, apply: add },
  [OPERATOR.SUBTRACT]: { precedence: 1, right: false, apply: subtract },
  [OPERATOR.MULTIPLY]: { precedence: 2, right: false, apply: multiply },
  [OPERATOR.DIVIDE]: { precedence: 2, right: false, apply: (a, b) => divide(a, b) },
  [UNARY_MINUS]: { precedence: 3, right: true, unary: true, apply: negate },
  [OPERATOR.POWER]: { precedence: 4, right: true, apply: power },
};

const FUNCTIONS = {
  [FUNCTION.SIN]: sin,
  [FUNCTION.COS]: cos,
  [FUNCTION.TAN]: tan,
  [FUNCTION.LN]: ln,
  [FUNCTION.LOG]: log10,
  [FUNCTION.SQRT]: sqrt,
};

const POSTFIXES = {
  [POSTFIX.FACTORIAL]: factorial,
  [POSTFIX.SQUARE]: (a) => multiply(a, a),
  [POSTFIX.RECIPROCAL]: (a) => divide(ONE, a),
};

const CONSTANTS = {
  [CONSTANT.PI]: () => PI,
  [CONSTANT.E]: () => E,
};

/** Токен закрывает операнд: после него может идти бинарный оператор. */
export function endsOperand(token) {
  return (
    token !== undefined &&
    (token.type === TOKEN.NUMBER ||
      token.type === TOKEN.CONSTANT ||
      token.type === TOKEN.RPAREN ||
      token.type === TOKEN.POSTFIX)
  );
}

function toRpn(tokens) {
  const output = [];
  const stack = [];
  let previous;

  for (const token of tokens) {
    switch (token.type) {
      case TOKEN.NUMBER:
      case TOKEN.CONSTANT:
      case TOKEN.POSTFIX:
        if ((token.type === TOKEN.POSTFIX) !== endsOperand(previous)) {
          throw new SyntaxError('Unexpected operand position');
        }
        output.push(token);
        break;

      case TOKEN.FUNCTION:
      case TOKEN.LPAREN:
        if (endsOperand(previous)) throw new SyntaxError('Missing operator');
        stack.push(token);
        break;

      case TOKEN.RPAREN: {
        if (!endsOperand(previous)) throw new SyntaxError('Empty parentheses');
        let top = stack.pop();
        while (top && top.type === TOKEN.OPERATOR) {
          output.push(top);
          top = stack.pop();
        }
        if (!top) throw new SyntaxError('Unbalanced parentheses');
        if (top.type === TOKEN.FUNCTION) output.push(top);
        break;
      }

      case TOKEN.OPERATOR: {
        const unary = !endsOperand(previous);
        if (unary && token.value !== OPERATOR.SUBTRACT) {
          throw new SyntaxError('Operator without left operand');
        }
        const name = unary ? UNARY_MINUS : token.value;
        const current = BINARY[name];
        while (stack.length > 0) {
          const top = stack.at(-1);
          if (top.type !== TOKEN.OPERATOR || current.unary) break;
          const topInfo = BINARY[top.value];
          const popsFirst =
            topInfo.precedence > current.precedence ||
            (topInfo.precedence === current.precedence && !current.right);
          if (!popsFirst) break;
          output.push(stack.pop());
        }
        stack.push({ type: TOKEN.OPERATOR, value: name });
        break;
      }

      default:
        throw new SyntaxError(`Unknown token: ${token.type}`);
    }
    previous = token;
  }

  if (!endsOperand(previous)) throw new SyntaxError('Incomplete expression');
  while (stack.length > 0) {
    const top = stack.pop();
    if (top.type !== TOKEN.OPERATOR) throw new SyntaxError('Unbalanced parentheses');
    output.push(top);
  }
  return output;
}

/**
 * @param {import('../calculator/model').Token[]} tokens
 * @param {{ angleUnit?: string }} [options]
 * @returns {import('../calculator/model').Decimal}
 */
export function evaluate(tokens, { angleUnit = ANGLE_UNIT.DEG } = {}) {
  const values = [];
  const pop = () => {
    if (values.length === 0) throw new SyntaxError('Missing operand');
    return values.pop();
  };

  for (const token of toRpn(tokens)) {
    switch (token.type) {
      case TOKEN.NUMBER:
        values.push(token.value);
        break;
      case TOKEN.CONSTANT:
        values.push(CONSTANTS[token.value]());
        break;
      case TOKEN.POSTFIX:
        values.push(POSTFIXES[token.value](pop()));
        break;
      case TOKEN.FUNCTION:
        values.push(FUNCTIONS[token.value](pop(), angleUnit));
        break;
      case TOKEN.OPERATOR: {
        const info = BINARY[token.value];
        if (info.unary) {
          values.push(info.apply(pop()));
        } else {
          const right = pop();
          values.push(info.apply(pop(), right));
        }
        break;
      }
    }
  }

  if (values.length !== 1) throw new SyntaxError('Malformed expression');
  return values[0];
}
