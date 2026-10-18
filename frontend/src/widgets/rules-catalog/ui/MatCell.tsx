import React from 'react';
import { componentClass } from '../../../entities/takeoff-item/model/materialClassifier';

const headerStyle: React.CSSProperties = {
  borderRight: '1px solid var(--b1)',
  borderBottom: '1px solid var(--b1)',
  textAlign: 'center',
  verticalAlign: 'middle',
  width: '95px'
};

export const MatHeader: React.FC<{ rowSpan?: number }> = ({ rowSpan }) => (
  <th rowSpan={rowSpan} style={headerStyle}>
    MAT
  </th>
);

export const MatCell: React.FC<{ desc: string; material?: string | null }> = ({ desc, material }) => {
  const value = componentClass(desc, material);
  const isP = value === 'P';
  return (
    <td
      style={{
        borderRight: '1px solid var(--b1)',
        textAlign: 'center',
        verticalAlign: 'middle',
        padding: '6px 4px'
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: '85px',
          padding: '3px 4px',
          fontSize: '11px',
          fontFamily: 'var(--mo)',
          fontWeight: 500,
          borderRadius: '4px',
          border: isP ? '1px solid #a7f3d0' : '1px solid #d1d5db',
          background: isP ? '#f0fdf4' : '#ffffff',
          color: isP ? '#107c41' : '#111827',
          textAlign: 'center'
        }}
      >
        {isP ? 'P (Prin.)' : 'C (Cons.)'}
      </span>
    </td>
  );
};
