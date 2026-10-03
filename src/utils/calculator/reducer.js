import { DecimalError, divide, fromString, multiply, negate, percent } from '../decimal';
import { endsOperand, evaluate } from '../expression/evaluate';
import {
  decimalToInput,
  appendDigit,
  appendDot,
  inputToDecimal,
  isPristine,
  removeLast,
  toggleSign,
} from './input';
import { ACTION, ANGLE_UNIT, ERROR_CODE, initialState, MODE, OPERATOR, STATUS, TOKEN, ZERO_INPUT } from './model';

/**
 * Чистый reducer калькулятора: (state, action) -> state.
 * Всё вычисление — через evaluate(tokens); ошибки DecimalError превращаются в STATUS.ERROR.
 */

const HUNDRED = fromString('100');
const MULTIPLY_TOKEN = { type: TOKEN.OPERATOR, value: OPERATOR.MULTIPLY };

const numberToken = (value) => ({ type: TOKEN.NUMBER, value });

/** Переносит набираемое число в токены. */
function commitInput(state) {
  if (!state.input) return state;
  return { ...state, tokens: [...state.tokens, numberToken(inputToDecimal(state.input))], input: null };
}

/** Перед новым операндом после закрытого операнда вставляет ×: 2π, 3(4), )(. */
function withImplicitMultiply(tokens) {
  return endsOperand(tokens.at(-1)) ? [...tokens, MULTIPLY_TOKEN] : tokens;
}

function openParenCount(tokens) {
  let count = 0;
  for (const token of tokens) {
    if (token.type === TOKEN.LPAREN || token.type === TOKEN.FUNCTION) count += 1;
    if (token.type === TOKEN.RPAREN) count -= 1;
  }
  return count;
}

/** Готовит выражение к вычислению: убирает «висящие» хвосты и закрывает скобки. */
export function completeTokens(tokens) {
  const result = [...tokens];
  while (result.length > 0 && !endsOperand(result.at(-1))) {
    result.pop();
  }
  const missing = openParenCount(result);
  for (let i = 0; i < missing; i += 1) {
    result.push({ type: TOKEN.RPAREN });
  }
  return result;
}

function errorCodeOf(error) {
  if (error instanceof DecimalError) return error.code;
  if (error instanceof SyntaxError) return ERROR_CODE.SYNTAX;
  throw error;
}

/** Сброс выражения с сохранением настроек и счётчика вычислений. */
function reset(state) {
  return {
    ...initialState,
    mode: state.mode,
    angleUnit: state.angleUnit,
    evaluation: state.evaluation,
  };
}

/** Начинает новое выражение с числа (после "=" или из истории). */
function startWith(state, value) {
  return { ...reset(state), input: decimalToInput(value) };
}

/** Начинает выражение, продолжающее последний результат: "= +" -> "1258.2+" */
function continueFromResult(state) {
  return { ...reset(state), tokens: [numberToken(state.evaluation.result)], input: null };
}

/** Начинает новый операнд; набранный "0" по умолчанию отбрасывается: π, а не 0×π. */
function beginOperand(state) {
  const base = state.input && isPristine(state.input) && state.tokens.length === 0 ? { ...state, input: null } : state;
  const committed = commitInput(base);
  return { ...committed, tokens: withImplicitMultiply(committed.tokens) };
}

function runEvaluation(state, tokens, lastOperation) {
  try {
    const result = evaluate(tokens, { angleUnit: state.angleUnit });
    return {
      ...reset(state),
      input: null,
      status: STATUS.RESULT,
      evaluation: { id: (state.evaluation?.id ?? 0) + 1, tokens, result },
      lastOperation,
    };
  } catch (error) {
    return { ...state, tokens, input: null, status: STATUS.ERROR, errorCode: errorCodeOf(error) };
  }
}

/** "2+3" -> { operator: '+', operand: 3 } для повторного "=". */
function findLastOperation(tokens) {
  const [left, operator, operand] = tokens.slice(-3);
  if (tokens.length >= 3 && endsOperand(left) && operator.type === TOKEN.OPERATOR && operand.type === TOKEN.NUMBER) {
    return { operator: operator.value, operand: operand.value };
  }
  return null;
}

