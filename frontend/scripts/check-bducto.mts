import { applyBductoField, applyBductoGroupField } from '../src/entities/bducto/model/bductoEdit.ts';
import { tramosToAdd, withoutRepeatedUpload } from '../src/features/generate-bducto/model/importTramos.ts';
import { expandBducto, parseBductoSheet, parseSourceBlock, promptFromRows, splitSticks, unionsPerVia } from '../src/entities/bducto/model/expandBducto.ts';
import { curveDescription, curvesForDiameter, getCurveCatalog } from '../src/entities/bducto/model/catalog.ts';
import { mapBductoRowToRecord, mapCurveToRecord } from '../src/entities/bducto/model/bductoRecord.ts';
import { cellsInRect, extendSelection } from '../src/widgets/takeoff-table/model/cellRange.ts';
import { parseIntegerInput, parseLengthInput, sanitizeIntegerInput, sanitizeLengthInput } from '../src/features/generate-bducto/model/promptNumber.ts';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

let n = 0;
const source = {
  id: 's1',
  plano: 'P22-DA-3300-07-LY-028',
  tagEnPlano: '12 VIAS, 6", BD.K.1',
  quantity: 19.3
};

const result = expandBducto(
  source,
  {
    desde: '300-mh-015',
    hasta: '300-MH-016',
    terminalCount: 24,
    unionCount: 12,
    adaptadorCount: 4,
    curves: [
      { catalogId: 'c90-r30-d6', lengthM: 1.12, quantity: 2 },
      { catalogId: 'c90-r36-d6', lengthM: 1.05, quantity: 0 },
      { catalogId: 'c90-r15-d2', lengthM: 0.65, quantity: 3 }
    ],
    elevations: [
      { lengthM: 0.4, quantity: 5 },
      { lengthM: 0, quantity: 5 }
    ]
  },
  () => `r${++n}`
);

assert(result.ok, 'expand failed');
if (!result.ok) throw new Error('unreachable');

const { rows } = result;
const tagged = rows.filter(row => row.tagUnico).map(row => row.tagUnico);
assert(tagged.join(',') === [
  '3300LY028.BD.K.1.1',
  '3300LY028.BD.K.1.2',
  '3300LY028.BD.K.1.3',
  '3300LY028.BD.K.1.4',
  '3300LY028.BD.K.1.5',
  '3300LY028.BD.K.1.6',
  '3300LY028.BD.K.1.7',
  '3300LY028.BD.K.1.8',
  '3300LY028.BD.K.1.9'
].join(','), tagged.join(','));

const conduits = rows.filter(row => row.kind === 'conduit');
assert(conduits.length === 7, 'stick count');
assert(conduits.slice(0, 6).every(row => row.longitudM === 3.05 && row.cantXd === 12 && row.metrado === 36.6), 'full sticks');
assert(conduits[6].longitudM === 1 && conduits[6].metrado === 12, 'remainder');
assert(conduits[0].descripcion === 'CONDUIT PVC SCH 40 D=6" - CERTIFICACIÓN UL', conduits[0].descripcion);
assert(conduits[0].wbs === '3300' && conduits[0].seccion === 'K', 'wbs/section');
assert(conduits[0].desde === '300-MH-015' && conduits[0].hasta === '300-MH-016', 'desde/hasta');
assert(conduits[0].partidaSicme === '' && conduits[0].rev === '' && conduits[0].sector === '', 'empty columns');

const elevation = rows.find(row => row.kind === 'elevation');
assert(elevation?.tagUnico === '3300LY028.BD.K.1.8' && elevation.metrado === 2 && elevation.cantXd === 5, 'elevation');
assert(elevation?.comentario === 'VERTICAL', 'elevation comment');
assert(conduits.every(row => row.comentario === ''), 'conduit comments stay empty');
assert(rows.filter(row => row.kind !== 'elevation').every(row => row.comentario === ''), 'only elevation is VERTICAL');

