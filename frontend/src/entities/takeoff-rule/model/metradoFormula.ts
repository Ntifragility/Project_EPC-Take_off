import { DetalleVariantItem, RuleSubitem, TakeoffRule } from './types';
import { TakeoffItem } from '../../takeoff-item/model/types';

const EMPTY_LINE_HINT = 'Vacío = esa línea se puede llenar en la tabla.';

/** Explains only the variables and operators present in the current lines. */
export function formulaHint(formulas: string[]): string {
  const text = formulas.join(' ').toLowerCase();
  const parts: string[] = [];
  if (/\blength\b/.test(text)) parts.push('length = metros del cable al aplicar.');
  const soportes = /\bsoportes\b/.test(text);
  const jumpers = /\bjumpers\b/.test(text);
  if (soportes && jumpers) parts.push('soportes y jumpers = las cantidades del formulario.');
  else if (soportes) parts.push('soportes = la cantidad de soportes del formulario.');
  else if (jumpers) parts.push('jumpers = la cantidad de jumpers del formulario.');
  if (/\bceil\b/.test(text)) parts.push('ceil(length / 3) redondea hacia arriba.');
  if (/[x×*]/.test(text)) parts.push('Puedes usar * o x.');
  parts.push(EMPTY_LINE_HINT);
  return parts.join(' ');
}

export interface MetradoVars {
  length?: number;
  soportes?: number;
  jumpers?: number;
}

export type MetradoResult =
  | { status: 'value'; text: string; number: number }
  | { status: 'blank' }
  | { status: 'needs-input' };

export function isMetradoExpression(text: string): boolean {
  return /length|soportes|jumpers|ceil|[x×*]/i.test(text);
}

export function builtinMetradoFormula(desc: string, trigger: string): string {
  const d = (desc || '').toUpperCase();
  const t = (trigger || '').toUpperCase();
  if (t.includes('CABLE DESNUDO 4/0')) {
    if (d.includes('CABLE DESNUDO 4/0')) return 'length';
    if (d.includes('CINTA AMARILLA')) return 'length';
    if (d.includes('TIERRA')) return 'length * 0.375 * 0.5';
    if (d.includes('CEMENTO')) return 'length * 11.3 / 2';
    return '';
  }
  if (t.includes('POZO')) {
    if (d.includes('TIERRA')) return '4.71';
    if (d.includes('CEMENTO')) return '22.6';
    return '1';
  }
  if (t.includes('SOLDADURA')) {
    if (d.includes('MOLDE')) return '0.0167';
    return '1';
  }
  if (t.includes('CABLE DESNUDO 2/0')) {
    if (d.includes('MOLDE')) return '0.0167';
    if (d.includes('CABLE DESNUDO 2/0') && !d.includes('JUMPER')) return 'length';
    if (
      d.includes('TERMINAL') ||
      d.includes('PERNO') ||
      d.includes('SOLDADURA') ||
      d.includes('CARGA') ||
      d.includes('TUBERIA') ||
      d.includes('TUBERÍA')
    ) {
      return '1';
    }
    return '';
  }
  if (d.includes('MOLDE')) return '0.0167';
  return '';
}

export function shownFormula(item: Pick<RuleSubitem, 'desc' | 'qty' | 'formula'>, trigger: string): string {
  const stored = (item.formula || '').trim();
  if (stored) return stored;
  const qty = String(item.qty ?? '').trim();
  if (isMetradoExpression(qty)) return qty;
  return builtinMetradoFormula(item.desc, trigger);
}

export function shownVariantFormula(item: DetalleVariantItem): string {
  const stored = (item.formula || '').trim();
  if (stored) return stored;
  if (item.otDynamic === '1c/3m') return 'ceil(length / 3)';
  const otText = String(item.ot ?? '').trim();
  if (isMetradoExpression(otText)) return otText;
  const unit = (item.unit || '').toLowerCase();
  const desc = (item.desc || '').toLowerCase();
  const base = typeof item.ot === 'number' ? item.ot : typeof item.qty === 'number' ? item.qty : null;
  if (base !== null && (unit.includes('soporte') || desc.includes('soporte'))) return `${base} * soportes`;
  if (base !== null && (unit.includes('jumper') || desc.includes('jumper'))) return `${base} * jumpers`;
  const isVar = otText.toUpperCase() === 'VAR.' || item.qty === 'Var.' || item.otDynamic === 'empty';
  if (isVar && desc.includes('cable') && !desc.includes('jumper')) return 'length';
  if (item.otDynamic === 'empty') return '';
  return '';
}

