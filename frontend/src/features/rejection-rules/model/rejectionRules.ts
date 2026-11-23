/**
 * Rejection Rules catalog — single source of truth for every import-time
 * validation that can reject an Excel row.
 *
 * Design goals (per user decision):
 * - ALL imports covered: metrado PAT, bductos, reglas-maestro, partidas.
 * - Full config per rule: editable message + on/off + parameters.
 * - Persisted in Supabase table `rejection_rules` (see repo-root
 *   `supabase_rejection_rules_migration.sql`); localStorage is only an
 *   offline cache, mirroring how variant caches work.
 *
 * Parameters are a free-form record so each rule can expose its own knobs:
 *   - planoPattern: regex string used for PLANO shape validation.
 *   - tagPrefixes: comma string like "M,C,BP,BI,T,TT,X,PC,PS".
 *   - detalleRequiredForOrigins / variantDetalleRequired: booleans.
 *   - allowFilePlanoPropagation / requirePlano: booleans.
 */

export type RejectionRuleScope = 'metrado' | 'bductos' | 'reglas_maestro' | 'partidas';

export interface RejectionRuleParamDef {
  key: string;
  label: string;
  type: 'text' | 'boolean' | 'number';
  hint?: string;
}

export interface RejectionRule {
  /** Stable id, also the Supabase PK (e.g. "metrado.plano_required"). */
  id: string;
  scope: RejectionRuleScope;
  /** Short name shown in the UI list. */
  name: string;
  /** What this rule checks, shown as helper text. */
  description: string;
  /** Whether the check is currently enforced. */
  enabled: boolean;
  /** MOTIVO_RECHAZO text written into rejection reports. Supports {placeholders}. */
  message: string;
  /** Editable knobs consumed by the validation code. */
  params: Record<string, string | boolean | number>;
  /** Parameter editor schema for the UI. */
  paramDefs: RejectionRuleParamDef[];
  updatedAt?: string;
}

export const REJECTION_RULE_SCOPES: Array<{ value: RejectionRuleScope; label: string }> = [
  { value: 'metrado', label: 'Metrado PAT' },
  { value: 'bductos', label: 'Bductos' },
  { value: 'reglas_maestro', label: 'Reglas Maestro' },
  { value: 'partidas', label: 'Partidas' }
];

export function scopeLabel(scope: RejectionRuleScope): string {
  return REJECTION_RULE_SCOPES.find(s => s.value === scope)?.label || scope;
}