const curve = rows.find(row => row.kind === 'curve');
assert(curve?.tagUnico === '3300LY028.BD.K.1.9' && curve.metrado === 2.24 && curve.longitudM === 1.12, 'curve');
assert(rows.filter(row => row.kind === 'curve').length === 1, 'zero and foreign curves dropped');

const cinta = rows.find(row => row.kind === 'cinta');
assert(cinta?.tagUnico === '' && cinta.longitudM === 19.3 && cinta.cantXd === 1 && cinta.metrado === 19.3, 'cinta');
assert(cinta?.descripcion === 'CINTA DE RIESGO ELECTRICO COLOR ROJO', 'cinta name');

const union = rows.find(row => row.kind === 'union');
assert(union?.longitudM === 1 && union.cantXd === 12 && union.metrado === 12 && union.und === 'und' && union.tagUnico === '', 'union');
assert(union?.descripcion === 'UNION PVC SCH 40 D=6" - CERTIFICACIÓN UL', union?.descripcion);

assert(rows.find(row => row.kind === 'terminal')?.metrado === 24, 'terminal');
assert(rows.find(row => row.kind === 'adaptador')?.metrado === 4, 'adaptador');
assert(rows.map(row => row.kind).join(',') === 'conduit,conduit,conduit,conduit,conduit,conduit,conduit,terminal,union,elevation,adaptador,curve,cinta', rows.map(row => row.kind).join(','));
const elevationIndex = rows.findIndex(row => row.kind === 'elevation');
const adaptadorIndex = rows.findIndex(row => row.kind === 'adaptador');
assert(adaptadorIndex === elevationIndex + 1, 'adaptador sits next to vertical');

const recovered = promptFromRows(source, rows);
assert(recovered?.terminalCount === 24 && recovered.unionCount === 12 && recovered.adaptadorCount === 4, 'prompt recovers counts');
assert(recovered?.elevations.length === 1 && recovered.elevations[0].lengthM === 0.4 && recovered.elevations[0].quantity === 5, 'prompt recovers elevation');
assert(recovered?.curves.find(curve => curve.catalogId === 'c90-r30-d6')?.quantity === 2, 'prompt recovers 90 curve');
assert(recovered?.curves.find(curve => curve.catalogId === 'c45-r30-d6')?.quantity === 0, 'unused curve stays at 0');
assert(recovered?.desde === '300-MH-015' && recovered.hasta === '300-MH-016' && recovered.quantity === 19.3, 'prompt recovers desde/hasta');

const shortened = expandBducto(
  source,
  { desde: 'A', hasta: 'B', quantity: 6.1, terminalCount: 0, unionCount: 0, adaptadorCount: 0, curves: [], elevations: [{ lengthM: 0, quantity: 0 }] },
  () => 'id'
);
assert(shortened.ok === true, 'edited quantity');
if (shortened.ok) {
  const conduits = shortened.rows.filter(row => row.kind === 'conduit');
  const shortCinta = shortened.rows.find(row => row.kind === 'cinta');
  assert(conduits.length === 2 && conduits.every(row => row.longitudM === 3.05), 'sticks follow the edited length');
  assert(shortCinta?.longitudM === 6.1 && shortCinta.metrado === 6.1, 'cinta follows the edited length');
}

assert(JSON.stringify(splitSticks(6.1)) === JSON.stringify([3.05, 3.05]), 'exact multiple');
assert(unionsPerVia(6.1) === 2, 'union on exact multiple');
assert(splitSticks(2.2).length === 1 && splitSticks(2.2)[0] === 2.2, 'short run');
assert(unionsPerVia(2.2) === 0, 'no union under 3.05');

const pasted = parseSourceBlock('PLANO\tTAG EN PLANO\tQuantity\nP22-DA-3300-07-LY-028\t15 VIAS, 6", BD.I.1\t56.3');
assert(pasted.errors.length === 0 && pasted.rows[0].quantity === 56.3, JSON.stringify(pasted));
const longRun = splitSticks(56.3);
assert(longRun.length === 19 && longRun[18] === 1.4 && unionsPerVia(56.3) === 18, JSON.stringify(longRun));

