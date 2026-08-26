import React from 'react';
import { useTakeoff } from '../../context/TakeoffContext';

interface AreaSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  canClose?: boolean;
}

export const AreaSelectModal: React.FC<AreaSelectModalProps> = ({
  isOpen,
  onClose,
  canClose = true
}) => {
  const { activeArea, setActiveArea, showToast } = useTakeoff();

  if (!isOpen) return null;

  const handleSelectArea = (area: 'AREA SECA' | 'AREA HUMEDA') => {
    setActiveArea(area);
    showToast(
      area === 'AREA HUMEDA'
        ? '💧 Entorno ÁREA HÚMEDA activado (Reglas 010/17A-D habilitadas)'
        : '🏜️ Entorno ÁREA SECA activado',
      'success'
    );
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      id="area-modal-overlay"
      style={{ display: 'flex', zIndex: 1100 }}
      onClick={e => {
        if (canClose && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        style={{
          maxWidth: '780px',
          width: '94%',
          background: 'var(--s1)',
          border: '1px solid var(--b1)',
          borderRadius: '12px',
          padding: '24px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--am)', letterSpacing: '1px' }}>
            ⚡ SELECCIONAR ÁREA DE TRABAJO
          </div>
          <div style={{ fontSize: '13px', color: 'var(--mu)', marginTop: '6px' }}>
            Elige el ambiente del metrado. Esto adaptará automáticamente las reglas, detalles y accesorios.
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '20px'
          }}
        >
          {/* Card 1: AREA SECA */}
          <div
            onClick={() => handleSelectArea('AREA SECA')}
            style={{
              background: 'var(--s2)',
              border: activeArea === 'AREA SECA' ? '2px solid var(--am)' : '1px solid var(--b1)',
              borderRadius: '10px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: activeArea === 'AREA SECA' ? '0 0 16px rgba(255,166,0,0.15)' : 'none'
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--am)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor =
                activeArea === 'AREA SECA' ? 'var(--am)' : 'var(--b1)';
              (e.currentTarget as HTMLElement).style.transform = 'none';
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '28px' }}>🏜️</span>
                {activeArea === 'AREA SECA' && (
                  <span
                    style={{
                      background: 'rgba(255,166,0,0.15)',
                      color: 'var(--am)',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--am)'
                    }}
                  >
                    ACTIVA ✓
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--text)',
                  marginTop: '12px',
                  letterSpacing: '0.5px'
                }}
              >
                ÁREA SECA
              </div>
              <div style={{ fontSize: '11px', color: 'var(--mu)', marginTop: '4px' }}>
                Ambientes interiores y estándar
              </div>

              <div
                style={{
                  marginTop: '16px',
                  borderTop: '1px solid var(--b2)',
                  paddingTop: '12px',
                  fontSize: '12px',
                  color: 'var(--mu)',
                  lineHeight: 1.6
                }}
              >
                <div>• Detalle estándar Cable 2/0 (151, 152, 153...)</div>
                <div>• Puesta a tierra y soldaduras convencionales</div>
                <div>• Tuberia PVC Wheatland / SCH 80 estándar</div>
              </div>
            </div>

            <button
              className="btn-primary"
              style={{
                marginTop: '20px',
                width: '100%',
                background: activeArea === 'AREA SECA' ? 'var(--am)' : 'transparent',
                color: activeArea === 'AREA SECA' ? '#000' : 'var(--am)',
                border: '1px solid var(--am)',
                fontWeight: 700
              }}
              onClick={e => {
                e.stopPropagation();
                handleSelectArea('AREA SECA');
              }}
            >
              {activeArea === 'AREA SECA' ? 'ÁREA SELECCIONADA' : 'SELECCIONAR ÁREA SECA'}
            </button>
          </div>

          {/* Card 2: AREA HUMEDA */}
          <div
            onClick={() => handleSelectArea('AREA HUMEDA')}
            style={{
              background: 'var(--s2)',
              border: activeArea === 'AREA HUMEDA' ? '2px solid var(--am)' : '1px solid var(--b1)',
              borderRadius: '10px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: activeArea === 'AREA HUMEDA' ? '0 0 16px rgba(255,166,0,0.15)' : 'none'
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--am)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor =
                activeArea === 'AREA HUMEDA' ? 'var(--am)' : 'var(--b1)';
              (e.currentTarget as HTMLElement).style.transform = 'none';
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '28px' }}>💧</span>
                {activeArea === 'AREA HUMEDA' && (
                  <span
                    style={{
                      background: 'rgba(255,166,0,0.15)',
                      color: 'var(--am)',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--am)'
                    }}
                  >
                    ACTIVA ✓
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--text)',
                  marginTop: '12px',
                  letterSpacing: '0.5px'
                }}
              >
                ÁREA HÚMEDA
              </div>
              <div style={{ fontSize: '11px', color: 'var(--mu)', marginTop: '4px' }}>
                Ambientes corrosivos / alta humedad
              </div>

              <div
                style={{
                  marginTop: '16px',
                  borderTop: '1px solid var(--b2)',
                  paddingTop: '12px',
                  fontSize: '12px',
                  color: 'var(--mu)',
                  lineHeight: 1.6
                }}
              >
                <div>• <strong>BARRA POT:</strong> Detalles 010/17A, B, C, D</div>
                <div>• Soportes Omega Inox y Pernos SS316</div>
                <div>• Detalles especiales 008/5, 009/8, 010/13...</div>
              </div>
            </div>

            <button
              className="btn-primary"
              style={{
                marginTop: '20px',
                width: '100%',
                background: activeArea === 'AREA HUMEDA' ? 'var(--am)' : 'transparent',
                color: activeArea === 'AREA HUMEDA' ? '#000' : 'var(--am)',
                border: '1px solid var(--am)',
                fontWeight: 700
              }}
              onClick={e => {
                e.stopPropagation();
                handleSelectArea('AREA HUMEDA');
              }}
            >
              {activeArea === 'AREA HUMEDA' ? 'ÁREA SELECCIONADA' : 'SELECCIONAR ÁREA HÚMEDA'}
            </button>
          </div>
        </div>

        {canClose && (
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <button className="btn-ghost" style={{ padding: '6px 20px' }} onClick={onClose}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
