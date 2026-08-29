import { TakeoffRule } from '../types/takeoff';

export const SEED_RULES: TakeoffRule[] = [
  {
    id: 'r1',
    trigger: 'CABLE DESNUDO 4/0 AWG',
    detalle: '167/G1',
    tagPrefix: 'C',
    subitems: [
      { id: 's1', desc: 'CABLE DESNUDO 4/0 AWG', qty: 1, unit: 'm' },
      { id: 's2', desc: 'CINTA AMARILLA', qty: 1, unit: 'm' },
      { id: 's3', desc: 'TIERRA DE CULTIVO', qty: 'length x 0.375 x 0.5', unit: 'm3' },
    ]
  },
  {
    id: 'r2',
    trigger: 'CABLE DESNUDO 2/0 AWG',
    detalle: '151',
    tagPrefix: 'M',
    subitems: [
      { id: 's4', desc: 'CABLE DESNUDO 2/0 AWG', qty: 1, unit: 'm' },
      { id: 's5', desc: 'TUBERIA PVC SCH 80 Ø3/4"', qty: 1, unit: 'm' }
    ]
  },
  {
    id: 'r3',
    trigger: 'POZO CON CAJA REGISTRO',
    tagPrefix: 'PC',
    subitems: [
      { id: 's8', desc: 'POZO CON CAJA REGISTRO', qty: 1, unit: 'und' },
      { id: 's9', desc: 'CEMENTO GEM (11.3 kg x bls)', qty: 1, unit: 'kg' },
      { id: 's10', desc: 'CAJA REGISTRO 400 x 400 x 300 mm', qty: 1, unit: 'und' },
      { id: 's11', desc: 'VARILLA COPPERWELD 3/4"X2.4M', qty: 1, unit: 'und' },
      { id: 's12', desc: 'CONECTOR GK 1429', qty: 1, unit: 'und' },
      { id: 's13', desc: 'TIERRA DE CULTIVO', qty: 4.71, unit: 'm3' },
    ]
  },
  {
    id: 'r4',
    trigger: 'POZO SIN CAJA REGISTRO',
    tagPrefix: 'PS',
    subitems: [
      { id: 's13b', desc: 'POZO SIN CAJA REGISTRO', qty: 1, unit: 'und' },
      { id: 's14', desc: 'CEMENTO GEM (11.3 kg x bls)', qty: 1, unit: 'kg' },
      { id: 's15', desc: 'VARILLA COPPERWELD 3/4"X2.4M', qty: 1, unit: 'und' },
      { id: 's16', desc: 'SOLDADURA GT', qty: 1, unit: 'und' },
      { id: 's17', desc: 'CARGA 115', qty: 1, unit: 'und' },
      { id: 's18', desc: 'MOLDE M-561', qty: 0.0167, unit: 'und' },
      { id: 's19', desc: 'TIERRA DE CULTIVO', qty: 4.71, unit: 'm3' },
    ]
  },
  {
    id: 'r5',
    trigger: 'SOLDADURA T 4/0',
    detalle: '008/4T1',
    tagPrefix: 'T',
    subitems: [
      { id: 's20', desc: 'SOLDADURA T 4/0', qty: 1, unit: 'und' },
      { id: 's21', desc: 'CARGA 150', qty: 1, unit: 'und' },
      { id: 's22', desc: 'MOLDE TAC2Q2Q', qty: 0.0167, unit: 'und' },
    ]
  },
  {
    id: 'r6',
    trigger: 'SOLDADURA T 4/0 -2/0',
    detalle: '008/4T2',
    tagPrefix: 'TT',
    subitems: [
      { id: 's23', desc: 'SOLDADURA T 4/0 -2/0', qty: 1, unit: 'und' },
      { id: 's24', desc: 'CARGA 90', qty: 1, unit: 'und' },
      { id: 's25', desc: 'MOLDE TAC2Q2G', qty: 0.0167, unit: 'und' },
    ]
  },
  {
    id: 'r7',
    trigger: 'SOLDADURA X 4/0',
    tagPrefix: 'X',
    subitems: [
      { id: 's26', desc: 'SOLDADURA X 4/0', qty: 1, unit: 'und' },
      { id: 's27', desc: 'CARGA 250', qty: 1, unit: 'und' },
      { id: 's28', desc: 'MOLDE XBM2Q2Q', qty: 0.0167, unit: 'und' },
    ]
  },
  {
    id: 'r8',
    trigger: 'BARRA POT',
    detalle: '166',
    tagPrefix: 'BP',
    subitems: [
      { id: 'sbp', desc: 'BARRA POT', qty: 1, unit: 'und' }
    ]
  },
  {
    id: 'r9',
    trigger: 'BARRA INST',
    detalle: '166C',
    tagPrefix: 'BI',
    subitems: [
      { id: 'sbi1', desc: 'BARRA INST', qty: 1, unit: 'und' },
      { id: 'sbi2', desc: 'AISLADOR DE RESINA TIPO BARRIL', qty: 1, unit: 'und' }
    ]
  }
];