export function evaluateMetradoFormula(formula: string, vars: MetradoVars): MetradoResult {
  const raw = formula.trim();
  if (!raw || /^var\.?$/i.test(raw)) return { status: 'blank' };
  const normalized = raw.replace(/×/g, '*').replace(/\bx\b/gi, '*').replace(/,/g, '.');
  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    return numberResult(Number(normalized));
  }
  try {
    const value = new Parser(normalized.replace(/\s+/g, ''), vars).parse();
    return numberResult(value);
  } catch (err) {
    if (err instanceof NeedsInput) return { status: 'needs-input' };
    return { status: 'needs-input' };
  }
}

function numberResult(number: number): MetradoResult {
  if (!Number.isFinite(number)) return { status: 'needs-input' };
  return { status: 'value', number, text: String(parseFloat(number.toFixed(4))) };
}

class NeedsInput extends Error {}

class Parser {
  private i = 0;
  private missing = false;

  constructor(
    private readonly s: string,
    private readonly vars: MetradoVars
  ) {}

  parse(): number {
    const value = this.expr();
    if (this.i !== this.s.length) throw new Error('bad');
    if (this.missing) throw new NeedsInput();
    return value;
  }

  private expr(): number {
    let value = this.term();
    while (this.s[this.i] === '+' || this.s[this.i] === '-') {
      const op = this.s[this.i++];
      const right = this.term();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  }

  private term(): number {
    let value = this.unary();
    while (this.s[this.i] === '*' || this.s[this.i] === '/') {
      const op = this.s[this.i++];
      const right = this.unary();
      value = op === '*' ? value * right : value / right;
    }
    return value;
  }

  private unary(): number {
    if (this.s[this.i] === '-') {
      this.i += 1;
      return -this.unary();
    }
    return this.factor();
  }

  private factor(): number {
    if (this.s.slice(this.i, this.i + 5).toLowerCase() === 'ceil(') {
      this.i += 5;
      const value = this.expr();
      if (this.s[this.i] !== ')') throw new Error('bad');
      this.i += 1;
      return Math.ceil(value);
    }
    if (this.s[this.i] === '(') {
      this.i += 1;
      const value = this.expr();
      if (this.s[this.i] !== ')') throw new Error('bad');
      this.i += 1;
      return value;
    }
    const ident = /^[a-zA-Z]+/.exec(this.s.slice(this.i));
    if (ident) {
      const name = ident[0].toLowerCase();
      this.i += ident[0].length;
      if (name !== 'length' && name !== 'soportes' && name !== 'jumpers') throw new Error('bad');
      const value = this.vars[name];
      if (value === undefined || !Number.isFinite(value)) {
        this.missing = true;
        return 0;
      }
      return value;
    }
    const num = /^\d+(\.\d+)?/.exec(this.s.slice(this.i));
    if (!num) throw new Error('bad');
    this.i += num[0].length;
    return Number(num[0]);
  }
}

export function lengthVar(raw: string | number | undefined): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const text = String(raw).trim().replace(',', '.');
  if (!text) return undefined;
  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
}

export function recalculateInstanceLength(
  items: TakeoffItem[],
  instanceId: string,
  length: number,
  rule: TakeoffRule | undefined,
  variantItems: DetalleVariantItem[] | undefined
): TakeoffItem[] {
  return items.map(sib => {
    if (sib.instanceId !== instanceId) return sib;
    const desc = sib.desc.trim().toUpperCase();
    const sub = rule?.subitems.find(item => item.desc.trim().toUpperCase() === desc);
    let formula = sub && rule ? shownFormula(sub, rule.trigger) : rule ? builtinMetradoFormula(sib.desc, rule.trigger) : '';
    const variant = variantItems?.find(item => item.desc.trim().toUpperCase() === desc);
    if (variant) {
      const variantFormula = shownVariantFormula(variant);
      if (variantFormula) formula = variantFormula;
    }
    if (!/\blength\b/i.test(formula)) return sib;
    const result = evaluateMetradoFormula(formula, { length });
    if (result.status !== 'value') return sib;
    return { ...sib, metradoOt: result.text, qty: result.number };
  });
}
