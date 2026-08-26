import React from 'react';
import * as XLSX from 'xlsx';

interface ExcelGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExcelGuideModal: React.FC<ExcelGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const sampleCsvContent =
    '\uFEFF' +
    'TAG;LONGITUD_CABLE;LONGITUD_TUBERIA;DETALLE\r\n' +
    'M-01;12.5;2.0;009/07\r\n' +
    'M-02;8.0;1.5;008/05\r\n' +
    'C-01;45.0;;167/G1\r\n' +
    'BP-01;1.0;;010/17A\r\n' +
    'BI-01;1.0;;010/17C\r\n' +
    'TT-01;1.0;;\r\n' +
    'T-01;1.0;;\r\n' +
    'PC-01;1.0;;\r\n';

  const handleDownloadXlsx = () => {
    const wsData = [
      ['TAG', 'LONGITUD_CABLE', 'LONGITUD_TUBERIA', 'DETALLE'],
      ['M-01', 12.5, 2.0, '009/07'],
      ['M-02', 8.0, 1.5, '008/05'],
      ['C-01', 45.0, '', '167/G1'],
      ['BP-01', 1.0, '', '010/17A'],
      ['BI-01', 1.0, '', '010/17C'],
      ['TT-01', 1.0, '', ''],
      ['T-01', 1.0, '', ''],
      ['PC-01', 1.0, '', '']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Metrado');
    XLSX.writeFile(wb, 'plantilla_metrado_epc.xlsx');
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_metrado_epc.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyHeaders = () => {
    navigator.clipboard.writeText('TAG;LONGITUD_CABLE;LONGITUD_TUBERIA;DETALLE');
    alert('Encabezados copiados al portapapeles: TAG;LONGITUD_CABLE;LONGITUD_TUBERIA;DETALLE');
  };

  return (
    <div
      className="modal-overlay"
      id="excel-guide-overlay"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ maxWidth: '680px', maxHeight: '90vh' }}>
        <div className="modal-hd">
          <div>
            <div className="modal-hd-title" style={{ fontSize: '13.5px', letterSpacing: '1px' }}>
              GUÍA DE COLUMNAS PARA ARCHIVOS EXCEL / CSV
            </div>
            <div style={{ fontSize: '11px', color: 'var(--mu)', marginTop: '2px' }}>
              Estructura de 4 columnas para importación automática de metrados
            </div>
          </div>
          <button className="btn-ghost btn-sm" onClick={onClose}>
            ESC
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>
          {/* Table of Columns */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--mu)', letterSpacing: '0.8px', marginBottom: '8px', textTransform: 'uppercase' }}>
              1. Columnas Requeridas en Excel
            </div>
            <div className="tbl-wrap" style={{ border: '1px solid var(--b1)', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ background: 'var(--s2)', borderBottom: '1px solid var(--b1)' }}>
                    <th style={{ padding: '7px 10px', textAlign: 'center', width: '45px' }}>COL</th>
                    <th style={{ padding: '7px 10px', textAlign: 'left' }}>NOMBRE</th>
                    <th style={{ padding: '7px 10px', textAlign: 'left' }}>DESCRIPCIÓN</th>
                    <th style={{ padding: '7px 10px', textAlign: 'left' }}>EJEMPLO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mo)', color: 'var(--mu)' }}>A</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>TAG</td>
                    <td style={{ padding: '8px 10px', textAlign: 'left' }}>Código del plano. Su prefijo asigna la regla automáticamente.</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mo)' }}>M-01, C-01, BP-01</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mo)', color: 'var(--mu)' }}>B</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>LONGITUD_CABLE</td>
                    <td style={{ padding: '8px 10px', textAlign: 'left' }}>Longitud del cable en metros. (Para barras o soldaduras use 1).</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mo)' }}>12.50 / 1</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mo)', color: 'var(--mu)' }}>C</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>LONGITUD_TUBERIA</td>
                    <td style={{ padding: '8px 10px', textAlign: 'left' }}>Longitud de tubería PVC SCH 80 en metros. Dejar vacío si no aplica.</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mo)' }}>2.00</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mo)', color: 'var(--mu)' }}>D</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>DETALLE</td>
                    <td style={{ padding: '8px 10px', textAlign: 'left' }}>Código constructivo. Aplica los accesorios y soportes de la variante.</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mo)' }}>009/07, 010/17A</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Prefixes Legend */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--mu)', letterSpacing: '0.8px', marginBottom: '8px', textTransform: 'uppercase' }}>
              2. Prefijos de TAG Reconocidos
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '6px', padding: '8px 12px' }}>
                <div style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', fontSize: '11.5px' }}>M- o M</div>
                <div style={{ color: 'var(--mu)', fontSize: '11px' }}>Cable Desnudo 2/0 (Mecha)</div>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '6px', padding: '8px 12px' }}>
                <div style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', fontSize: '11.5px' }}>C- o C</div>
                <div style={{ color: 'var(--mu)', fontSize: '11px' }}>Cable Desnudo 4/0 (Malla)</div>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '6px', padding: '8px 12px' }}>
                <div style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', fontSize: '11.5px' }}>BP- o BP</div>
                <div style={{ color: 'var(--mu)', fontSize: '11px' }}>Barra de Potencial (BARRA POT)</div>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '6px', padding: '8px 12px' }}>
                <div style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', fontSize: '11.5px' }}>BI- o BI</div>
                <div style={{ color: 'var(--mu)', fontSize: '11px' }}>Barra Instrumentación (BARRA INST)</div>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '6px', padding: '8px 12px' }}>
                <div style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', fontSize: '11.5px' }}>T- / TT- / X-</div>
                <div style={{ color: 'var(--mu)', fontSize: '11px' }}>Soldaduras Exotérmicas</div>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '6px', padding: '8px 12px' }}>
                <div style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', fontSize: '11.5px' }}>PC- / PS-</div>
                <div style={{ color: 'var(--mu)', fontSize: '11px' }}>Pozos Puesta a Tierra</div>
              </div>
            </div>
          </div>

          {/* Excel Instructions */}
          <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '6px', padding: '12px 14px', lineHeight: 1.5 }}>
            <div style={{ fontWeight: 600, color: 'var(--tx)', marginBottom: '4px', fontSize: '11.5px' }}>
              Formatos directos compatibles:
            </div>
            <div style={{ color: 'var(--mu)', fontSize: '11px' }}>
              Puedes subir directamente tus libros de Excel <strong>.XLSX</strong>, <strong>.XLSB</strong> (Binario) o <strong>.XLS</strong> sin necesidad de exportarlos, así como archivos <strong>.CSV</strong> delimitados por punto y coma (<code>;</code>), comas (<code>,</code>) o tabulaciones.
            </div>
          </div>
        </div>

        <div className="modal-ft" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn-ghost btn-sm" onClick={handleCopyHeaders} title="Copiar encabezados al portapapeles">
            COPIAR ENCABEZADOS
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" style={{ fontSize: '11px', padding: '6px 14px' }} onClick={handleDownloadXlsx}>
              DESCARGAR PLANTILLA (.XLSX)
            </button>
            <button className="btn-ghost btn-sm" style={{ fontSize: '11px', padding: '6px 12px' }} onClick={handleDownloadTemplate}>
              PLANTILLA (.CSV)
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