/** Built-in defaults. Seeded into the store (and Supabase) on first run. */
export function defaultRejectionRules(): RejectionRule[] {
  return [
    // ---------------------------------------------------------------- METRADO
    {
      id: 'metrado.plano_required',
      scope: 'metrado',
      name: 'PLANO requerido',
      description: 'Rechaza la fila si no hay plano ni en la fila, ni propagado del archivo, ni en la barra superior.',
      enabled: true,
      message: 'PLANO es requerido (indicar en el archivo o en la barra superior)',
      params: { requirePlano: true, allowFilePlanoPropagation: true },
      paramDefs: [
        { key: 'requirePlano', label: 'Exigir plano', type: 'boolean', hint: 'Si se apaga, las filas sin plano se aceptan.' },
        { key: 'allowFilePlanoPropagation', label: 'Propagar plano del archivo', type: 'boolean', hint: 'Usa el primer plano válido del archivo para filas sin plano.' }
      ]
    },
    {
      id: 'metrado.plano_shape',
      scope: 'metrado',
      name: 'Forma del PLANO',
      description: 'Valida que el plano tenga la forma de plano de dibujo (p. ej. P22-DA-3400-07-LY-014).',
      enabled: true,
      message: 'PLANO debe tener la forma P22-DA-3400-07-LY-014',
      params: { planoPattern: '^P\\d+-[A-Z]+-\\d+-\\d+-[A-Z]+-\\d+$' },
      paramDefs: [
        { key: 'planoPattern', label: 'Patrón regex del plano', type: 'text', hint: 'Se evalúa en mayúsculas. Vacío = cualquier texto no vacío vale.' }
      ]
    },
    {
      id: 'metrado.tag_prefix',
      scope: 'metrado',
      name: 'Prefijo de TAG válido',
      description: 'El TAG debe empezar con uno de los prefijos conocidos para resolver la regla de metrado.',
      enabled: true,
      message: 'Prefijo no reconocido (debe comenzar con {prefixes})',
      params: { tagPrefixes: 'M,C,BP,BI,T,TT,X,PC,PS' },
      paramDefs: [
        { key: 'tagPrefixes', label: 'Prefijos permitidos', type: 'text', hint: 'Lista separada por comas. Orden: los más largos primero (TT antes que T).' }
      ]
    },
    {
      id: 'metrado.length_numeric',
      scope: 'metrado',
      name: 'Longitud numérica',
      description: 'La columna LONGITUD_CABLE / CANTIDAD debe ser un número (salvo soldaduras, pozos y barras que usan 1 por defecto).',
      enabled: true,
      message: 'Valor no numérico en columna LONGITUD_CABLE',
      params: { autoDefaultForTags: 'SOLDADURA,POZO,BARRA' },
      paramDefs: [
        { key: 'autoDefaultForTags', label: 'Auto-1 para reglas que contienen', type: 'text', hint: 'Si la regla contiene uno de estos textos, longitud vacía = 1.' }
      ]
    },
    {
      id: 'metrado.rule_exists',
      scope: 'metrado',
      name: 'Regla existe',
      description: 'El prefijo del TAG debe resolver a una regla de metrado cargada en la configuración actual.',
      enabled: true,
      message: 'Regla de metrado "{rule}" no encontrada en la configuración actual',
      params: {},
      paramDefs: []
    },
    {
      id: 'metrado.detalle_known',
      scope: 'metrado',
      name: 'DETALLE conocido',
      description: 'Si la fila trae DETALLE explícito, debe existir en alguna regla del catálogo.',
      enabled: true,
      message: 'DETALLE "{detalle}" no existe en ninguna regla',
      params: { skipBlankDetalle: true },
      paramDefs: [
        { key: 'skipBlankDetalle', label: 'Omitir si DETALLE vacío', type: 'boolean', hint: 'Vacío usa el detalle por defecto del área; con esto en SI no se rechaza.' }
      ]
    },
    {
      id: 'metrado.tag_collision',
      scope: 'metrado',
      name: 'TAG duplicado (misma regla + plano)',
      description: 'Rechaza una segunda implementación del mismo TAG en el mismo plano para la misma regla.',
      enabled: true,
      message: 'TAG EN PLANO "{tag}" ya está implementado en {plano} para esta regla. Cada implementación debe tener un TAG distinto. Cambio rechazado.',
      params: {},
      paramDefs: []
    },
    // ---------------------------------------------------------------- BDUCTOS
    {
      id: 'bductos.header_columns',
      scope: 'bductos',
      name: 'Columnas obligatorias',
      description: 'La hoja debe contener las columnas PLANO, TAG EN PLANO y LONGITUD TUBERÍA.',
      enabled: true,
      message: 'No encontré las columnas PLANO, TAG EN PLANO y LONGITUD TUBERÍA.',
      params: {},
      paramDefs: []
    },
    {
      id: 'bductos.length_positive',
      scope: 'bductos',
      name: 'Longitud mayor que 0',
      description: 'La longitud del tramo debe ser un número mayor que cero.',
      enabled: true,
      message: 'La longitud debe ser mayor que 0.',
      params: { minLength: 0 },
      paramDefs: [
        { key: 'minLength', label: 'Longitud mínima (m)', type: 'number', hint: 'Valores ≤ mínimo se rechazan.' }
      ]
    },
    {
      id: 'bductos.plano_shape',
      scope: 'bductos',
      name: 'Forma del PLANO',
      description: 'Valida que el plano tenga la forma de plano de dibujo de bancoductos.',
      enabled: true,
      message: 'El plano debe tener la forma P22-DA-3300-07-LY-028.',
      params: { planoPattern: '^P\\d+-[A-Z]+-\\d+-\\d+-[A-Z]+-\\d+$' },
      paramDefs: [
        { key: 'planoPattern', label: 'Patrón regex del plano', type: 'text', hint: 'Se evalúa en mayúsculas.' }
      ]
    },
    {
      id: 'bductos.tag_shape',
      scope: 'bductos',
      name: 'Forma del TAG EN PLANO',
      description: 'El tag debe tener la forma "N VIAS, diámetro, BANCO" (p. ej. 2 VIAS, 2", E.1).',
      enabled: true,
      message: 'El tag debe tener la forma 1 VIA, 2", BD.A.1 o 2 VIAS, 2", E.1.',
      params: {},
      paramDefs: []
    },
    {
      id: 'bductos.empty_file',
      scope: 'bductos',
      name: 'Archivo sin tramos',
      description: 'Si no se reconoce ninguna fila válida, el archivo se rechaza completo.',
      enabled: true,
      message: 'El Excel no tiene tramos.',
      params: {},
      paramDefs: []
    },
    // ---------------------------------------------------------- REGLAS MAESTRO
    {
      id: 'reglas_maestro.empty_sheet',
      scope: 'reglas_maestro',
      name: 'Hoja vacía',
      description: 'La hoja debe tener al menos una fila de datos además de la cabecera.',
      enabled: true,
      message: 'La hoja está vacía o no contiene filas de datos',
      params: {},
      paramDefs: []
    },
    {
      id: 'reglas_maestro.required_columns',
      scope: 'reglas_maestro',
      name: 'Columnas obligatorias',
      description: 'La hoja debe contener las columnas REGLA y DESCRIPCION (o sus alias).',
      enabled: true,
      message: 'No se encontraron las columnas obligatorias REGLA y DESCRIPCION',
      params: {},
      paramDefs: []
    },
    {
      id: 'reglas_maestro.regla_required',
      scope: 'reglas_maestro',
      name: 'REGLA requerida',
      description: 'Cada fila debe indicar la regla / disparador.',
      enabled: true,
      message: 'Columna REGLA vacía',
      params: {},
      paramDefs: []
    },
    {
      id: 'reglas_maestro.desc_required',
      scope: 'reglas_maestro',
      name: 'DESCRIPCION requerida',
      description: 'Cada fila debe indicar la descripción del material.',
      enabled: true,
      message: 'Falta DESCRIPCION en regla "{rule}"',
      params: {},
      paramDefs: []
    },
    {
      id: 'reglas_maestro.variant_detalle_required',
      scope: 'reglas_maestro',
      name: 'DETALLE en variantes',
      description: 'Las filas de variantes (CABLE_2_0, BARRA_POT, BARRA_INST) exigen código DETALLE.',
      enabled: true,
      message: 'Variante {origen} requiere código DETALLE',
      params: {},
      paramDefs: []
    },
    // ---------------------------------------------------------------- PARTIDAS
    {
      id: 'partidas.no_sheets',
      scope: 'partidas',
      name: 'Archivo sin hojas',
      description: 'El Excel debe contener al menos una hoja de cálculo.',
      enabled: true,
      message: 'El archivo Excel no contiene hojas de cálculo.',
      params: {},
      paramDefs: []
    },
    {
      id: 'partidas.empty_sheet',
      scope: 'partidas',
      name: 'Hoja vacía',
      description: 'La primera hoja debe tener al menos una fila de datos.',
      enabled: true,
      message: 'La hoja de cálculo está vacía.',
      params: {},
      paramDefs: []
    },
    {
      id: 'partidas.no_valid_rows',
      scope: 'partidas',
      name: 'Sin registros válidos',
      description: 'Al menos una fila debe aportar SICME, balance o descripción.',
      enabled: true,
      message: 'No se encontraron registros de partidas válidos en el archivo Excel.',
      params: {},
      paramDefs: []
    }
  ];
}

/** Fills {placeholders} in a rule message. Unknown keys are left as-is. */
export function renderRuleMessage(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? match : String(value);
  });
}
