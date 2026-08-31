import React, { useState } from 'react';
import * as XLSX from 'xlsx';

interface ExcelGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ExcelGuideModal: React.FC<ExcelGuideModalProps> = ({ isOpen, onClose, onFileUpload }) => {
  const [activeTab, setActiveTab] = useState<'mechas' | 'otros'>('mechas');

  if (!isOpen) return null;

  const handleDownloadXlsx = () => {
    // Sheet 1: Mechas (Cable 2/0 AWG + Tubería + Accesorios)
    const wsMechasData = [
      ['PLANO', 'TAG', 'LONGITUD_CABLE', 'LONGITUD_TUBERIA', 'DETALLE', 'JUMPERS', 'SOPORTES'],
      ['010/17A', 'M01', 12.5, 2.0, 'ND', '', 1],
      ['010/17A', 'M02', 8.0, 1.5, '008/05', 2, 2],
      ['010/17A', 'M03', 15.0, 3.0, '010/01', '', ''],
      ['010/17A', 'M04', 6.0, '', '151', '', '']
    ];
    const wsMechas = XLSX.utils.aoa_to_sheet(wsMechasData);

    // Sheet 2: Cables 4/0, Barras, Soldaduras y Pozos
    const wsOtrosData = [
      ['PLANO', 'TAG', 'CANTIDAD_O_LONGITUD', 'DETALLE', 'SOPORTES'],
      ['010/17A', 'C01', 45.0, '167/G1', ''],
      ['010/17A', 'BP01', 1.0, '010/17A', 1],
      ['010/17A', 'BI01', 1.0, '010/17C', 2],
      ['010/17A', 'TT01', 1.0, '', ''],
      ['010/17A', 'T01', 1.0, '', ''],
      ['010/17A', 'X01', 1.0, '', ''],
      ['010/17A', 'PC01', 1.0, '', ''],
      ['010/17A', 'PS01', 1.0, '', '']
    ];
    const wsOtros = XLSX.utils.aoa_to_sheet(wsOtrosData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsMechas, '1. MECHAS (2-0 AWG)');
    XLSX.utils.book_append_sheet(wb, wsOtros, '2. CABLES_BARRAS_OTROS');
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
          maxWidth: '620px',
          width: '92vw',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '16px'
        }}
      >
        {/* Modal Header & Tabs */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tx)', letterSpacing: '0.5px' }}>
              GUÍA Y ESTRUCTURA DE PLANTILLA EXCEL
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--mu)',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: 1
              }}
              title="Cerrar"
            >
              ✕
            </button>
          </div>

          {/* Section Selector Tabs */}
          <div style={{ display: 'flex', gap: '6px', background: 'var(--s2)', padding: '3px', borderRadius: '6px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('mechas')}
              style={{
                flex: 1,
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '5px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'mechas' ? 'var(--p1)' : 'transparent',
                color: activeTab === 'mechas' ? '#fff' : 'var(--mu)',
                transition: 'all 0.15s ease'
              }}
            >
              1. Mechas 2/0 AWG (7 cols)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('otros')}
              style={{
                flex: 1,
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '5px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'otros' ? 'var(--p1)' : 'transparent',
                color: activeTab === 'otros' ? '#fff' : 'var(--mu)',
                transition: 'all 0.15s ease'
              }}
            >
              2. Cables 4/0, Barras y Soldaduras (5 cols)
            </button>
          </div>
        </div>

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
          {/* Table of Columns for activeTab */}
          <div>
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
                  <col style={{ width: '150px' }} />
                  <col style={{ width: 'calc(100% - 150px)' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: 'var(--s2)', borderBottom: '1px solid var(--b1)' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>COLUMNA</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>DESCRIPCIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTab === 'mechas' ? (
                    <>
                      <tr style={{ borderBottom: '1px solid var(--b1)' }}>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', whiteSpace: 'nowrap' }}>PLANO</td>
                        <td style={{ padding: '6px 10px', textAlign: 'left', wordBreak: 'break-word' }}>Código del plano (ej. <strong>010/17A</strong>). Opcional si se usa el plano global.</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--b1)' }}>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', whiteSpace: 'nowrap' }}>TAG</td>
                        <td style={{ padding: '6px 10px', textAlign: 'left', wordBreak: 'break-word' }}>Prefijo <strong>M</strong> para mechas (ej. <strong>M01</strong>, <strong>M02</strong>).</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--b1)' }}>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', whiteSpace: 'nowrap' }}>LONGITUD_CABLE</td>
                        <td style={{ padding: '6px 10px', textAlign: 'left', wordBreak: 'break-word' }}>Metros de cable desnudo 2/0 AWG.</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--b1)' }}>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', whiteSpace: 'nowrap' }}>LONGITUD_TUBERIA</td>
                        <td style={{ padding: '6px 10px', textAlign: 'left', wordBreak: 'break-word' }}>Metros de tubería PVC. Opcional (dejar vacío si no aplica).</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--b1)' }}>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', whiteSpace: 'nowrap' }}>DETALLE</td>
                        <td style={{ padding: '6px 10px', textAlign: 'left', wordBreak: 'break-word' }}>Código constructivo (ej. <strong>ND</strong>, <strong>008/05</strong>, <strong>151</strong>).</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--b1)' }}>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', whiteSpace: 'nowrap' }}>JUMPERS</td>
                        <td style={{ padding: '6px 10px', textAlign: 'left', wordBreak: 'break-word' }}>Cantidad de jumpers por mecha (opcional, por defecto 1).</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', whiteSpace: 'nowrap' }}>SOPORTES</td>
                        <td style={{ padding: '6px 10px', textAlign: 'left', wordBreak: 'break-word' }}>Cantidad de soportes por mecha (opcional, por defecto 1).</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr style={{ borderBottom: '1px solid var(--b1)' }}>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', whiteSpace: 'nowrap' }}>PLANO</td>
                        <td style={{ padding: '6px 10px', textAlign: 'left', wordBreak: 'break-word' }}>Código del plano (ej. <strong>010/17A</strong>). Opcional si se usa el plano global.</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--b1)' }}>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', whiteSpace: 'nowrap' }}>TAG</td>
                        <td style={{ padding: '6px 10px', textAlign: 'left', wordBreak: 'break-word' }}>Prefijos: <strong>C</strong> (cable 4/0), <strong>BP</strong>/<strong>BI</strong> (barras), <strong>TT</strong>/<strong>T</strong>/<strong>X</strong> (soldaduras), <strong>PC</strong>/<strong>PS</strong> (pozos).</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--b1)' }}>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', whiteSpace: 'nowrap' }}>CANTIDAD_O_LONGITUD</td>
                        <td style={{ padding: '6px 10px', textAlign: 'left', wordBreak: 'break-word' }}>Metros para cable 4/0 (ej. <strong>45.0</strong>). Para barras, soldaduras y pozos ingresar <strong>1</strong> (o dejar en blanco).</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--b1)' }}>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', whiteSpace: 'nowrap' }}>DETALLE</td>
                        <td style={{ padding: '6px 10px', textAlign: 'left', wordBreak: 'break-word' }}>Código de detalle (ej. <strong>010/17A</strong>, <strong>010/17C</strong>, <strong>167/G1</strong>). Opcional (se auto-asigna si se deja vacío).</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)', whiteSpace: 'nowrap' }}>SOPORTES</td>
                        <td style={{ padding: '6px 10px', textAlign: 'left', wordBreak: 'break-word' }}>Aplica a <strong>BARRAS</strong> en Área Húmeda (ej. <strong>1</strong> o <strong>2</strong>). Para cables/soldaduras/pozos dejar vacío.</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unified Multi-tab Notice */}
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '10.5px',
              lineHeight: 1.45,
              color: 'var(--tx)'
            }}
          >
            <strong>💡 Plantilla Multi-Pestaña y Auto-Detección:</strong> La plantilla <strong>.xlsx</strong> descargable contiene ambas pestañas (<strong>1. MECHAS</strong> y <strong>2. CABLES_BARRAS_OTROS</strong>). Puedes subir el archivo con ambas pestañas a la vez. El sistema procesa todas las hojas automáticamente reconociendo las columnas por su cabecera.
          </div>

          {/* Compact Prefixes Row */}
          <div style={{ textAlign: 'center', marginTop: '2px' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--mu)',
                letterSpacing: '0.8px',
                marginBottom: '6px',
                textTransform: 'uppercase',
                textAlign: 'center'
              }}
            >
              Prefijos de TAG Válidos
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '4px 8px', fontSize: '10px', display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>M</span>
                <span style={{ color: 'var(--mu)', marginLeft: '4px' }}>Mecha 2/0</span>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '4px 8px', fontSize: '10px', display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>C</span>
                <span style={{ color: 'var(--mu)', marginLeft: '4px' }}>Malla 4/0</span>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '4px 8px', fontSize: '10px', display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>BP</span>
                <span style={{ color: 'var(--mu)', marginLeft: '4px' }}>Barra Pot</span>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '4px 8px', fontSize: '10px', display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>BI</span>
                <span style={{ color: 'var(--mu)', marginLeft: '4px' }}>Barra Inst</span>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '4px 8px', fontSize: '10px', display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>T / TT</span>
                <span style={{ color: 'var(--mu)', marginLeft: '4px' }}>Soldaduras T</span>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '4px 8px', fontSize: '10px', display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>X</span>
                <span style={{ color: 'var(--mu)', marginLeft: '4px' }}>Soldaduras Cruz</span>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '5px', padding: '4px 8px', fontSize: '10px', display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--tx)' }}>PC / PS</span>
                <span style={{ color: 'var(--mu)', marginLeft: '4px' }}>Pozos PAT</span>
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
          <button
            className="btn-ghost btn-sm btn-success"
            style={{
              width: '185px',
              height: '34px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px'
            }}
            onClick={handleDownloadXlsx}
          >
            DESCARGAR PLANTILLA (.XLSX)
          </button>
          <label
            className="btn-primary btn-success"
            style={{
              cursor: 'pointer',
              width: '185px',
              height: '34px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              margin: 0
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
