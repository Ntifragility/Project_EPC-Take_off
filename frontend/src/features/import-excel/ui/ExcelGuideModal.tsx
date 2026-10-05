import React, { useState } from 'react';
import { downloadMetradoTemplateXlsx } from '../../../shared/lib/excelTemplates';
import { ModalShell } from '../../../shared/ui/ModalShell';

export interface ExcelGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ExcelGuideModal: React.FC<ExcelGuideModalProps> = ({ isOpen, onClose, onFileUpload }) => {
  const [activeTab, setActiveTab] = useState<'mechas' | 'otros'>('mechas');

  if (!isOpen) return null;

  return (
    <ModalShell title="Guía de plantilla Excel" onClose={onClose} maxWidth="620px">
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="modal-seg">
            <button
              type="button"
              className={activeTab === 'mechas' ? 'is-active' : ''}
              onClick={() => setActiveTab('mechas')}
            >
              Mechas 2/0 AWG (7 cols)
            </button>
            <button
              type="button"
              className={activeTab === 'otros' ? 'is-active' : ''}
              onClick={() => setActiveTab('otros')}
            >
              Cables 4/0, barras y soldaduras (5 cols)
            </button>
          </div>
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
            <strong>Plantilla multi-pestaña y auto-detección:</strong> La plantilla <strong>.xlsx</strong> descargable contiene ambas pestañas (<strong>1. MECHAS</strong> y <strong>2. CABLES_BARRAS_OTROS</strong>), cada una con formato <strong>Tabla de Excel</strong> (filtros por columna y filas con bandas). Puedes subir el archivo con ambas pestañas a la vez. El sistema procesa todas las hojas automáticamente reconociendo las columnas por su cabecera.
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
        <div className="modal-ft" style={{ justifyContent: 'center' }}>
          <button className="btn-ghost" onClick={downloadMetradoTemplateXlsx}>
            Descargar plantilla
          </button>
          <label
            className="btn-primary"
            style={{ cursor: 'pointer', margin: 0 }}
            title="Importar archivo Excel (.xlsx, .xlsb, .xls) ahora"
          >
            <span>Seleccionar Excel</span>
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
    </ModalShell>
  );
};
