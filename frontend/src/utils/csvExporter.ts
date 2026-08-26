import { TakeoffItem, PackageGroup } from '../types/takeoff';
import { isCountable } from './calculations';

export function exportTakeoffCsv(items: TakeoffItem[], packages: PackageGroup[], section = 'pat'): void {
  if (items.length === 0) return;

  const cols = [
    'PARTIDA',
    'MATERIAL',
    'PLANO',
    'REV',
    'TAG UNICO',
    'TAG EN PLANO',
    'DETALLE',
    'DESCRIPCION',
    'CANTIDAD',
    'METRADO OT',
    'UNIDAD',
    'NOTAS'
  ];

  const rows = items.map(it => {
    const pkg = packages.find(p => p.id === it.pkgId)?.name || 'SIN PARTIDA';
    return [
      pkg,
      it.material || '',
      it.plano || '',
      it.rev || '',
      it.tagUnico || '',
      it.tagPlano || '',
      it.detalle || '',
      it.desc,
      isCountable(it.desc, section) ? String(it.qty) : '',
      it.metradoOt || '',
      it.unit,
      it.notes || ''
    ];
  });

  const csv = [cols, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `metrado_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