const sheet = parseBductoSheet([
  ['DESDE', 'HASTA', 'PLANO', 'TAG EN PLANO', 'Quantity'],
  ['400-MH-008', '400-MH-009', 'P22-DA-3300-07-LY-007', '15 VIAS, 6", BD.I.1', 56.3],
  ['400-MH-007', 'STUB-UP', 'P22-DA-3300-07-LY-007', '20 VIAS, 6", BD.F.1', 2.2],
  ['400-MH-008', '400-MH-008', 'P22-DA-3300-07-LY-007', '20 VIAS, 6", BD.F.2', 2.5],
  ['STUB-UP', 'SOPLADORES', 'P22-DA-3300-07-LY-007', '3 VIAS, 6", BD.J.1', 11.9],
  ['', '', '', '', '']
]);
assert(sheet.errors.length === 0 && sheet.rows.length === 4, JSON.stringify(sheet));
const ly014 = parseBductoSheet([
  ['DESDE', 'HASTA', 'PLANO', 'TAG EN PLANO', 'Quantity'],
  ['400-MH-011', '400-PRL-005', 'P22-DA-3400-07-LY-014', '1 VIA, 2", BD.A.1', 2.2],
  ['400-MH-011', '400-LPA-003', 'P22-DA-3400-07-LY-014', '1 VIA, 2", BD.A.2', 7.8],
  ['400-MH-011', 'STUB-UP', 'P22-DA-3400-07-LY-014', '4 VIAS, 6", BD.B.1', 4.2],
  ['400-MH-011', '400-PPC-018-M', 'P22-DA-3400-07-LY-014', '1 VIA, 3", BD.C.1', 11.8],
  ['400-MH-011', '400-PPC-018-M-SST', 'P22-DA-3400-07-LY-014', '1 VIA, 2", BD.C.2', 11.8],
  ['400-MH-011', '400-PPC-019-M', 'P22-DA-3400-07-LY-014', '1 VIA, 3", BD.C.3', 9.2],
  ['400-MH-011', '400-PPC-019-M-SST', 'P22-DA-3400-07-LY-014', '1 VIA, 2", BD.C.4', 9.2],
  ['400-MH-011', '400-PPC-023-M', 'P22-DA-3400-07-LY-014', '2 VIAS, 2", E.1', 6.4],
  ['400-MH-011', '400-PPC-024-M', 'P22-DA-3400-07-LY-014', '2 VIAS, 2", E.2', 3.9]
]);
assert(ly014.errors.length === 0 && ly014.rows.length === 9, JSON.stringify(ly014));
const singular = expandBducto(
  { id: 'a1', plano: 'P22-DA-3400-07-LY-014', tagEnPlano: '1 VIA, 2", BD.A.1', quantity: 2.2 },
  { desde: '400-MH-011', hasta: '400-PRL-005', terminalCount: 0, unionCount: 1, adaptadorCount: 0, curves: [], elevations: [{ lengthM: 0, quantity: 0 }] },
  () => 'id'
);
assert(singular.ok === true, 'singular via');
if (singular.ok) {
  assert(singular.parsed.vias === 1 && singular.parsed.diameter === '2"' && singular.parsed.section === 'A' && singular.parsed.bankId === 'BD.A.1', 'via bank');
  assert(singular.rows[0].tagUnico === '3400LY014.BD.A.1.1', singular.rows[0].tagUnico);
}
const embedded = expandBducto(
  { id: 'e1', plano: 'P22-DA-3400-07-LY-014', tagEnPlano: '2 VIAS, 2", E.1', quantity: 6.4 },
  { desde: '400-MH-011', hasta: '400-PPC-023-M', terminalCount: 0, unionCount: 2, adaptadorCount: 0, curves: [], elevations: [{ lengthM: 0, quantity: 0 }] },
  () => 'id'
);
assert(embedded.ok === true, 'E.1 bank');
if (embedded.ok) {
  assert(embedded.parsed.vias === 2 && embedded.parsed.section === 'E' && embedded.parsed.bankId === 'E.1', 'E section');
  assert(embedded.rows[0].tagUnico === '3400LY014.E.1.1' && embedded.rows[0].seccion === 'E', embedded.rows[0].tagUnico);
}
const twoInch = curvesForDiameter('2"').map(curveDescription);
assert(twoInch.join('|') === [
  'CURVA 30° RADIO 15" PVC SCH 40 D=2" - CERTIFICACIÓN UL',
  'CURVA 45° RADIO 15" PVC SCH 40 D=2" - CERTIFICACIÓN UL',
  'CURVA 90° RADIO 15" PVC SCH 40 D=2" - CERTIFICACIÓN UL',
  'CURVA 90° RADIO 9.5" PVC SCH 40 D=2" - CERTIFICACIÓN UL'
].join('|'), twoInch.join(' | '));
const sixInch = curvesForDiameter('6"').map(item => `${item.angle} ${item.radius} ${item.lengthM}`);
assert(sixInch.join('|') === '30° 30" 0.44|45° 30" 0.59|90° 30" 1.12|90° 36" 1.05', sixInch.join('|'));
const twoLengths = curvesForDiameter('2"').map(item => item.lengthM);
assert(twoLengths.join('|') === '0.25|0.35|0.65|0.43', twoLengths.join('|'));
const threeInch = curvesForDiameter('3"').map(item => `${item.angle} ${item.radius} ${item.lengthM}`);
assert(threeInch.join('|') === '30° 15" 0.25|45° 15" 0.35|90° 15" 0.65|90° 9.5" 0.43', threeInch.join('|'));
assert(curvesForDiameter('1 1/2"').length === 2, 'inch filters');
const catalogRow = mapCurveToRecord(getCurveCatalog().find(item => item.id === 'c90-r15-d3')!, 0);
assert(
  catalogRow.diameter === '3"' &&
    catalogRow.length_m === 0.65 &&
    catalogRow.descripcion === 'CURVA 90° RADIO 15" PVC SCH 40 D=3" - CERTIFICACIÓN UL',
  catalogRow.descripcion
);
if (result.ok) {
  const stored = mapBductoRowToRecord(result.rows[0]);
  assert(stored.longitud_m === 3.05 && stored.kind === 'conduit' && stored.tag_unico.endsWith('.1'), stored.tag_unico);
}

