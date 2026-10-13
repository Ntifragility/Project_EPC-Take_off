import React from 'react';
import { componentClass } from '../../../entities/takeoff-item/model/materialClassifier';

const headerStyle: React.CSSProperties = {
  borderRight: '1px solid var(--b1)',
  borderBottom: '1px solid var(--b1)',
  textAlign: 'center',
  verticalAlign: 'middle'
};

export const MatHeader: React.FC<{ rowSpan?: number }> = ({ rowSpan }) => (
  <th rowSpan={rowSpan} style={headerStyle}>
    MAT
  </th>
);

export const MatCell: React.FC<{ desc: string; material?: string | null }> = ({ desc, material }) => {
  const value = componentClass(desc, material);
  return (
    <td
      style={{
        borderRight: '1px solid var(--b1)',
        textAlign: 'center',
        verticalAlign: 'middle',
        color: value === 'P' ? 'var(--excel-green, #107c41)' : 'var(--tx)'
      }}
    >
      {value}
    </td>
  );
};
