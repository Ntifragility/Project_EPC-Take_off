import React from 'react';
import { useTakeoff } from '../../context/TakeoffContext';

interface MaterialSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MaterialSummaryModal: React.FC<MaterialSummaryModalProps> = ({
  isOpen,
  onClose
}) => {
  const { items } = useTakeoff();

  if (!isOpen) return null;

  const pItems = items.filter(it => it.material === 'P');
  const summaryMap: Record<string, { desc: string; unit: string; qty: number }> = {};

  pItems.forEach(it => {
    const key = it.desc;
    if (!summaryMap[key]) {
      summaryMap[key] = { desc: it.desc, unit: it.unit, qty: 0 };
    }
    const num = parseFloat(it.metradoOt);
    if (!isNaN(num)) {
      summaryMap[key].qty += num;
    }
  });

  const sortedKeys = Object.keys(summaryMap).sort();

  const circ40Count = new Set(
    items
      .filter(it => it.desc && it.desc.includes('CABLE DESNUDO 4/0 AWG') && it.tagPlano)
      .map(it => it.tagPlano)
  ).size;

  const circ20Count = new Set(
    items
      .filter(it => it.desc && it.desc.includes('CABLE DESNUDO 2/0 AWG') && it.tagPlano)
      .map(it => it.tagPlano)
  ).size;

  return (
    <div
      className="modal-overlay"
      id="modal-overlay"
      style={{ display: 'flex' }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" id="modal-box" style={{ maxWidth: '640px' }}>
        <div className="modal-hd">
          <span className="modal-hd-title" id="modal-title">
            RESUMEN DE MATERIALES (P)
          </span>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body" id="modal-body">
          <div
            style={{
              maxHeight: '500px',
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingRight: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginTop: '5px'
            }}
          >
            {sortedKeys.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--mu)',
                  background: 'var(--s2)',
                  borderRadius: '12px',
                  fontSize: '13px',
                  letterSpacing: '0.5px',
                  border: '1px dashed var(--b2)'
                }}
              >
                No hay ítems registrados con MAT "P" en el proyecto actual.
              </div>
            ) : (
              sortedKeys.map(k => {
                const item = summaryMap[k];
                const formattedQty = Math.round(item.qty * 100) / 100;
                let circuitBadge = null;

                if (k.includes('CABLE DESNUDO 4/0 AWG')) {
                  circuitBadge = (
                    <div
                      style={{
                        fontSize: '15px',
                        color: 'var(--mu)',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        marginTop: '6px'
                      }}
                    >
                      CIRCUITOS /{' '}
                      <span style={{ color: 'var(--text)', fontWeight: 700 }}>
                        {circ40Count}
                      </span>
                    </div>
                  );
                } else if (k.includes('CABLE DESNUDO 2/0 AWG')) {
                  circuitBadge = (
                    <div
                      style={{
                        fontSize: '15px',
                        color: 'var(--mu)',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        marginTop: '6px'
                      }}
                    >
                      CIRCUITOS /{' '}
                      <span style={{ color: 'var(--text)', fontWeight: 700 }}>
                        {circ20Count}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={k}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      background: 'var(--s2)',
                      border: '1px solid var(--b2)',
                      borderRadius: '10px',
                      padding: '16px 20px',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'default'
                    }}
                  >
                    <div
                      style={{
                        flex: '1 1 200px',
                        minWidth: 0,
                        marginRight: '15px',
                        marginBottom: '8px'
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'var(--mo)',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--text)',
                          lineHeight: 1.4
                        }}
                      >
                        {item.desc}
                      </div>
                      {circuitBadge}
                      <div
                        style={{
                          fontSize: '10px',
                          color: 'var(--mu)',
                          letterSpacing: '1.5px',
                          textTransform: 'uppercase',
                          marginTop: circuitBadge ? '2px' : '6px'
                        }}
                      >
                        UNIDAD /{' '}
                        <span style={{ color: 'var(--text)', fontWeight: 700 }}>
                          {item.unit}
                        </span>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: '9px',
                          color: 'var(--mu)',
                          letterSpacing: '1px',
                          marginBottom: '4px',
                          textTransform: 'uppercase'
                        }}
                      >
                        M E T R A D O
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--mo)',
                          fontSize: '22px',
                          fontWeight: 700,
                          color: 'var(--am)',
                          textShadow: '0 0 16px rgba(255,166,0,0.25)'
                        }}
                      >
                        {formattedQty}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="modal-ft">
          <button className="btn-ghost" onClick={onClose}>
            CERRAR
          </button>
        </div>
      </div>
    </div>
  );
};

