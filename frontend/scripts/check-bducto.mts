import { expandBducto, parseSourceBlock, splitSticks, unionsPerVia } from '../src/entities/bducto/model/expandBducto.ts';

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

const curve = rows.find(row => row.kind === 'curve');
assert(curve?.tagUnico === '3300LY028.BD.K.1.9' && curve.metrado === 2.24 && curve.longitudM === 1.12, 'curve');
assert(rows.filter(row => row.kind === 'curve').length === 1, 'zero and foreign curves dropped');

const cinta = rows.find(row => row.kind === 'cinta');
assert(cinta?.tagUnico === '' && cinta.longitudM === 19.3 && cinta.cantXd === 1 && cinta.metrado === 19.3, 'cinta');
assert(cinta?.descripcion === 'CINTA DE RIESGO ELECTRICO COLOR ROJO', 'cinta name');

const union = rows.find(row => row.kind === 'union');
assert(union?.longitudM === 6 && union.cantXd === 12 && union.metrado === 72 && union.tagUnico === '', 'union');

assert(rows.find(row => row.kind === 'terminal')?.metrado === 24, 'terminal');
assert(rows.find(row => row.kind === 'adaptador')?.metrado === 4, 'adaptador');
assert(rows.map(row => row.kind).join(',') === 'conduit,conduit,conduit,conduit,conduit,conduit,conduit,elevation,curve,cinta,terminal,union,adaptador', rows.map(row => row.kind).join(','));

assert(JSON.stringify(splitSticks(6.1)) === JSON.stringify([3.05, 3.05]), 'exact multiple');
assert(unionsPerVia(6.1) === 2, 'union on exact multiple');
assert(splitSticks(2.2).length === 1 && splitSticks(2.2)[0] === 2.2, 'short run');
assert(unionsPerVia(2.2) === 0, 'no union under 3.05');

const pasted = parseSourceBlock('PLANO\tTAG EN PLANO\tQuantity\nP22-DA-3300-07-LY-028\t15 VIAS, 6", BD.I.1\t56.3');
assert(pasted.errors.length === 0 && pasted.rows[0].quantity === 56.3, JSON.stringify(pasted));
const longRun = splitSticks(56.3);
assert(longRun.length === 19 && longRun[18] === 1.4 && unionsPerVia(56.3) === 18, JSON.stringify(longRun));

console.log('bducto checks ok');