export function getDefaultTagPrefixByRule(trigger: string): string {
  const up = (trigger || '').toUpperCase().trim();
  if (
    up.includes('SOLDADURA T 4/0 -2/0') ||
    up.includes('SOLDADURA T 4/0-2/0') ||
    up.includes('SOLDADURA T 4/0  - 2/0') ||
    up.includes('SOLDADURA T 4/0 - 2/0')
  ) {
    return 'TT';
  }
  if (up === 'SOLDADURA T 4/0' || up.startsWith('SOLDADURA T 4/0')) {
    return 'T';
  }
  if (up.includes('SOLDADURA X')) {
    return 'X';
  }
  if (up.includes('POZO CON CAJA')) {
    return 'PC';
  }
  if (up.includes('POZO SIN CAJA') || up.includes('POZO')) {
    return 'PS';
  }
  if (up.includes('CABLE DESNUDO 4/0')) {
    return 'C';
  }
  if (up.includes('CABLE DESNUDO 2/0')) {
    return 'M';
  }
  if (up.includes('BARRA POT')) {
    return 'BP';
  }
  if (up.includes('BARRA INST')) {
    return 'BI';
  }
  return '';
}

export function getDefaultDetalleByRule(trigger: string, activeArea = 'AREA SECA'): string {
  const up = (trigger || '').toUpperCase().trim();
  if (
    up.includes('SOLDADURA T 4/0 -2/0') ||
    up.includes('SOLDADURA T 4/0-2/0') ||
    up.includes('SOLDADURA T 4/0  - 2/0') ||
    up.includes('SOLDADURA T 4/0 - 2/0')
  ) {
    return '008/4T2';
  }
  if (up === 'SOLDADURA T 4/0' || up.startsWith('SOLDADURA T 4/0')) {
    return '008/4T1';
  }
  if (up.includes('CABLE DESNUDO 4/0')) {
    return '167/G1';
  }
  if (up.includes('CABLE DESNUDO 2/0')) {
    return activeArea === 'AREA HUMEDA' ? 'ND' : '151';
  }
  if (up.includes('BARRA POT')) {
    return activeArea === 'AREA HUMEDA' ? '010/17A' : '166';
  }
  if (up.includes('BARRA INST')) {
    return activeArea === 'AREA HUMEDA' ? '010/17C' : '166C';
  }
  return '';
}