assert(sheet.rows[0].desde === '400-MH-008' && sheet.rows[0].hasta === '400-MH-009' && sheet.rows[0].quantity === 56.3, 'excel first row');
assert(sheet.rows[1].hasta === 'STUB-UP' && sheet.rows[3].desde === 'STUB-UP', 'excel endpoints');

for (const sample of [
  { tag: '8 VIAS, 4", BD.I.1', vias: 8, diameter: '4"' },
  { tag: '5 VIAS, 2", BD.I.1', vias: 5, diameter: '2"' }
]) {
  const sized = expandBducto(
    { id: 'sx', plano: 'P22-DA-3300-07-LY-007', tagEnPlano: sample.tag, quantity: 6.1 },
    {
      desde: 'A',
      hasta: 'B',
      terminalCount: 1,
      unionCount: sample.vias,
      adaptadorCount: 0,
      curves: [],
      elevations: [{ lengthM: 0.4, quantity: 1 }]
    },
    () => 'id'
  );
  assert(sized.ok, sample.tag);
  if (!sized.ok) throw new Error('unreachable');
  const sizedUnion = sized.rows.find(row => row.kind === 'union');
  assert(sizedUnion?.cantXd === sample.vias && sizedUnion.descripcion === `UNION PVC SCH 40 D=${sample.diameter} - CERTIFICACIÓN UL`, sample.tag);
  const kinds = sized.rows.map(row => row.kind);
  assert(kinds.indexOf('terminal') + 1 === kinds.indexOf('union') && kinds.indexOf('union') + 1 === kinds.indexOf('elevation'), sample.tag);
}

