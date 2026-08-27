import React from 'react';
import * as XLSX from 'xlsx';

interface ExcelGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExcelGuideModal: React.FC<ExcelGuideModalProps> = ({ isOpen, onClose }) => {
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

  const handleCopyHeaders = () => {
    navigator.clipboard.writeText('TAG\tLONGITUD_CABLE\tLONGITUD_TUBERIA\tDETALLE\tJUMPERS\tSOPORTES');
    alert('Encabezados copiados al portapapeles: TAG | LONGITUD_CABLE | LONGITUD_TUBERIA | DETALLE | JUMPERS | SOPORTES');
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
          maxWidth: '680px',
          width: '92vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div className="modal-hd" style={{ flexShrink: 0 }}>
          <div>
            <div className="modal-hd-title" style={{ fontSize: '13px', letterSpacing: '1px' }}>
              GUÍA DE IMPORTACIÓN EXCEL
            </div>
            <div style={{ fontSize: '11px', color: 'var(--mu)', marginTop: '2px' }}>
              Estructura estándar de 6 columnas para importación (.xlsx, .xlsb, .xls)
            </div>
          </div>
          <button className="btn-ghost btn-sm" onClick={onClose}>
            ESC
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="modal-body"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            fontSize: '11.5px',
            overflowY: 'auto',
            paddingRight: '6px'
          }}
        >
          {/* Table of Columns */}
          <div>
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: 'var(--mu)',
                letterSpacing: '0.8px',
                marginBottom: '6px',
                textTransform: 'uppercase'
              }}
            >
              Columnas del Libro de Excel
            </div>
            <div
              className="tbl-wrap"
              style={{
                border: '1px solid var(--b1)',
                borderRadius: '6px',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '11px',
                  tableLayout: 'auto'
                }}
              >
                <thead>
                  <tr style={{ background: 'var(--s2)', borderBottom: '1px solid var(--b1)' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '38px' }}>COL</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', minWidth: '110px' }}>NOMBRE</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>DESCRIPCIÓN</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: '110px' }}>EJEMPLO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mo)', color: 'var(--mu)' }}>A</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>TAG</td>
                    <td style={{ padding: '6px 8px', textAlign: 'left' }}>Código del plano. Su prefijo asigna la regla de metrado.</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mo)' }}>M-01, C-01</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mo)', color: 'var(--mu)' }}>B</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>LONGITUD_CABLE</td>
                    <td style={{ padding: '6px 8px', textAlign: 'left' }}>Metros de cable. Para barras o soldaduras ingresar 1.</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mo)' }}>12.50 / 1</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mo)', color: 'var(--mu)' }}>C</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>LONGITUD_TUBERIA</td>
                    <td style={{ padding: '6px 8px', textAlign: 'left' }}>Metros de tubería PVC. Dejar vacío si no aplica.</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mo)' }}>2.00</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mo)', color: 'var(--mu)' }}>D</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>DETALLE</td>
                    <td style={{ padding: '6px 8px', textAlign: 'left' }}>Código constructivo (por defecto <strong>ND</strong>).</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mo)' }}>ND, 008/05</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mo)', color: 'var(--mu)' }}>E</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>JUMPERS</td>
                    <td style={{ padding: '6px 8px', textAlign: 'left' }}>Cantidad de jumpers por mecha (opcional, def: 1).</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mo)' }}>1, 2</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mo)', color: 'var(--mu)' }}>F</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>SOPORTES</td>
                    <td style={{ padding: '6px 8px', textAlign: 'left' }}>Cantidad de soportes por mecha (opcional, def: 1).</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mo)' }}>1, 3</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Compact Prefixes Row */}
          <div>
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: 'var(--mu)',
                letterSpacing: '0.8px',
                marginBottom: '6px',
                textTransform: 'uppercase'
              }}
            >
              Prefijos Reconocidos (Filas no reconocidas se rechazan a Excel)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '6px'
              }}
            >
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '6px 10px' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>M-</span>
                <span style={{ color: 'var(--mu)', marginLeft: '6px' }}>Mecha 2/0</span>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '6px 10px' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>C-</span>
                <span style={{ color: 'var(--mu)', marginLeft: '6px' }}>Malla 4/0</span>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '6px 10px' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>BP-</span>
                <span style={{ color: 'var(--mu)', marginLeft: '6px' }}>Barra Pot</span>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '6px 10px' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>BI-</span>
                <span style={{ color: 'var(--mu)', marginLeft: '6px' }}>Barra Inst</span>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '6px 10px' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>T- / TT-</span>
                <span style={{ color: 'var(--mu)', marginLeft: '6px' }}>Soldaduras</span>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '6px 10px' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>PC- / PS-</span>
                <span style={{ color: 'var(--mu)', marginLeft: '6px' }}>Pozos PAT</span>
              </div>
            </div>
          </div>

          {/* Minimal Format Note */}
          <div
            style={{
              background: 'var(--s2)',
              border: '1px solid var(--b1)',
              borderRadius: '5px',
              padding: '8px 12px',
              fontSize: '11px',
              color: 'var(--mu)',
              lineHeight: 1.4
            }}
          >
            Formatos soportados: <strong>.XLSX</strong>, <strong>.XLSB</strong> y <strong>.XLS</strong>. No se admiten archivos .CSV. Las filas con prefijos no reconocidos o valores no numéricos se descargan automáticamente en un reporte Excel para su revisión.
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="modal-ft"
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <button className="btn-ghost btn-sm" onClick={handleCopyHeaders} title="Copiar encabezados al portapapeles">
            COPIAR ENCABEZADOS
          </button>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ fontSize: '11px', padding: '6px 14px' }} onClick={handleDownloadXlsx}>
              PLANTILLA (.XLSX)
            </button>
            <button className="btn-ghost btn-sm" onClick={onClose}>
              CERRAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
