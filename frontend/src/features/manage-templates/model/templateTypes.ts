export type TemplateKey = 'metrado_pat' | 'partidas_master' | 'bductos';

export interface ExcelTemplateRecord {
  id: TemplateKey;
  name: string;
  file_name: string;
  file_data: string; // Base64 encoded .xlsx
  file_size: number; // In bytes
  updated_by?: string;
  updated_at?: string;
}

export interface TemplateDefinition {
  key: TemplateKey;
  name: string;
  defaultFileName: string;
  description: string;
  sectionBadge: 'PAT' | 'SICME / PARTIDAS' | 'BANCODUCTOS';
}

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    key: 'metrado_pat',
    name: 'Plantilla de Metrado PAT',
    defaultFileName: 'plantilla_metrado_epc.xlsx',
    description: 'Pestañas: 1. MECHAS (2-0 AWG) y 2. CABLES_BARRAS_OTROS (4/0 AWG, Barras, Soldaduras, Pozos).',
    sectionBadge: 'PAT'
  },
  {
    key: 'partidas_master',
    name: 'Plantilla de Partidas Master',
    defaultFileName: 'plantilla_partidas_master.xlsx',
    description: 'Catálogo de Partidas SICME, Balance WBS, Códigos de Item y Descripciones maestras.',
    sectionBadge: 'SICME / PARTIDAS'
  },
  {
    key: 'bductos',
    name: 'Plantilla de Bancoductos',
    defaultFileName: 'plantilla_bductos.xlsx',
    description: 'Columnas: PLANO, DESDE, HASTA, TAG EN PLANO y LONGITUD TUBERÍA.',
    sectionBadge: 'BANCODUCTOS'
  }
];