const basePrompt = {
  desde: 'A',
  hasta: 'B',
  terminalCount: 0,
  unionCount: 0,
  elevations: [{ lengthM: 0.4, quantity: 2 }]
};
const twelve = { id: 's90', plano: 'P22-DA-3300-07-LY-028', tagEnPlano: '12 VIAS, 6", BD.K.1', quantity: 6.1 };

const obliqueOnly = expandBducto(
  twelve,
  { ...basePrompt, adaptadorCount: 12, curves: [{ catalogId: 'c45-r30-d6', lengthM: 0.59, quantity: 2 }] },
  () => 'id'
);
assert(obliqueOnly.ok && !obliqueOnly.rows.some(row => row.kind === 'adaptador'), 'no adapter without a 90 curve');

const rightAngleUnused = expandBducto(
  twelve,
  { ...basePrompt, adaptadorCount: 0, curves: [{ catalogId: 'c90-r30-d6', lengthM: 1.12, quantity: 2 }] },
  () => 'id'
);
assert(rightAngleUnused.ok && !rightAngleUnused.rows.some(row => row.kind === 'adaptador'), '90 curve can skip the adapter');

const rightAngleUsed = expandBducto(
  twelve,
  { ...basePrompt, adaptadorCount: 15, curves: [{ catalogId: 'c90-r30-d6', lengthM: 1.12, quantity: 1 }] },
  () => 'id'
);
assert(rightAngleUsed.ok, 'adapter above vias');
if (rightAngleUsed.ok) {
  const adapter = rightAngleUsed.rows.find(row => row.kind === 'adaptador');
  const kinds = rightAngleUsed.rows.map(row => row.kind);
  assert(adapter?.cantXd === 15 && adapter.metrado === 15, 'adapter can exceed vias');
  assert(kinds.indexOf('adaptador') === kinds.indexOf('elevation') + 1, 'adapter follows vertical');
}

const stick = rows.find(row => row.kind === 'conduit' && row.tagUnico.endsWith('.1'));
assert(stick, 'first stick');
if (stick) {
  const moved = applyBductoField(stick, 'plano', 'p22-da-4000-07-ly-007');
  assert(moved.ok === true, 'plano edit');
  if (moved.ok === true) {
    assert(moved.row.plano === 'P22-DA-4000-07-LY-007', moved.row.plano);
    assert(moved.row.wbs === '4000', moved.row.wbs);
    assert(moved.row.tagUnico === '4000LY007.BD.K.1.1', moved.row.tagUnico);
    assert(moved.row.descripcion === stick.descripcion, 'description stays');
  }
  const blocked = applyBductoField(stick, 'descripcion', 'OTRA COSA');
  assert(blocked.ok === false, 'description locked');
  const rev = applyBductoField(stick, 'rev', 'b');
  assert(rev.ok === true && rev.row.rev === 'B' && rev.row.tagUnico === stick.tagUnico, 'rev keeps the tag');
  const custom = applyBductoField(stick, 'tagUnico', '4000ly007.bd.k.1.9');
  assert(custom.ok === true && custom.row.tagUnico === '4000LY007.BD.K.1.9', 'tag edit');
}
const cintaRow = rows.find(row => row.kind === 'cinta');
assert(cintaRow, 'cinta row');
if (cintaRow) {
  const cintaPlano = applyBductoField(cintaRow, 'plano', 'P22-DA-4000-07-LY-007');
  assert(cintaPlano.ok === true && cintaPlano.row.tagUnico === '' && cintaPlano.row.wbs === '4000', 'untagged plano');
}
const area = cellsInRect(
  rows.slice(0, 2),
  { itemId: rows[0].id, colKey: 'plano' },
  { itemId: rows[1].id, colKey: 'tagUnico' },
  ['partidaSicme', 'plano', 'rev', 'tagUnico', 'descripcion']
);
assert(area.size === 6, `selection area ${area.size}`);
const cols = ['plano', 'rev', 'tagUnico'];
const grown = extendSelection(rows.slice(0, 3), cols, { itemId: rows[0].id, colKey: 'plano' }, null, 'ArrowDown');
assert(grown?.itemId === rows[1].id && grown.colKey === 'plano', 'shift arrow down');
const wider = extendSelection(rows.slice(0, 3), cols, { itemId: rows[0].id, colKey: 'plano' }, grown, 'ArrowRight');
assert(wider?.itemId === rows[1].id && wider.colKey === 'rev', 'shift arrow right');
const shrunk = extendSelection(rows.slice(0, 3), cols, { itemId: rows[0].id, colKey: 'plano' }, wider, 'ArrowUp');
assert(shrunk?.itemId === rows[0].id && shrunk.colKey === 'rev', 'shift arrow shrinks');