function evaluateExpression(state) {
  if (state.status === STATUS.RESULT) {
    if (!state.lastOperation) return state;
    const { operator, operand } = state.lastOperation;
    const tokens = [
      numberToken(state.evaluation.result),
      { type: TOKEN.OPERATOR, value: operator },
      numberToken(operand),
    ];
    return runEvaluation(state, tokens, state.lastOperation);
  }
  const tokens = completeTokens(commitInput(state).tokens);
  if (tokens.length === 0) return state;
  return runEvaluation(state, tokens, findLastOperation(tokens));
}

function inputOperator(state, operator) {
  const token = { type: TOKEN.OPERATOR, value: operator };
  if (state.status === STATUS.RESULT) {
    const base = continueFromResult(state);
    return { ...base, tokens: [...base.tokens, token] };
  }
  const committed = commitInput(state);
  const { tokens } = committed;
  const last = tokens.at(-1);

  if (endsOperand(last)) {
    return { ...committed, tokens: [...tokens, token] };
  }
  if (last?.type === TOKEN.OPERATOR) {
    // Заменяем бинарный оператор; унарный минус ("(−") не трогаем.
    const isUnary = !endsOperand(tokens.at(-2));
    return isUnary ? state : { ...committed, tokens: [...tokens.slice(0, -1), token] };
  }
  // Начало выражения или после "(" — допустим только унарный минус.
  return operator === OPERATOR.SUBTRACT ? { ...committed, tokens: [...tokens, token] } : state;
}

function inputPostfix(state, operator) {
  const base = state.status === STATUS.RESULT ? continueFromResult(state) : commitInput(state);
  if (!endsOperand(base.tokens.at(-1))) return state;
  return { ...base, tokens: [...base.tokens, { type: TOKEN.POSTFIX, value: operator }] };
}

function closeParen(state) {
  const committed = commitInput(state);
  if (openParenCount(committed.tokens) === 0 || !endsOperand(committed.tokens.at(-1))) return state;
  return { ...committed, tokens: [...committed.tokens, { type: TOKEN.RPAREN }] };
}

function backspace(state) {
  if (state.input) {
    const input = removeLast(state.input);
    if (input) return { ...state, input };
    return { ...state, input: state.tokens.length > 0 ? null : ZERO_INPUT };
  }
  const tokens = state.tokens.slice(0, -1);
  const last = tokens.at(-1);
  if (last?.type === TOKEN.NUMBER) {
    return { ...state, tokens: tokens.slice(0, -1), input: decimalToInput(last.value) };
  }
  return { ...state, tokens, input: tokens.length > 0 ? null : ZERO_INPUT };
}

function toggleInputSign(state) {
  if (state.status === STATUS.RESULT) {
    return startWith(state, negate(state.evaluation.result));
  }
  if (state.input) {
    return { ...state, input: toggleSign(state.input) };
  }
  const last = state.tokens.at(-1);
  if (last?.type === TOKEN.NUMBER) {
    return { ...state, tokens: state.tokens.slice(0, -1), input: toggleSign(decimalToInput(last.value)) };
  }
  if (endsOperand(last)) return state;
  return { ...state, input: toggleSign(ZERO_INPUT) };
}

/**
 * Процент как в iOS: "a + b%" и "a − b%" — b процентов от a; иначе b / 100.
 */
function applyPercent(state) {
  if (state.status === STATUS.RESULT) {
    return startWith(state, percent(state.evaluation.result));
  }
  if (!state.input) return state;
  const value = inputToDecimal(state.input);
  const last = state.tokens.at(-1);
  let result = percent(value);
  if (last?.type === TOKEN.OPERATOR && (last.value === OPERATOR.ADD || last.value === OPERATOR.SUBTRACT)) {
    try {
      const base = evaluate(completeTokens(state.tokens.slice(0, -1)), { angleUnit: state.angleUnit });
      result = divide(multiply(base, value), HUNDRED);
    } catch {
      // база не вычисляется (например, "(" не закрыта) — остаётся b / 100
    }
  }
  return { ...state, input: decimalToInput(result) };
}

