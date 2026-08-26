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
        ? 'Entorno ÁREA HÚMEDA activado'
        : 'Entorno ÁREA SECA activado',
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
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--tx)', letterSpacing: '1px' }}>
            SELECCIONAR ÁREA DE TRABAJO
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
              border: activeArea === 'AREA SECA' ? '1px solid var(--tx)' : '1px solid var(--b1)',
              borderRadius: '10px',
              padding: '22px',
              cursor: 'pointer',
              transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: activeArea === 'AREA SECA' ? '0 0 0 1px var(--tx)' : 'none'
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--tx)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor =
                activeArea === 'AREA SECA' ? 'var(--tx)' : 'var(--b1)';
              (e.currentTarget as HTMLElement).style.transform = 'none';
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', color: 'var(--mu)', fontFamily: 'var(--mo)' }}>SEC</span>
                {activeArea === 'AREA SECA' && (
                  <span
                    style={{
                      background: 'var(--tx)',
                      color: 'var(--bg)',
                      fontSize: '10px',
                      fontFamily: 'var(--mo)',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      letterSpacing: '0.5px'
                    }}
                  >
                    ACTIVA
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--tx)',
                  marginTop: '12px',
                  letterSpacing: '-0.01em'
                }}
              >
                ÁREA SECA
              </div>
              <div style={{ fontSize: '12px', color: 'var(--mu)', marginTop: '4px' }}>
                Ambientes interiores y estándar
              </div>

              <div
                style={{
                  marginTop: '16px',
                  borderTop: '1px solid var(--b2)',
                  paddingTop: '14px',
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
                background: activeArea === 'AREA SECA' ? 'var(--tx)' : 'transparent',
                color: activeArea === 'AREA SECA' ? 'var(--bg)' : 'var(--tx)',
                border: '1px solid var(--tx)',
                fontWeight: 600,
                fontSize: '11.5px',
                letterSpacing: '0.5px'
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
              border: activeArea === 'AREA HUMEDA' ? '1px solid var(--tx)' : '1px solid var(--b1)',
              borderRadius: '10px',
              padding: '22px',
              cursor: 'pointer',
              transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: activeArea === 'AREA HUMEDA' ? '0 0 0 1px var(--tx)' : 'none'
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--tx)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor =
                activeArea === 'AREA HUMEDA' ? 'var(--tx)' : 'var(--b1)';
              (e.currentTarget as HTMLElement).style.transform = 'none';
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', color: 'var(--mu)', fontFamily: 'var(--mo)' }}>HUM</span>
                {activeArea === 'AREA HUMEDA' && (
                  <span
                    style={{
                      background: 'var(--tx)',
                      color: 'var(--bg)',
                      fontSize: '10px',
                      fontFamily: 'var(--mo)',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      letterSpacing: '0.5px'
                    }}
                  >
                    ACTIVA
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--tx)',
                  marginTop: '12px',
                  letterSpacing: '-0.01em'
                }}
              >
                ÁREA HÚMEDA
              </div>
              <div style={{ fontSize: '12px', color: 'var(--mu)', marginTop: '4px' }}>
                Ambientes corrosivos / alta humedad
              </div>

              <div
                style={{
                  marginTop: '16px',
                  borderTop: '1px solid var(--b2)',
                  paddingTop: '14px',
                  fontSize: '12px',
                  color: 'var(--mu)',
                  lineHeight: 1.6
                }}
              >
                <div>• <strong>BARRA POT:</strong> Detalles 010/17A, 010/17B</div>
                <div>• <strong>BARRA INST:</strong> Detalles 010/17C, 010/17D</div>
                <div>• Soportes Omega Inox y Pernos SS316</div>
                <div>• Detalles especiales 008/5, 009/8, 010/13...</div>
              </div>
            </div>

            <button
              className="btn-primary"
              style={{
                marginTop: '20px',
                width: '100%',
                background: activeArea === 'AREA HUMEDA' ? 'var(--tx)' : 'transparent',
                color: activeArea === 'AREA HUMEDA' ? 'var(--bg)' : 'var(--tx)',
                border: '1px solid var(--tx)',
                fontWeight: 600,
                fontSize: '11.5px',
                letterSpacing: '0.5px'
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