const other = { ...rows[0], id: 'other', sourceId: 'other-source', tagUnico: '3300LY028.BD.F.1.1' };
const grouped = applyBductoGroupField([...rows, other], [rows[0]], 'plano', 'P22-DA-4000-07-LY-007');
assert(grouped.ok === true, 'group plano');
if (grouped.ok === true) {
  assert(grouped.rows.length === rows.length, 'whole tramo');
  assert(grouped.rows.every(row => row.plano === 'P22-DA-4000-07-LY-007' && row.wbs === '4000'), 'group plano and wbs');
  assert(grouped.rows.find(row => row.kind === 'conduit' && row.tagUnico.endsWith('.2'))?.tagUnico === '4000LY007.BD.K.1.2', 'each tag keeps its sequence');
  assert(!grouped.rows.some(row => row.id === 'other'), 'other tramo stays out');
}
const groupedRev = applyBductoGroupField(rows, [rows[rows.length - 1]], 'rev', 'c');
assert(groupedRev.ok === true && groupedRev.rows.length === rows.length && groupedRev.rows.every(row => row.rev === 'C'), 'rev covers the tramo');
const oneTag = applyBductoGroupField(rows, [rows[0]], 'tagUnico', 'custom.1');
assert(oneTag.ok === true && oneTag.rows.length === 1 && oneTag.rows[0].tagUnico === 'CUSTOM.1', 'tag edit stays on one row');

const file = [
  { desde: 'A', hasta: 'B', plano: 'P1', tagEnPlano: '12 VIAS, 6", BD.K.1', quantity: 6.1 },
  { desde: 'B', hasta: 'C', plano: 'P1', tagEnPlano: '8 VIAS, 4", BD.I.1', quantity: 3.2 }
];
const secondUpload = tramosToAdd(file, file);
assert(secondUpload.length === 0, 'same file is not imported twice');
const withTwin = tramosToAdd(file, [...file, file[0]]);
assert(withTwin.length === 1 && withTwin[0].tagEnPlano === file[0].tagEnPlano, 'only the extra copy is added');
const doubled = [...file, ...file].map((source, index) => ({ ...source, id: `s${index}` }));
const cleaned = withoutRepeatedUpload(doubled, new Set());
assert(cleaned.length === 2 && cleaned[0].id === 's0', 'pending duplicate upload is dropped');
const kept = withoutRepeatedUpload(doubled, new Set(['s2']));
assert(kept.length === 4, 'a duplicate that already has rows stays');

assert(sanitizeIntegerInput('2.5') === '2' && sanitizeIntegerInput('12a') === '12', 'cantidad drops decimals');
assert(sanitizeLengthInput('1.234') === '1.23' && sanitizeLengthInput('0,4') === '0.4', 'longitud keeps two decimals');
assert(parseIntegerInput('3.9') === 3 && parseLengthInput('1.239') === 1.23, 'parsed limits');

console.log('bducto checks ok');
