import React from 'react';
import * as XLSX from 'xlsx';

interface ExcelGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ExcelGuideModal: React.FC<ExcelGuideModalProps> = ({ isOpen, onClose, onFileUpload }) => {
  if (!isOpen) return null;

  const handleDownloadXlsx = () => {
    const wsData = [
      ['TAG', 'LONGITUD_CABLE', 'LONGITUD_TUBERIA', 'DETALLE', 'JUMPERS', 'SOPORTES'],
      ['M-01', 12.5, 2.0, 'ND', '', 1],
      ['M-02', 8.0, 1.5, '008/05', 2, 2],
      ['C-01', 45.0, '', '167/G1', '', ''],
      ['BP-01', 1.0, '', '010/17A', '', 1],
      ['BI-01', 1.0, '', '010/17C', '', 2],
      ['TT-01', 1.0, '', '', '', ''],
      ['T-01', 1.0, '', '', '', ''],
      ['PC-01', 1.0, '', '', '', '']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Metrado');
    XLSX.writeFile(wb, 'plantilla_metrado_epc.xlsx');
  };

  return (
    <div
      className="modal-overlay"
      id="excel-guide-overlay"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        style={{
          maxWidth: '560px',
          width: '92vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '16px'
        }}
      >
        {/* Modal Body */}
        <div
          className="modal-body"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            fontSize: '11px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}
        >
          {/* Table of Columns */}
          <div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--mu)',
                letterSpacing: '0.8px',
                marginBottom: '5px',
                textTransform: 'uppercase'
              }}
            >
              Columnas del Libro de Excel
            </div>
            <div
              className="tbl-wrap"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid var(--b1)',
                borderRadius: '6px',
                overflow: 'hidden'
              }}
            >
              <table
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  borderCollapse: 'collapse',
                  fontSize: '10.5px',
                  tableLayout: 'fixed'
                }}
              >
                <colgroup>
                  <col style={{ width: '140px' }} />
                  <col style={{ width: 'calc(100% - 140px)' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: 'var(--s2)', borderBottom: '1px solid var(--b1)' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>TAG</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>DETALLE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--b1)' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', whiteSpace: 'nowrap' }}>LONGITUD_CABLE</td>
                    <td style={{ padding: '6px 10px', textAlign: 'left', wordBreak: 'break-word' }}>Metros de cable. Para barras o soldaduras ingresar 1.</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--b1)' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', whiteSpace: 'nowrap' }}>LONGITUD_TUBERIA</td>
                    <td style={{ padding: '6px 10px', textAlign: 'left', wordBreak: 'break-word' }}>Metros de tubería PVC. Dejar vacío si no aplica.</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--b1)' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', whiteSpace: 'nowrap' }}>DETALLE</td>
                    <td style={{ padding: '6px 10px', textAlign: 'left', wordBreak: 'break-word' }}>Código constructivo (por defecto <strong>ND</strong>).</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--b1)' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', whiteSpace: 'nowrap' }}>JUMPERS</td>
                    <td style={{ padding: '6px 10px', textAlign: 'left', wordBreak: 'break-word' }}>Cantidad de jumpers por mecha (opcional, def: 1).</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', whiteSpace: 'nowrap' }}>SOPORTES</td>
                    <td style={{ padding: '6px 10px', textAlign: 'left', wordBreak: 'break-word' }}>Cantidad de soportes por mecha (opcional, def: 1).</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Compact Prefixes Row */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--mu)',
                letterSpacing: '0.8px',
                marginBottom: '5px',
                textTransform: 'uppercase',
                textAlign: 'center'
              }}
            >
              Prefijos Reconocidos (Filas no reconocidas se rechazan a Excel)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
                gap: '5px',
                justifyContent: 'center'
              }}
            >
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '5px 8px', fontSize: '10.5px', textAlign: 'center' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>M-</span>
                <span style={{ color: 'var(--mu)', marginLeft: '5px' }}>Mecha 2/0</span>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '5px 8px', fontSize: '10.5px', textAlign: 'center' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>C-</span>
                <span style={{ color: 'var(--mu)', marginLeft: '5px' }}>Malla 4/0</span>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '5px 8px', fontSize: '10.5px', textAlign: 'center' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>BP-</span>
                <span style={{ color: 'var(--mu)', marginLeft: '5px' }}>Barra Pot</span>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '5px 8px', fontSize: '10.5px', textAlign: 'center' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>BI-</span>
                <span style={{ color: 'var(--mu)', marginLeft: '5px' }}>Barra Inst</span>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '5px 8px', fontSize: '10.5px', textAlign: 'center' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>T- / TT-</span>
                <span style={{ color: 'var(--mu)', marginLeft: '5px' }}>Soldaduras</span>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '5px 8px', fontSize: '10.5px', textAlign: 'center' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>PC- / PS-</span>
                <span style={{ color: 'var(--mu)', marginLeft: '5px' }}>Pozos PAT</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="modal-ft"
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid var(--b1)'
          }}
        >
          <button className="btn-ghost btn-sm" style={{ borderColor: 'var(--b1)', fontSize: '10.5px', padding: '4px 10px' }} onClick={handleDownloadXlsx}>
            PLANTILLA (.XLSX)
          </button>
          <label
            className="btn-primary"
            style={{
              cursor: 'pointer',
              padding: '5px 12px',
              fontSize: '10.5px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: '6px',
              border: 'none',
              height: '30px'
            }}
            title="Importar archivo Excel (.xlsx, .xlsb, .xls) ahora"
          >
            <span>+ SELECCIONAR EXCEL</span>
            <input
              type="file"
              accept=".xlsx,.xlsb,.xls"
              style={{ display: 'none' }}
              onChange={e => {
                onFileUpload(e);
                onClose();
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
