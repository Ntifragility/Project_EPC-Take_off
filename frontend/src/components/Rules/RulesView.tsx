import React, { useState } from 'react';
import { useTakeoff } from '../../context/TakeoffContext';
import { TakeoffRule } from '../../types/takeoff';
import { RuleEditorModal } from './RuleEditorModal';
import {
  getDetallesForArea,
  shouldAutoManageTuberia,
  BARRA_POT_VARIANTS_HUMEDA
} from '../../data/detalleVariants';

export const RulesView: React.FC = () => {
  const {
    rules,
    activeArea,
    setActiveArea,
    saveRule,
    deleteRule
  } = useTakeoff();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TakeoffRule | null>(null);
  const [isNew, setIsNew] = useState(false);

  const handleOpenNew = () => {
    setEditingRule(null);
    setIsNew(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (rule: TakeoffRule) => {
    setEditingRule(rule);
    setIsNew(false);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="view-hd">
        <div>
          <div className="view-title">REGLAS DE AUTO-LLENADO</div>
          <div className="view-sub">
            Reglas y matrices configuradas para el entorno seleccionado.
          </div>
        </div>
        <button className="btn-primary" onClick={handleOpenNew}>
          + NUEVA REGLA
        </button>
      </div>

      {/* 2 Interactive Session Cards for AREA SECA vs AREA HUMEDA */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
          marginBottom: '22px'
        }}
      >
        {/* Card 1: SESIÓN ÁREA SECA */}
        <div
          onClick={() => setActiveArea('AREA SECA')}
          style={{
            background: 'var(--s1)',
            border: activeArea === 'AREA SECA' ? '2px solid var(--am)' : '1px solid var(--b1)',
            borderRadius: '8px',
            padding: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: activeArea === 'AREA SECA' ? '0 0 14px rgba(255,166,0,0.15)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🏜️</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                SESIÓN: ÁREA SECA
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--mu)', marginTop: '4px' }}>
              17 Detalles estándar (151, 153, 020...) y Barra conv.
            </div>
          </div>
          {activeArea === 'AREA SECA' ? (
            <span
              style={{
                background: 'var(--am)',
                color: '#000',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: '4px'
              }}
            >
              ACTIVA ✓
            </span>
          ) : (
            <button
              className="btn-ghost btn-sm"
              style={{ fontSize: '11px', padding: '4px 10px' }}
              onClick={e => {
                e.stopPropagation();
                setActiveArea('AREA SECA');
              }}
            >
              VER REGLAS
            </button>
          )}
        </div>

        {/* Card 2: SESIÓN ÁREA HÚMEDA */}
        <div
          onClick={() => setActiveArea('AREA HUMEDA')}
          style={{
            background: 'var(--s1)',
            border: activeArea === 'AREA HUMEDA' ? '2px solid var(--am)' : '1px solid var(--b1)',
            borderRadius: '8px',
            padding: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: activeArea === 'AREA HUMEDA' ? '0 0 14px rgba(255,166,0,0.15)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>💧</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                SESIÓN: ÁREA HÚMEDA
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--mu)', marginTop: '4px' }}>
              Barra POT (010/17A-D) y 10 Detalles especiales
            </div>
          </div>
          {activeArea === 'AREA HUMEDA' ? (
            <span
              style={{
                background: 'var(--am)',
                color: '#000',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: '4px'
              }}
            >
              ACTIVA ✓
            </span>
          ) : (
            <button
              className="btn-ghost btn-sm"
              style={{ fontSize: '11px', padding: '4px 10px' }}
              onClick={e => {
                e.stopPropagation();
                setActiveArea('AREA HUMEDA');
              }}
            >
              VER REGLAS
            </button>
          )}
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📋</div>
          <div className="empty-title">Sin reglas</div>
          <div className="empty-sub">Crea tu primera regla para empezar</div>
        </div>
      ) : (
        rules.map(r => {
          // Special view for r2 (CABLE DESNUDO 2/0 AWG) - Displays ONLY current session's detalles
          if (r.id === 'r2') {
            const areaDetalles = getDetallesForArea(activeArea);

            return (
              <div className="rule-card" key={r.id}>
                <div className="rule-card-row">
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '6px'
                      }}
                    >
                      <div className="rule-trigger">⚡ {r.trigger}</div>
                      <span
                        style={{
                          background: 'rgba(255,166,0,0.12)',
                          border: '1px solid var(--am)',
                          color: 'var(--am)',
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}
                      >
                        {activeArea === 'AREA HUMEDA' ? '💧 ÁREA HÚMEDA' : '🏜️ ÁREA SECA'} ({areaDetalles.length} detalles)
                      </span>
                    </div>

                    <div
                      style={{
                        color: 'var(--am)',
                        fontSize: '11px',
                        marginBottom: '8px',
                        fontFamily: 'var(--mo)',
                        paddingLeft: '14px'
                      }}
                    >
                      ⚠️ Los ítems 3 y 4 cambian según el DETALLE de {activeArea}:
                    </div>

                    <div
                      style={{
                        margin: '12px 14px',
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        border: '1px solid var(--b1)',
                        borderRadius: '4px'
                      }}
                    >
                      <table
                        style={{
                          width: '100%',
                          minWidth: '550px',
                          borderCollapse: 'collapse',
                          fontFamily: 'var(--mo)',
                          fontSize: '11px'
                        }}
                      >
                        <colgroup>
                          <col style={{ width: '90px' }} />
                          <col style={{ width: 'auto' }} />
                          <col style={{ width: '90px' }} />
                        </colgroup>
                        <thead>
                          <tr style={{ background: 'var(--s2)' }}>
                            <th
                              style={{
                                borderRight: '1px solid var(--b1)',
                                borderBottom: '1px solid var(--b1)',
                                padding: '8px',
                                textAlign: 'center',
                                color: 'var(--am)',
                                fontWeight: 'bold'
                              }}
                            >
                              DETALLE
                            </th>
                            <th
                              style={{
                                borderRight: '1px solid var(--b1)',
                                borderBottom: '1px solid var(--b1)',
                                padding: '8px',
                                textAlign: 'left',
                                color: 'var(--am)',
                                fontWeight: 'bold'
                              }}
                            >
                              ÍTEMS DEL DETALLE ({activeArea === 'AREA HUMEDA' ? 'ÁREA HÚMEDA' : 'ÁREA SECA'})
                            </th>
                            <th
                              style={{
                                borderBottom: '1px solid var(--b1)',
                                padding: '8px',
                                textAlign: 'center',
                                color: 'var(--am)',
                                fontWeight: 'bold'
                              }}
                            >
                              METRADO OT
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {areaDetalles.map(([detalleCode, itemsList], detIdx) => {
                            const tuberiaDesc = detalleCode.startsWith('020')
                              ? 'TUBERIA RIGIDA DE ACERO GALVANIZADO EN CALIENTE DE WHEATLAND"'
                              : 'TUBERIA PVC SCH 80 Ø3/4"';

                            const itemsWithTuberia =
                              shouldAutoManageTuberia(detalleCode) &&
                              detalleCode !== '153' &&
                              detalleCode !== 'NA'
                                ? [...itemsList, { desc: tuberiaDesc, qty: 1, unit: 'm', ot: 'Var.' }]
                                : [...itemsList];

                            return itemsWithTuberia.map((item, i) => {
                              const isLast = i === itemsWithTuberia.length - 1;
                              const bb = isLast ? '2px solid var(--b1)' : '1px solid var(--b2)';
                              const bg = detIdx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';

                              return (
                                <tr
                                  key={`${detalleCode}-${i}`}
                                  style={{ borderBottom: bb, background: bg }}
                                >
                                  {i === 0 && (
                                    <td
                                      rowSpan={itemsWithTuberia.length}
                                      style={{
                                        borderBottom: '2px solid var(--b1)',
                                        borderRight: '1px solid var(--b1)',
                                        padding: '8px 10px',
                                        verticalAlign: 'middle',
                                        textAlign: 'center'
                                      }}
                                    >
                                      <span
                                        style={{
                                          background: 'rgba(255,166,0,0.1)',
                                          border: '1px solid var(--am)',
                                          borderRadius: '4px',
                                          padding: '4px 8px',
                                          display: 'inline-block',
                                          fontFamily: 'var(--mo)',
                                          fontSize: '11px',
                                          color: 'var(--am)',
                                          fontWeight: 'bold'
                                        }}
                                      >
                                        {detalleCode}
                                      </span>
                                    </td>
                                  )}
                                  <td
                                    style={{
                                      borderRight: '1px solid var(--b1)',
                                      padding: '8px 10px',
                                      fontFamily: 'var(--mo)',
                                      fontSize: '11.5px',
                                      color: 'var(--mu)',
                                      verticalAlign: 'middle',
                                      lineHeight: 1.4
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                                        {item.desc}
                                      </span>
                                      <span style={{ color: 'var(--mu)', fontSize: '10.5px' }}>
                                        ({item.qty} {item.unit})
                                      </span>
                                    </div>
                                  </td>
                                  <td
                                    style={{
                                      padding: '8px 10px',
                                      fontFamily: 'var(--mo)',
                                      fontSize: '11px',
                                      color: 'var(--am)',
                                      fontWeight: 'bold',
                                      verticalAlign: 'middle',
                                      textAlign: 'center'
                                    }}
                                  >
                                    {item.otDynamic === '1c/3m' ? (
                                      <span title="Fórmula: Cable / 3">1c / 3m ⚡</span>
                                    ) : item.otDynamic === 'empty' ? (
                                      <span style={{ color: 'var(--mu)', fontStyle: 'italic' }}>—</span>
                                    ) : (
                                      item.ot
                                    )}
                                  </td>
                                </tr>
                              );
                            });
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div
                      style={{
                        color: 'var(--mu)',
                        fontSize: '11px',
                        margin: '12px 0',
                        fontFamily: 'var(--mo)',
                        paddingLeft: '14px'
                      }}
                    >
                      <strong>Base de la regla (ítems 1 y 2 siempre iguales):</strong>
                    </div>

                    <div className="rule-subitems">
                      {r.subitems.slice(0, 2).map((s, i) => (
                        <div className="rule-sub" key={s.id}>
                          <span className="rule-sub-n">{i + 1}.</span>
                          <span className="rule-sub-d">{s.desc}</span>
                          <span className="rule-sub-q">{s.qty}</span>
                          <span style={{ color: 'var(--mu)' }}>{s.unit}</span>
                        </div>
                      ))}
                      <div className="rule-sub" style={{ color: 'var(--di)', fontStyle: 'italic' }}>
                        <span className="rule-sub-n">3-4.</span>
                        <span className="rule-sub-d">
                          Varían según DETALLE seleccionado (ver tabla arriba)
                        </span>
                        <span className="rule-sub-q">1</span>
                        <span style={{ color: 'var(--mu)' }}>und</span>
                      </div>
                    </div>
                  </div>

                  <div className="rule-card-acts">
                    <button className="btn-ghost btn-sm" onClick={() => handleOpenEdit(r)}>
                      EDITAR
                    </button>
                    <button
                      className="btn-ghost btn-sm btn-danger"
                      onClick={() => deleteRule(r.id)}
                    >
                      ELIMINAR
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          // Special card for BARRA POT (r8) with dynamic variants for ÁREA HÚMEDA
          if (r.id === 'r8' && activeArea === 'AREA HUMEDA') {
            return (
              <div className="rule-card" key={r.id}>
                <div style={{ marginBottom: '14px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px'
                    }}
                  >
                    <div className="rule-trigger">⚡ {r.trigger}</div>
                    <span
                      style={{
                        background: 'rgba(255,166,0,0.12)',
                        border: '1px solid var(--am)',
                        color: 'var(--am)',
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontWeight: 700
                      }}
                    >
                      💧 MATRIZ ÁREA HÚMEDA (010/17A - 010/17D)
                    </span>
                  </div>

                  {/* Detalle Variants Table for BARRA POT */}
                  <div
                    style={{
                      border: '1px solid var(--b1)',
                      borderRadius: '6px',
                      overflowX: 'auto',
                      background: 'var(--s2)'
                    }}
                  >
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '11.5px',
                        textAlign: 'left'
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: 'var(--s1)',
                            borderBottom: '2px solid var(--b1)',
                            color: 'var(--am)'
                          }}
                        >
                          <th style={{ padding: '8px 10px', width: '90px' }}>DETALLE</th>
                          <th style={{ padding: '8px 10px', width: '90px' }}>MAT / TIPO</th>
                          <th style={{ padding: '8px 10px', width: '70px', textAlign: 'right' }}>CANT.</th>
                          <th style={{ padding: '8px 10px', width: '90px' }}>UNID.</th>
                          <th style={{ padding: '8px 10px' }}>DESCRIPCION CORTA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(BARRA_POT_VARIANTS_HUMEDA).map(([detCode, vItems]) =>
                          vItems.map((item, i) => {
                            const isLast = i === vItems.length - 1;
                            const bb = isLast ? '2px solid var(--b1)' : '1px solid var(--b2)';
                            const isBarra = item.material === 'P';

                            return (
                              <tr
                                key={`${detCode}-${i}`}
                                style={{
                                  borderBottom: bb,
                                  background: isBarra ? 'rgba(255,166,0,0.03)' : 'transparent'
                                }}
                              >
                                {i === 0 && (
                                  <td
                                    rowSpan={vItems.length}
                                    style={{
                                      borderBottom: '2px solid var(--b1)',
                                      borderRight: '1px solid var(--b1)',
                                      padding: '8px 10px',
                                      verticalAlign: 'middle',
                                      textAlign: 'center'
                                    }}
                                  >
                                    <span
                                      style={{
                                        background: 'rgba(255,166,0,0.1)',
                                        border: '1px solid var(--am)',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        display: 'inline-block',
                                        fontFamily: 'var(--mo)',
                                        fontSize: '11px',
                                        color: 'var(--am)',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      {detCode}
                                    </span>
                                  </td>
                                )}
                                <td
                                  style={{
                                    borderRight: '1px solid var(--b1)',
                                    padding: '8px 10px',
                                    verticalAlign: 'middle'
                                  }}
                                >
                                  <span
                                    className={`mat-tag ${item.material === 'P' ? 'mat-p' : 'mat-c'}`}
                                  >
                                    {item.material}
                                  </span>
                                  <span
                                    style={{
                                      marginLeft: '6px',
                                      fontSize: '11px',
                                      color: 'var(--mu)'
                                    }}
                                  >
                                    {isBarra ? 'BARRA' : item.desc.includes('PERNO') ? 'PERNO' : 'SOPORTE'}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    borderRight: '1px solid var(--b1)',
                                    padding: '8px 10px',
                                    textAlign: 'right',
                                    fontFamily: 'var(--mo)',
                                    color: 'var(--text)',
                                    fontWeight: 600
                                  }}
                                >
                                  {item.qty}
                                </td>
                                <td
                                  style={{
                                    borderRight: '1px solid var(--b1)',
                                    padding: '8px 10px',
                                    color: 'var(--mu)',
                                    fontFamily: 'var(--mo)',
                                    fontSize: '11px'
                                  }}
                                >
                                  {item.unit}
                                </td>
                                <td
                                  style={{
                                    padding: '8px 10px',
                                    fontFamily: 'var(--mo)',
                                    fontSize: '11.5px',
                                    color: isBarra ? 'var(--text)' : 'var(--mu)',
                                    fontWeight: isBarra ? 600 : 400,
                                    lineHeight: 1.4
                                  }}
                                >
                                  {item.desc}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rule-card-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: 'var(--mu)' }}>
                      En <strong>ÁREA SECA</strong> se utiliza la configuración estándar (1 BARRA POT convencional). En <strong>ÁREA HÚMEDA</strong> se generan automáticamente los accesorios correspondientes según el Detalle (010/17A, B, C, D).
                    </div>
                  </div>
                  <div className="rule-card-acts">
                    <button className="btn-ghost btn-sm" onClick={() => handleOpenEdit(r)}>
                      EDITAR
                    </button>
                    <button
                      className="btn-ghost btn-sm btn-danger"
                      onClick={() => deleteRule(r.id)}
                    >
                      ELIMINAR
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          // Standard rule card
          return (
            <div className="rule-card" key={r.id}>
              <div className="rule-card-row">
                <div style={{ flex: 1 }}>
                  <div className="rule-trigger">⚡ {r.trigger}</div>
                  <div className="rule-subitems">
                    {r.subitems.map((s, i) => (
                      <div className="rule-sub" key={s.id}>
                        <span className="rule-sub-n">{i + 1}.</span>
                        <span className="rule-sub-d">{s.desc}</span>
                        <span className="rule-sub-q">{s.qty}</span>
                        <span style={{ color: 'var(--mu)' }}>{s.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rule-card-acts">
                  <button className="btn-ghost btn-sm" onClick={() => handleOpenEdit(r)}>
                    EDITAR
                  </button>
                  <button
                    className="btn-ghost btn-sm btn-danger"
                    onClick={() => deleteRule(r.id)}
                  >
                    ELIMINAR
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      <RuleEditorModal
        isOpen={modalOpen}
        initialRule={editingRule}
        isNew={isNew}
        onClose={() => setModalOpen(false)}
        onSave={saveRule}
      />
    </div>
  );
};

