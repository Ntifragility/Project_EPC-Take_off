import React from 'react';
import { ExcelColumnFilter } from './ExcelColumnFilter';
import { BASE_COL_WIDTHS, minColumnWidth, maxColumnWidth } from './columnWidths';

export type ColumnKey =
  | 'partida'
  | 'partidaBalance'
  | 'num'
  | 'mat'
  | 'plano'
  | 'rev'
  | 'tagUnico'
  | 'tagPlano'
  | 'detalle'
  | 'desc'
  | 'metradoOt'
  | 'unit';

export interface TakeoffTableHeaderProps {
  columnFilters: Record<string, string[]>;
  uniqueValues: Record<string, string[]>;
  onApplyColumnFilter: (column: string, values: string[] | null) => void;
  colWidths?: Record<string, number>;
  onStartResize?: (colKey: string, e: React.MouseEvent) => void;
}

const HEADER_COLUMNS: { key: ColumnKey; label: string; filterable: boolean; className: string }[] = [
  { key: 'num', label: 'N°', filterable: false, className: 'th-n' },
  { key: 'partida', label: 'PARTIDAS SICME', filterable: true, className: 'th-u' },
  { key: 'partidaBalance', label: 'PARTIDA BALANCE', filterable: true, className: 'th-u' },
  { key: 'mat', label: 'MAT', filterable: true, className: 'th-u' },
  { key: 'plano', label: 'PLANO', filterable: true, className: 'th-u' },
  { key: 'rev', label: 'REV', filterable: true, className: 'th-u' },
  { key: 'tagUnico', label: 'TAG UNICO', filterable: true, className: 'th-u' },
  { key: 'tagPlano', label: 'TAG EN PLANO', filterable: true, className: 'th-u' },
  { key: 'detalle', label: 'DETALLE', filterable: true, className: 'th-u' },
  { key: 'desc', label: 'DESCRIPCION', filterable: true, className: 'th-d' },
  { key: 'metradoOt', label: 'METRADO OT', filterable: true, className: 'th-u' },
  { key: 'unit', label: 'UND', filterable: true, className: 'th-u' }
];

export const TakeoffTableHeader: React.FC<TakeoffTableHeaderProps> = ({
  columnFilters,
  uniqueValues,
  onApplyColumnFilter,
  colWidths = {},
  onStartResize
}) => {
  return (
    <thead>
      <tr>
        {HEADER_COLUMNS.map(column => {
          const width = colWidths[column.key] || BASE_COL_WIDTHS[column.key];
          return (
            <th
              key={column.key}
              className={`${column.className} th-resizable`}
              style={{
                width,
                color: column.key === 'partida' || column.key === 'partidaBalance' ? 'var(--am)' : undefined
              }}
            >
              <div className="th-filter-row">
                <span>{column.label}</span>
                {column.filterable && (
                  <ExcelColumnFilter
                    values={uniqueValues[column.key] || []}
                    selected={columnFilters[column.key]}
                    onApply={values => onApplyColumnFilter(column.key, values)}
                  />
                )}
              </div>
              {onStartResize && (
                <div
                  className="col-resizer"
                  title={`Arrastra para ajustar (entre ${minColumnWidth(column.key)} y ${maxColumnWidth(column.key)} px)`}
                  onMouseDown={e => onStartResize(column.key, e)}
                />
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
};