function loadValue(state, value) {
  if (state.status !== STATUS.EDITING || (state.tokens.length === 0 && (!state.input || isPristine(state.input)))) {
    return startWith(state, value);
  }
  if (state.input) {
    return { ...state, input: decimalToInput(value) };
  }
  return { ...state, tokens: withImplicitMultiply(state.tokens), input: decimalToInput(value) };
}

export function calculatorReducer(state, action) {
  // После ошибки любой ввод начинает выражение заново; операторы игнорируются.
  if (state.status === STATUS.ERROR && action.type !== ACTION.SET_MODE && action.type !== ACTION.SET_ANGLE_UNIT) {
    const fresh = reset(state);
    const restartable = [ACTION.INPUT_DIGIT, ACTION.INPUT_DOT, ACTION.INPUT_FUNCTION, ACTION.INPUT_CONSTANT, ACTION.OPEN_PAREN, ACTION.LOAD_VALUE];
    return restartable.includes(action.type) ? calculatorReducer(fresh, action) : fresh;
  }

  // После "=" цифра или новый операнд начинают новое выражение.
  if (state.status === STATUS.RESULT) {
    const startsNew = [ACTION.INPUT_DIGIT, ACTION.INPUT_DOT, ACTION.INPUT_FUNCTION, ACTION.INPUT_CONSTANT, ACTION.OPEN_PAREN];
    if (startsNew.includes(action.type)) {
      return calculatorReducer({ ...reset(state), input: null }, action);
    }
    if (action.type === ACTION.BACKSPACE) {
      return reset(state);
    }
  }

  switch (action.type) {
    case ACTION.INPUT_DIGIT:
      if (!state.input) {
        return { ...state, tokens: withImplicitMultiply(state.tokens), input: appendDigit(ZERO_INPUT, action.digit) };
      }
      return { ...state, input: appendDigit(state.input, action.digit) };

    case ACTION.INPUT_DOT:
      if (!state.input) {
        return { ...state, tokens: withImplicitMultiply(state.tokens), input: appendDot(ZERO_INPUT) };
      }
      return { ...state, input: appendDot(state.input) };

    case ACTION.INPUT_OPERATOR:
      return inputOperator(state, action.operator);

    case ACTION.INPUT_POSTFIX:
      return inputPostfix(state, action.operator);

    case ACTION.INPUT_CONSTANT: {
      const next = beginOperand(state);
      return { ...next, tokens: [...next.tokens, { type: TOKEN.CONSTANT, value: action.name }] };
    }

    case ACTION.INPUT_FUNCTION: {
      const next = beginOperand(state);
      return { ...next, tokens: [...next.tokens, { type: TOKEN.FUNCTION, value: action.name }] };
    }

    case ACTION.OPEN_PAREN: {
      const next = beginOperand(state);
      return { ...next, tokens: [...next.tokens, { type: TOKEN.LPAREN }] };
    }

    case ACTION.CLOSE_PAREN:
      return closeParen(state);

    case ACTION.EVALUATE:
      return evaluateExpression(state);

    case ACTION.CLEAR:
      return reset(state);

    case ACTION.BACKSPACE:
      return backspace(state);

    case ACTION.TOGGLE_SIGN:
      return toggleInputSign(state);

    case ACTION.PERCENT:
      return applyPercent(state);

    case ACTION.LOAD_VALUE:
      return loadValue(state, action.value);

    case ACTION.SET_MODE:
      return Object.values(MODE).includes(action.mode) ? { ...state, mode: action.mode } : state;

    case ACTION.SET_ANGLE_UNIT:
      return Object.values(ANGLE_UNIT).includes(action.unit) ? { ...state, angleUnit: action.unit } : state;

    default:
      return state;
  }
}
