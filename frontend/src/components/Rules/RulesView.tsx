import React, { useState } from 'react';
import { useTakeoff } from '../../context/TakeoffContext';
import { TakeoffRule } from '../../types/takeoff';
import { RuleEditorModal } from './RuleEditorModal';
import { DetalleEditorModal } from './DetalleEditorModal';
import {
  getDetallesForArea,
  shouldAutoManageTuberia,
  DYNAMIC_BARRA_POT_VARIANTS,
  DYNAMIC_BARRA_INST_VARIANTS,
  type DetalleVariantItem
} from '../../data/detalleVariants';

export const RulesView: React.FC = () => {
  const {
    rules,
    activeArea,
    setActiveArea,
    saveRule,
    deleteRule,
    saveDetalleVariant,
    detalleVariantsVersion
  } = useTakeoff();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TakeoffRule | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set(['r2', 'r8', 'r9']));

  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [editingDetalle, setEditingDetalle] = useState<{
    code: string;
    area: string;
    category: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST';
    items: DetalleVariantItem[];
  } | null>(null);

  const areaDetalles = getDetallesForArea(activeArea);
  const currentAreaCodes: string[] = areaDetalles.map(([c]) => c);

  const getDetalleItemsForCode = (
    code: string,
    cat: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST' = 'CABLE_2_0'
  ): DetalleVariantItem[] => {
    if (cat === 'BARRA_POT') {
      return (DYNAMIC_BARRA_POT_VARIANTS[code] || []) as any;
    }
    if (cat === 'BARRA_INST') {
      return (DYNAMIC_BARRA_INST_VARIANTS[code] || []) as any;
    }
    const found = areaDetalles.find(([c]) => c === code);
    return found ? found[1] : [];
  };

  const handleOpenDetalleEdit = (
    code: string,
    items: DetalleVariantItem[],
    category: 'CABLE_2_0' | 'BARRA_POT' | 'BARRA_INST' = 'CABLE_2_0'
  ) => {
    setEditingDetalle({
      code,
      area: activeArea,
      category,
      items: items && items.length > 0 ? items : getDetalleItemsForCode(code, category)
    });
    setDetalleModalOpen(true);
  };

  const handleOpenDirectDetalle = () => {
    const firstCode = currentAreaCodes[0] || 'ND';
    const items = getDetalleItemsForCode(firstCode, 'CABLE_2_0');
    handleOpenDetalleEdit(firstCode, items, 'CABLE_2_0');
  };

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

  const toggleRuleExpand = (ruleId: string) => {
    setExpandedRules(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  const allExpanded = rules.length > 0 && rules.every(r => expandedRules.has(r.id));

  const toggleAllExpand = () => {
    if (allExpanded) {
      setExpandedRules(new Set());
    } else {
      setExpandedRules(new Set(rules.map(r => r.id)));
    }
  };

  return (
    <div>
      <div className="view-hd">
        <div>
          <div className="view-title">
            REGLAS DE AUTO-LLENADO &bull; {activeArea === 'AREA HUMEDA' ? 'ÁREA HÚMEDA' : 'ÁREA SECA'}
          </div>
          <div className="view-sub">
            {activeArea === 'AREA HUMEDA'
              ? 'Reglas y matrices constructivas para Área Húmeda.'
              : 'Reglas y matrices estándar para Área Seca.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {rules.length > 0 && (
            <button
              className="btn-ghost"
              onClick={toggleAllExpand}
              style={{ fontSize: '11px', padding: '6px 12px' }}
            >
              {allExpanded ? '▲ COLAPSAR TODAS' : '▼ EXPANDIR TODAS'}
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={handleOpenDirectDetalle}
            style={{ fontSize: '11px', padding: '6px 14px' }}
            title="Abrir editor para cualquier detalle constructivo de esta área"
          >
            EDITAR DETALLES
          </button>
          <button className="btn-primary" onClick={handleOpenNew}>
            + NUEVA REGLA
          </button>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">—</div>
          <div className="empty-title">Sin reglas</div>
          <div className="empty-sub">Crea tu primera regla para empezar</div>
        </div>
      ) : (
        rules.map(r => {
          const isExpanded = expandedRules.has(r.id);

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
                      <div className="rule-trigger">{r.trigger}</div>
                      <span
                        style={{
                          background: 'var(--s2)',
                          border: '1px solid var(--b1)',
                          color: 'var(--tx)',
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontFamily: 'var(--mo)',
                          marginRight: '90px'
                        }}
                      >
                        {areaDetalles.length} detalles
                      </span>
                    </div>

                    {/* Foldable Row / Banner */}
                    <div
                      onClick={() => toggleRuleExpand(r.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 12px',
                        background: 'var(--s2)',
                        border: '1px solid var(--b1)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        fontSize: '11px',
                        fontFamily: 'var(--mo)',
                        color: 'var(--tx)',
                        margin: '8px 14px 8px 14px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Haga clic para mostrar u ocultar"
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <span>{isExpanded ? '▼' : '▶'}</span>
                        <span>{isExpanded ? 'Ocultar' : 'Mostrar'}</span>
                      </span>
                    </div>

                    {isExpanded && (
                      <div
                        style={{
                          margin: '12px 14px',
                          overflowX: 'auto',
                          WebkitOverflowScrolling: 'touch',
                          border: '1px solid var(--b1)',
                          borderRadius: '6px',
                          background: 'var(--s2)'
                        }}
                      >
                        <table
                          style={{
                            width: '100%',
                            minWidth: '600px',
                            borderCollapse: 'collapse',
                            fontFamily: 'var(--mo)',
                            fontSize: '11px'
                          }}
                        >
                          <colgroup>
                            <col style={{ width: '85px' }} />
                            <col style={{ width: 'auto' }} />
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '110px' }} />
                          </colgroup>
                          <thead>
                            <tr style={{ background: 'var(--s1)' }}>
                              <th
                                style={{
                                  borderRight: '1px solid var(--b1)',
                                  borderBottom: '1px solid var(--b1)',
                                  padding: '8px',
                                  textAlign: 'center',
                                  color: 'var(--tx)',
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
                                  color: 'var(--tx)',
                                  fontWeight: 'bold'
                                }}
                              >
                                DESCRIPCIÓN
                              </th>
                              <th
                                style={{
                                  borderRight: '1px solid var(--b1)',
                                  borderBottom: '1px solid var(--b1)',
                                  padding: '8px',
                                  textAlign: 'center',
                                  color: 'var(--tx)',
                                  fontWeight: 'bold'
                                }}
                              >
                                METRADO OT
                              </th>
                              <th
                                style={{
                                  borderBottom: '1px solid var(--b1)',
                                  padding: '8px',
                                  textAlign: 'center',
                                  color: 'var(--tx)',
                                  fontWeight: 'bold'
                                }}
                              >
                                UNIDAD
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {areaDetalles.map(([detalleCode, itemsList], detIdx) => {
                              const tuberiaDesc = detalleCode.startsWith('020')
                                ? 'TUBERIA RIGIDA DE ACERO GALVANIZADO EN CALIENTE DE WHEATLAND"'
                                : 'TUBERIA PVC SCH 80 Ø3/4"';

                              const itemsWithTuberia =
                                activeArea === 'AREA SECA' &&
                                shouldAutoManageTuberia(detalleCode) &&
                                detalleCode !== '153' &&
                                detalleCode !== 'NA'
                                  ? [...itemsList, { desc: tuberiaDesc, qty: 1, unit: 'm', ot: 'Var.' }]
                                  : [...itemsList];

                              const sortedItems = [...itemsWithTuberia].sort((a, b) => {
                                const descA = (a.desc || '').toUpperCase();
                                const descB = (b.desc || '').toUpperCase();
                                const getScore = (desc: string) => {
                                  if (desc.startsWith('CABLE DESNUDO 2/0 AWG')) return 0;
                                  if (desc.startsWith('TUBERIA') || desc.startsWith('TUBERÍA')) return 1;
                                  return 2;
                                };
                                const scoreA = getScore(descA);
                                const scoreB = getScore(descB);
                                if (scoreA !== scoreB) {
                                  return scoreA - scoreB;
                                }
                                return descA.localeCompare(descB);
                              });

                              return sortedItems.map((item, i) => {
                                const isLast = i === sortedItems.length - 1;
                                const bb = isLast ? '2px solid var(--b1)' : '1px solid var(--b2)';
                                const bg = detIdx % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent';

                                return (
                                  <tr
                                    key={`${detalleCode}-${i}`}
                                    style={{ borderBottom: bb, background: bg }}
                                  >
                                    {i === 0 && (
                                      <td
                                        rowSpan={sortedItems.length}
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
                                            background: 'var(--ad)',
                                            border: '1px solid var(--b1)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            display: 'inline-block',
                                            fontFamily: 'var(--mo)',
                                            fontSize: '11px',
                                            color: 'var(--tx)',
                                            fontWeight: 'bold'
                                          }}
                                        >
                                          {detalleCode}
                                        </span>
                                        <button
                                          type="button"
                                          className="btn-ghost"
                                          onClick={() => handleOpenDetalleEdit(detalleCode, itemsList, 'CABLE_2_0')}
                                          style={{
                                            fontSize: '10px',
                                            padding: '3px 8px',
                                            marginTop: '6px',
                                            display: 'block',
                                            margin: '6px auto 0 auto',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            border: '1px solid var(--b1)',
                                            background: 'var(--s1)'
                                          }}
                                          title={`Editar materiales de ${detalleCode}`}
                                        >
                                          EDITAR
                                        </button>
                                      </td>
                                    )}
                                    <td
                                      style={{
                                        borderRight: '1px solid var(--b1)',
                                        padding: '8px 10px',
                                        fontFamily: 'var(--mo)',
                                        fontSize: '11.5px',
                                        color: 'var(--tx)',
                                        verticalAlign: 'middle',
                                        lineHeight: 1.4
                                      }}
                                    >
                                      {item.desc}
                                    </td>
                                    <td
                                      style={{
                                        borderRight: '1px solid var(--b1)',
                                        padding: '8px 10px',
                                        fontFamily: 'var(--mo)',
                                        fontSize: '11px',
                                        color: 'var(--mu)',
                                        fontWeight: 'bold',
                                        verticalAlign: 'middle',
                                        textAlign: 'center'
                                      }}
                                    >
                                      {item.otDynamic === '1c/3m' ? (
                                        <span style={{ color: 'var(--tx)' }} title="Fórmula: Cable / 3">1c / 3m</span>
                                      ) : item.qty === 'Var.' || item.ot === 'Var.' ? (
                                        <span style={{ color: 'var(--tx)' }}>Var.</span>
                                      ) : item.otDynamic === 'empty' ? (
                                        <span style={{ color: 'var(--mu)', fontStyle: 'italic' }}>—</span>
                                      ) : (
                                        item.ot
                                      )}
                                    </td>
                                    <td
                                      style={{
                                        padding: '8px 10px',
                                        fontFamily: 'var(--mo)',
                                        fontSize: '11px',
                                        color: 'var(--tx)',
                                        fontWeight: 600,
                                        verticalAlign: 'middle',
                                        textAlign: 'center',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      {item.unit}
                                    </td>
                                  </tr>
                                );
                              });
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {activeArea === 'AREA SECA' && (
                      <>
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
                      </>
                    )}
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
            const potEntries = Object.entries(DYNAMIC_BARRA_POT_VARIANTS);
            const totalItemsCount = potEntries.reduce((acc, [_, list]) => acc + list.length, 0);

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
                    <div className="rule-trigger">{r.trigger}</div>
                    <span
                      style={{
                        background: 'var(--s2)',
                        border: '1px solid var(--b1)',
                        color: 'var(--tx)',
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontFamily: 'var(--mo)',
                        marginRight: '90px'
                      }}
                    >
                      {activeArea === 'AREA HUMEDA' ? '2 detalles' : '1 detalle'}
                    </span>
                  </div>

                  {/* Foldable Row / Banner */}
                  <div
                    onClick={() => toggleRuleExpand(r.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      background: 'var(--s2)',
                      border: '1px solid var(--b1)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      fontSize: '11px',
                      fontFamily: 'var(--mo)',
                      color: 'var(--tx)',
                      margin: '8px 14px 8px 14px',
                      transition: 'all 0.15s ease'
                    }}
                    title="Haga clic para mostrar u ocultar"
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <span>{isExpanded ? '▼' : '▶'}</span>
                      <span>{isExpanded ? 'Ocultar' : 'Mostrar'}</span>
                    </span>
                  </div>

                  {isExpanded && (
                    <div
                      style={{
                        margin: '12px 14px',
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        border: '1px solid var(--b1)',
                        borderRadius: '6px',
                        background: 'var(--s2)'
                      }}
                    >
                      <table
                        style={{
                          width: '100%',
                          minWidth: '600px',
                          borderCollapse: 'collapse',
                          fontFamily: 'var(--mo)',
                          fontSize: '11px',
                          textAlign: 'left'
                        }}
                      >
                        <colgroup>
                          <col style={{ width: '85px' }} />
                          <col style={{ width: 'auto' }} />
                          <col style={{ width: '120px' }} />
                          <col style={{ width: '110px' }} />
                        </colgroup>
                        <thead>
                          <tr style={{ background: 'var(--s1)' }}>
                            <th
                              style={{
                                borderRight: '1px solid var(--b1)',
                                borderBottom: '1px solid var(--b1)',
                                padding: '8px',
                                textAlign: 'center',
                                color: 'var(--tx)',
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
                                color: 'var(--tx)',
                                fontWeight: 'bold'
                              }}
                            >
                              DESCRIPCIÓN
                            </th>
                            <th
                              style={{
                                borderRight: '1px solid var(--b1)',
                                borderBottom: '1px solid var(--b1)',
                                padding: '8px',
                                textAlign: 'center',
                                color: 'var(--tx)',
                                fontWeight: 'bold'
                              }}
                            >
                              METRADO OT
                            </th>
                            <th
                              style={{
                                borderBottom: '1px solid var(--b1)',
                                padding: '8px',
                                textAlign: 'center',
                                color: 'var(--tx)',
                                fontWeight: 'bold'
                              }}
                            >
                              UNIDAD
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {potEntries.map(([detCode, vItems], detIdx) =>
                            vItems.map((item, i) => {
                              const isLast = i === vItems.length - 1;
                              const bb = isLast ? '2px solid var(--b1)' : '1px solid var(--b2)';
                              const bg = detIdx % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent';

                              return (
                                <tr key={`${detCode}-${i}`} style={{ borderBottom: bb, background: bg }}>
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
                                          background: 'var(--ad)',
                                          border: '1px solid var(--b1)',
                                          borderRadius: '4px',
                                          padding: '4px 8px',
                                          display: 'inline-block',
                                          fontFamily: 'var(--mo)',
                                          fontSize: '11px',
                                          color: 'var(--tx)',
                                          fontWeight: 'bold'
                                        }}
                                      >
                                        {detCode}
                                      </span>
                                      <button
                                        type="button"
                                        className="btn-ghost"
                                        onClick={() => handleOpenDetalleEdit(detCode, vItems as any, 'BARRA_POT')}
                                        style={{
                                          fontSize: '10px',
                                          padding: '3px 8px',
                                          marginTop: '6px',
                                          display: 'block',
                                          margin: '6px auto 0 auto',
                                          cursor: 'pointer',
                                          borderRadius: '4px',
                                          border: '1px solid var(--b1)',
                                          background: 'var(--s1)'
                                        }}
                                        title={`Editar materiales de ${detCode}`}
                                      >
                                        EDITAR
                                      </button>
                                    </td>
                                  )}
                                  <td
                                    style={{
                                      borderRight: '1px solid var(--b1)',
                                      padding: '8px 10px',
                                      fontFamily: 'var(--mo)',
                                      fontSize: '11.5px',
                                      color: 'var(--tx)',
                                      verticalAlign: 'middle',
                                      lineHeight: 1.4
                                    }}
                                  >
                                    {item.desc}
                                  </td>
                                  <td
                                    style={{
                                      borderRight: '1px solid var(--b1)',
                                      padding: '8px 10px',
                                      fontFamily: 'var(--mo)',
                                      fontSize: '11px',
                                      color: 'var(--tx)',
                                      fontWeight: 'bold',
                                      verticalAlign: 'middle',
                                      textAlign: 'center'
                                    }}
                                  >
                                    {item.metradoOt || item.qty}
                                  </td>
                                  <td
                                    style={{
                                      padding: '8px 10px',
                                      fontFamily: 'var(--mo)',
                                      fontSize: '11px',
                                      color: 'var(--tx)',
                                      fontWeight: 600,
                                      verticalAlign: 'middle',
                                      textAlign: 'center',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {item.unit}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
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
            );
          }

          // Special card for BARRA INST (r9) with dynamic variants for ÁREA HÚMEDA
          if (r.id === 'r9' && activeArea === 'AREA HUMEDA') {
            const instEntries = Object.entries(DYNAMIC_BARRA_INST_VARIANTS);
            const totalInstItemsCount = instEntries.reduce((acc, [_, list]) => acc + list.length, 0);

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
                    <div className="rule-trigger">{r.trigger}</div>
                    <span
                      style={{
                        background: 'var(--s2)',
                        border: '1px solid var(--b1)',
                        color: 'var(--tx)',
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontFamily: 'var(--mo)',
                        marginRight: '90px'
                      }}
                    >
                      {activeArea === 'AREA HUMEDA' ? '2 detalles' : '1 detalle'}
                    </span>
                  </div>

                  {/* Foldable Row / Banner */}
                  <div
                    onClick={() => toggleRuleExpand(r.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      background: 'var(--s2)',
                      border: '1px solid var(--b1)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      fontSize: '11px',
                      fontFamily: 'var(--mo)',
                      color: 'var(--tx)',
                      margin: '8px 14px 8px 14px',
                      transition: 'all 0.15s ease'
                    }}
                    title="Haga clic para mostrar u ocultar"
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <span>{isExpanded ? '▼' : '▶'}</span>
                      <span>{isExpanded ? 'Ocultar' : 'Mostrar'}</span>
                    </span>
                  </div>

                  {isExpanded && (
                    <div
                      style={{
                        margin: '12px 14px',
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        border: '1px solid var(--b1)',
                        borderRadius: '6px',
                        background: 'var(--s2)'
                      }}
                    >
                      <table
                        style={{
                          width: '100%',
                          minWidth: '600px',
                          borderCollapse: 'collapse',
                          fontFamily: 'var(--mo)',
                          fontSize: '11px',
                          textAlign: 'left'
                        }}
                      >
                        <colgroup>
                          <col style={{ width: '85px' }} />
                          <col style={{ width: 'auto' }} />
                          <col style={{ width: '120px' }} />
                          <col style={{ width: '110px' }} />
                        </colgroup>
                        <thead>
                          <tr style={{ background: 'var(--s1)' }}>
                            <th
                              style={{
                                borderRight: '1px solid var(--b1)',
                                borderBottom: '1px solid var(--b1)',
                                padding: '8px',
                                textAlign: 'center',
                                color: 'var(--tx)',
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
                                color: 'var(--tx)',
                                fontWeight: 'bold'
                              }}
                            >
                              DESCRIPCIÓN
                            </th>
                            <th
                              style={{
                                borderRight: '1px solid var(--b1)',
                                borderBottom: '1px solid var(--b1)',
                                padding: '8px',
                                textAlign: 'center',
                                color: 'var(--tx)',
                                fontWeight: 'bold'
                              }}
                            >
                              METRADO OT
                            </th>
                            <th
                              style={{
                                borderBottom: '1px solid var(--b1)',
                                padding: '8px',
                                textAlign: 'center',
                                color: 'var(--tx)',
                                fontWeight: 'bold'
                              }}
                            >
                              UNIDAD
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {instEntries.map(([detCode, vItems], detIdx) =>
                            vItems.map((item, i) => {
                              const isLast = i === vItems.length - 1;
                              const bb = isLast ? '2px solid var(--b1)' : '1px solid var(--b2)';
                              const bg = detIdx % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent';

                              return (
                                <tr key={`${detCode}-${i}`} style={{ borderBottom: bb, background: bg }}>
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
                                          background: 'var(--ad)',
                                          border: '1px solid var(--b1)',
                                          borderRadius: '4px',
                                          padding: '4px 8px',
                                          display: 'inline-block',
                                          fontFamily: 'var(--mo)',
                                          fontSize: '11px',
                                          color: 'var(--tx)',
                                          fontWeight: 'bold'
                                        }}
                                      >
                                        {detCode}
                                      </span>
                                      <button
                                        type="button"
                                        className="btn-ghost"
                                        onClick={() => handleOpenDetalleEdit(detCode, vItems as any, 'BARRA_INST')}
                                        style={{
                                          fontSize: '10px',
                                          padding: '3px 8px',
                                          marginTop: '6px',
                                          display: 'block',
                                          margin: '6px auto 0 auto',
                                          cursor: 'pointer',
                                          borderRadius: '4px',
                                          border: '1px solid var(--b1)',
                                          background: 'var(--s1)'
                                        }}
                                        title={`Editar materiales de ${detCode}`}
                                      >
                                        EDITAR
                                      </button>
                                    </td>
                                  )}
                                  <td
                                    style={{
                                      borderRight: '1px solid var(--b1)',
                                      padding: '8px 10px',
                                      fontFamily: 'var(--mo)',
                                      fontSize: '11.5px',
                                      color: 'var(--tx)',
                                      verticalAlign: 'middle',
                                      lineHeight: 1.4
                                    }}
                                  >
                                    {item.desc}
                                  </td>
                                  <td
                                    style={{
                                      borderRight: '1px solid var(--b1)',
                                      padding: '8px 10px',
                                      fontFamily: 'var(--mo)',
                                      fontSize: '11px',
                                      color: 'var(--tx)',
                                      fontWeight: 'bold',
                                      verticalAlign: 'middle',
                                      textAlign: 'center'
                                    }}
                                  >
                                    {item.metradoOt || item.qty}
                                  </td>
                                  <td
                                    style={{
                                      padding: '8px 10px',
                                      fontFamily: 'var(--mo)',
                                      fontSize: '11px',
                                      color: 'var(--tx)',
                                      fontWeight: 600,
                                      verticalAlign: 'middle',
                                      textAlign: 'center',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {item.unit}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
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
            );
          }

          // Standard rule card (POZO CON CAJA REGISTRO, POZO SIN CAJA REGISTRO, CABLE DESNUDO 4/0, SOLDADURAS, CANALIZADO, etc.)
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
                    <div className="rule-trigger">{r.trigger}</div>
                    <span
                      style={{
                        background: 'var(--s2)',
                        border: '1px solid var(--b1)',
                        color: 'var(--tx)',
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontFamily: 'var(--mo)',
                        marginRight: '90px'
                      }}
                    >
                      {r.subitems.length} {r.subitems.length === 1 ? 'insumo' : 'insumos'}
                    </span>
                  </div>

                  {/* Foldable Row / Banner */}
                  <div
                    onClick={() => toggleRuleExpand(r.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      background: 'var(--s2)',
                      border: '1px solid var(--b1)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      fontSize: '11px',
                      fontFamily: 'var(--mo)',
                      color: 'var(--tx)',
                      margin: '8px 14px 8px 14px',
                      transition: 'all 0.15s ease'
                    }}
                    title="Haga clic para mostrar u ocultar"
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <span>{isExpanded ? '▼' : '▶'}</span>
                      <span>{isExpanded ? 'Ocultar' : 'Mostrar'}</span>
                    </span>
                  </div>

                  {isExpanded && (
                    <div
                      style={{
                        margin: '12px 14px',
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        border: '1px solid var(--b1)',
                        borderRadius: '6px',
                        background: 'var(--s2)'
                      }}
                    >
                      <table
                        style={{
                          width: '100%',
                          minWidth: '500px',
                          borderCollapse: 'collapse',
                          fontFamily: 'var(--mo)',
                          fontSize: '11px'
                        }}
                      >
                        <colgroup>
                          <col style={{ width: '45px' }} />
                          <col style={{ width: 'auto' }} />
                          <col style={{ width: '120px' }} />
                          <col style={{ width: '110px' }} />
                        </colgroup>
                        <thead>
                          <tr style={{ background: 'var(--s1)' }}>
                            <th
                              style={{
                                borderRight: '1px solid var(--b1)',
                                borderBottom: '1px solid var(--b1)',
                                padding: '8px',
                                textAlign: 'center',
                                color: 'var(--tx)',
                                fontWeight: 'bold'
                              }}
                            >
                              #
                            </th>
                            <th
                              style={{
                                borderRight: '1px solid var(--b1)',
                                borderBottom: '1px solid var(--b1)',
                                padding: '8px',
                                textAlign: 'left',
                                color: 'var(--tx)',
                                fontWeight: 'bold'
                              }}
                            >
                              DESCRIPCIÓN
                            </th>
                            <th
                              style={{
                                borderRight: '1px solid var(--b1)',
                                borderBottom: '1px solid var(--b1)',
                                padding: '8px',
                                textAlign: 'center',
                                color: 'var(--tx)',
                                fontWeight: 'bold'
                              }}
                            >
                              METRADO OT / CANT.
                            </th>
                            <th
                              style={{
                                borderBottom: '1px solid var(--b1)',
                                padding: '8px',
                                textAlign: 'center',
                                color: 'var(--tx)',
                                fontWeight: 'bold'
                              }}
                            >
                              UNIDAD
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.subitems.map((s, i) => {
                            const isLast = i === r.subitems.length - 1;
                            return (
                              <tr
                                key={s.id || i}
                                style={{
                                  borderBottom: isLast ? 'none' : '1px solid var(--b2)',
                                  background: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent'
                                }}
                              >
                                <td
                                  style={{
                                    borderRight: '1px solid var(--b1)',
                                    padding: '8px 10px',
                                    textAlign: 'center',
                                    color: 'var(--di)',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {i + 1}
                                </td>
                                <td
                                  style={{
                                    borderRight: '1px solid var(--b1)',
                                    padding: '8px 10px',
                                    fontFamily: 'var(--mo)',
                                    fontSize: '11.5px',
                                    color: 'var(--tx)',
                                    verticalAlign: 'middle',
                                    lineHeight: 1.4
                                  }}
                                >
                                  {s.desc}
                                </td>
                                <td
                                  style={{
                                    borderRight: '1px solid var(--b1)',
                                    padding: '8px 10px',
                                    fontFamily: 'var(--mo)',
                                    fontSize: '11px',
                                    color: 'var(--tx)',
                                    fontWeight: 'bold',
                                    verticalAlign: 'middle',
                                    textAlign: 'center'
                                  }}
                                >
                                  {s.qty}
                                </td>
                                <td
                                  style={{
                                    padding: '8px 10px',
                                    fontFamily: 'var(--mo)',
                                    fontSize: '11px',
                                    color: 'var(--tx)',
                                    fontWeight: 600,
                                    verticalAlign: 'middle',
                                    textAlign: 'center',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {s.unit}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
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

      {editingDetalle && (
        <DetalleEditorModal
          isOpen={detalleModalOpen}
          area={editingDetalle.area}
          detalleCode={editingDetalle.code}
          category={editingDetalle.category}
          initialItems={editingDetalle.items}
          availableCodes={currentAreaCodes}
          onSelectDetalle={(newCode: string) => {
            const itemsForCode = getDetalleItemsForCode(newCode, editingDetalle.category);
            setEditingDetalle({
              code: newCode,
              area: activeArea,
              category: editingDetalle.category,
              items: itemsForCode
            });
          }}
          onClose={() => setDetalleModalOpen(false)}
          onSave={saveDetalleVariant}
        />
      )}
    </div>
  );
};
