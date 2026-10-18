/**
 * Safe declarative formula evaluator for EPC Takeoff calculations.
 * Avoids eval() or Function() for security and determinism.
 */

export interface FormulaVariables {
  count?: number;
  qty?: number;
  length?: number;
  widthMultiplier?: number;
  [key: string]: number | undefined;
}

/**
 * Evaluates mathematical expressions with variable substitution.
 * Supports basic arithmetic (+, -, *, /), parentheses, and variables.
 */
export function evaluateFormula(formula: string, vars: FormulaVariables = {}): number | null {
  if (!formula || typeof formula !== 'string') return null;
  const trimmed = formula.trim();
  if (!trimmed) return null;

  // If formula is a simple number
  const directNum = Number(trimmed);
  if (!isNaN(directNum) && isFinite(directNum)) {
    return directNum;
  }

  // Tokenize & substitute known variables
  let expr = trimmed.toLowerCase();

  // Handle common EPC patterns: "length x 0.375 x 0.5" -> "length * 0.375 * 0.5"
  expr = expr.replace(/x/g, '*');

  const countVal = vars.count ?? 1;
  const qtyVal = vars.qty ?? 1;
  const lengthVal = vars.length ?? 1;
  const widthMult = vars.widthMultiplier ?? 1;

  // Replace variable identifiers
  expr = expr.replace(/\bcount\b/g, String(countVal));
  expr = expr.replace(/\bqty\b/g, String(qtyVal));
  expr = expr.replace(/\blength\b/g, String(lengthVal));
  expr = expr.replace(/\bwidth_multiplier\b/g, String(widthMult));

  // Only allow digits, decimals, whitespace, and arithmetic symbols +, -, *, /, (, )
  if (!/^[0-9.\s+\-*/()]+$/.test(expr)) {
    return null;
  }

  try {
    // Safe mathematical parser using recursive descent or simple tokens
    return parseArithmeticExpression(expr);
  } catch {
    return null;
  }
}

/**
 * Simple recursive descent arithmetic parser for safe client-side math.
 */
function parseArithmeticExpression(expr: string): number {
  let pos = 0;
  const str = expr.replace(/\s+/g, '');

  function parseNumber(): number {
    let numStr = '';
    if (str[pos] === '+' || str[pos] === '-') {
      numStr += str[pos++];
    }
    while (pos < str.length && (str[pos] >= '0' && str[pos] <= '9' || str[pos] === '.')) {
      numStr += str[pos++];
    }
    const val = parseFloat(numStr);
    if (isNaN(val)) throw new Error('Invalid number');
    return val;
  }

  function parseFactor(): number {
    if (str[pos] === '(') {
      pos++; // skip '('
      const val = parseExpression();
      if (str[pos] === ')') pos++; // skip ')'
      return val;
    }
    return parseNumber();
  }

  function parseTerm(): number {
    let val = parseFactor();
    while (pos < str.length && (str[pos] === '*' || str[pos] === '/')) {
      const op = str[pos++];
      const next = parseFactor();
      if (op === '*') val *= next;
      else if (op === '/') {
        if (next === 0) val = 0;
        else val /= next;
      }
    }
    return val;
  }

  function parseExpression(): number {
    let val = parseTerm();
    while (pos < str.length && (str[pos] === '+' || str[pos] === '-')) {
      const op = str[pos++];
      const next = parseTerm();
      if (op === '+') val += next;
      else if (op === '-') val -= next;
    }
    return val;
  }

  const result = parseExpression();
  // Round to 4 decimal places to prevent floating point drift
  return Math.round(result * 10000) / 10000;
}