export const SEED_CANALIZADO_RULES: TakeoffRule[] = [
  {
    id: 'can-r001-ext',
    trigger: 'DETALLE 001/1 - TRAPECIO - AREA EXTERIOR',
    subitems: [
      { id: 'can-s001', desc: 'VARILLA ROSCADA DE ACERO GALVANIZADO REVESTIDO DE PVC DE 13mm (1/2")Ø, CAT. N°PBH193–1/2x10, MCA. CROUSE HINDS O SIMILAR.', qty: 2.2, unit: 'und' },
      { id: 'can-s002', desc: 'TUERCA HEXAGONAL DE ACERO INOXIDABLE DE 1/2"Ø.', qty: 10, unit: 'und' },
      { id: 'can-s003', desc: 'ARANDELA PLANA DE ACERO INOXIDABLE, DE 1/2"Ø.', qty: 10, unit: 'und' },
      { id: 'can-s004', desc: 'ARANDELA PRESIÓN DE ACERO INOXIDABLE, DE 1/2"Ø.', qty: 6, unit: 'und' },
      { id: 'can-s005', desc: 'RIEL PERFORMADO DE ACERO GALVANIZADO CON CUBIERTA EXTERIOR DE PVC, CAT. PBSH1000–10, MCA. CROUSE HINDS O SIMILAR. VER TABLA N°1', qty: 1.7, unit: 'und' },
      { id: 'can-s006', desc: 'TORNILLO CABEZA HEXAGONAL DE ACERO INOXIDABLE DE 1/2"Ø.', qty: 4, unit: 'und' },
      { id: 'can-s007', desc: 'TUERCA CON RESORTE DE ACERO GALVANIZADO DE 1/2"Ø, CON CUBIERTA EXTERIOR DE PVC E INTERIOR DE URETANO, CAT. PBB911–1/2 MCA. CROUSE HINDS O SIMILAR.', qty: 4, unit: 'und' },
      { id: 'can-s008', desc: 'MORDAZA DE ACERO GALVANIZADO PARA BANDEJA (CLEMA) DE 2 1/4", CAT. 9A–1205 MCA. B–LINE O SIMILAR.', qty: 4, unit: 'und' },
      { id: 'can-s009', desc: 'PLACA DE CONEXIÓN PLANA DE ACERO GALVANIZADO REVESTIDO EN PVC DE 1/2", CAT. PBB914 1/2 MCA. CROUSE HINDS O SIMILAR.', qty: 6, unit: 'und' },
      { id: 'can-s010', desc: 'TACO DE EXPANSIÓN DE ACERO INOXIDABLE 1/2"Ø. (NOTA 4)', qty: 2, unit: 'und' }
    ]
  },
  {
    id: 'can-r001-cor',
    trigger: 'DETALLE 001/1 - TRAPECIO - AREA ALTA CORROSIVA',
    subitems: [
      { id: 'can-s011', desc: 'VARILLA ROSCADA DE ACERO INOXIDABLE NORMA AISI 316, DE (1/2")Ø, CAT. N°HTH050 ST, MCA. UNISTRUT O SIMILAR.', qty: 2.2, unit: 'und' },
      { id: 'can-s012', desc: 'TUERCA HEXAGONAL DE ACERO INOXIDABLE DE 1/2"Ø.', qty: 10, unit: 'und' },
      { id: 'can-s013', desc: 'ARANDELA PLANA DE ACERO INOXIDABLE, DE 1/2"Ø.', qty: 10, unit: 'und' },
      { id: 'can-s014', desc: 'ARANDELA PRESIÓN DE ACERO INOXIDABLE, DE 1/2"Ø O 3/8" SEGÚN APLIQUE.', qty: 6, unit: 'und' },
      { id: 'can-s015', desc: 'RIEL PREFORMADO DE ACERO INOXIDABLE NORMA AISI 316, CAT. P1000T–10ST, MCA. UNISTRUT O SIMILAR. (VER TABLA N°1)', qty: 1.7, unit: 'und' },
      { id: 'can-s016', desc: 'TORNILLO CABEZA HEXAGONAL DE ACERO INOXIDABLE DE 3/8"Ø.', qty: 4, unit: 'und' },
      { id: 'can-s017', desc: 'TUERCA CON RESORTE DE ACERO INOXIDABLE NORMA AISI 316 DE 1/2"Ø O 3/8" SEGÚN APLIQUE, CAT. P1010M12 O P1008M10 MCA. UNISTRUT O SIMILAR.', qty: 4, unit: 'und' },
      { id: 'can-s018', desc: 'MORDAZA DE FIBRA DE VIDRIO PARA BANDEJA (CLEMA) PARA HERRAJE DE 3/8", CAT. 9F–1208 MCA. B–LINE O SIMILAR.', qty: 4, unit: 'und' },
      { id: 'can-s019', desc: 'PLACA DE CONEXIÓN PLANA DE ACERO INOXIDABLE NORMA AISI 316, 1/2", CAT. P1064ST, MCA. UNISTRUT O SIMILAR.', qty: 6, unit: 'und' },
      { id: 'can-s020', desc: 'TACO DE EXPANSIÓN DE ACERO INOXIDABLE 1/2"Ø. (NOTA 4)', qty: 2, unit: 'und' }
    ]
  },
  {
    id: 'can-r002-ext',
    trigger: 'DETALLE 001/2B - LATERAL - AREA EXTERIOR',
    subitems: [
      { id: 'can-s021', desc: 'SOPORTE MURO DOBLE LONG. VER TABLA 1, ACERO INOXIDABLE 316 FABRICADO CON PLACA BASE PARA FIJACIÓN 1/2"Ø, DE UNISTRUT O SIMILAR.', qty: 0.76, unit: 'und' },
      { id: 'can-s022', desc: 'RIEL PREFORMADO DE ACERO GALVANIZADO CON CUBIERTA EXTERIOR DE PVC, CAT. PBSH1000-10, MCA. CROUSE HINDS O SIMILAR.', qty: 0.5, unit: 'und' },
      { id: 'can-s023', desc: 'TACO DE EXPANSIÓN 1/2"Ø x 6" LONG. INC. TUERCA Y ARANDELA PLANA, ACERO INOXIDABLE 316 DE HILTI O SIMILAR.', qty: 2, unit: 'und' },
      { id: 'can-s024', desc: 'ARANDELA PLANA 1/2"Ø, ACERO INOXIDABLE 316.', qty: 4, unit: 'und' },
      { id: 'can-s025', desc: 'ARANDELA PRESIÓN 1/2" ACERO INOXIDABLE 316.', qty: 2, unit: 'und' },
      { id: 'can-s026', desc: 'TUERCA CON RESORTE 1/2" PARA RIEL UNISTRUT, ACERO INOXIDABLE 316, REF. P1010, DE UNISTRUT.', qty: 4, unit: 'und' },
      { id: 'can-s027', desc: 'PERNO CABEZA HEX. 1/2"Ø x 1-3/16 ACERO INOXIDABLE 316.', qty: 2, unit: 'und' },
      { id: 'can-s028', desc: 'MORDAZA DE FIJACIÓN ESCALERILLA, REF. 9G-1208 DE B-LINE O SIMILAR, ACERO INOXIDABLE 316.', qty: 2, unit: 'und' },
      { id: 'can-s029', desc: 'PERNO MAQUINADO 1/2"Ø x 1" CABEZA REDONDA 13 UNC Y DOS ARANDELAS (PLANA Y PRESIÓN), ACERO INOXIDABLE 316.', qty: 2, unit: 'und' }
    ]
  },
  {
    id: 'can-r002-cor',
    trigger: 'DETALLE 001/2B - LATERAL - AREA ALTA CORROSIVA',
    subitems: [
      { id: 'can-s030', desc: 'SOPORTE MURO DOBLE LONG. VER TABLA 1, ACERO INOXIDABLE 316 FABRICADO CON PLACA BASE PARA FIJACIÓN 1/2Ø, DE UNISTRUT O SIMILAR.', qty: 0.76, unit: 'und' },
      { id: 'can-s031', desc: 'RIEL PREFORMADO DE ACERO INOXIDABLE NORMA AISI 316, CAT. P1000T-10ST, MCA. UNISTRUT O SIMILAR.', qty: 0.5, unit: 'und' },
      { id: 'can-s032', desc: 'TACO DE EXPANSIÓN 1/2"Ø x 6" LONG. INC. TUERCA Y ARANDELA PLANA, ACERO INOXIDABLE 316 DE HILTI O SIMILAR.', qty: 2, unit: 'und' },
      { id: 'can-s033', desc: 'ARANDELA PLANA DE ACERO INOXIDABLE, DE 1/2"Ø.', qty: 2, unit: 'und' },
      { id: 'can-s034', desc: 'ARANDELA PRESIÓN DE ACERO INOXIDABLE, DE 1/2"Ø.', qty: 4, unit: 'und' },
      { id: 'can-s035', desc: 'TUERCA CON RESORTE 1/2" PARA RIEL UNISTRUT, ACERO INOXIDABLE 316, REF. P1010, DE UNISTRUT.', qty: 4, unit: 'und' },
      { id: 'can-s036', desc: 'PERNO CABEZA HEX. 1/2"Ø x 1-3/16 ACERO INOXIDABLE.', qty: 2, unit: 'und' },
      { id: 'can-s037', desc: 'MORDAZA DE FIJACIÓN ESCALERILLA, REF. 9G-1208 DE B-LINE O SIMILAR, ACERO INOXIDABLE 316.', qty: 2, unit: 'und' },
      { id: 'can-s038', desc: 'PERNO MAQUINADO 1/2"Ø x 1" CABEZA REDONDA 13 UNC Y DOS ARANDELAS (PLANA Y PRESIÓN), ACERO INOXIDABLE 316.', qty: 2, unit: 'und' }
    ]
  }
];

