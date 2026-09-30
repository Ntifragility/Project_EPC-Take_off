import React from 'react';
import { useAppStore } from '../../app-config/model/useAppStore';
import { useUIStore } from '../model/useUIStore';
import { ModalShell } from '../../../shared/ui/ModalShell';

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
  const activeArea = useAppStore(state => state.activeArea);
  const setActiveArea = useAppStore(state => state.setActiveArea);
  const showToast = useUIStore(state => state.showToast);

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
    <ModalShell
      title="Seleccionar área de trabajo"
      subtitle="Esto adapta reglas, detalles y accesorios del metrado."
      onClose={canClose ? onClose : () => undefined}
      closeDisabled={!canClose}
      maxWidth="780px"
    >
      <div className="modal-body">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px'
          }}
        >
          <div
            className={`modal-choice${activeArea === 'AREA SECA' ? ' is-active' : ''}`}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }}
            onClick={() => handleSelectArea('AREA SECA')}
          >
            <div style={{ fontWeight: 700, fontSize: '15px' }}>ÁREA SECA</div>
            <div style={{ fontSize: '12px', color: 'var(--mu)', lineHeight: 1.5 }}>
              Ambientes interiores y estándar. Detalle de cable 2/0 (151, 152, 153), puesta a tierra
              convencional y tubería PVC SCH 80.
            </div>
            <button
              type="button"
              className={activeArea === 'AREA SECA' ? 'btn-primary' : 'btn-ghost'}
              onClick={e => {
                e.stopPropagation();
                handleSelectArea('AREA SECA');
              }}
            >
              {activeArea === 'AREA SECA' ? 'Área seleccionada' : 'Seleccionar área seca'}
            </button>
          </div>

          <div
            className={`modal-choice${activeArea === 'AREA HUMEDA' ? ' is-active' : ''}`}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }}
            onClick={() => handleSelectArea('AREA HUMEDA')}
          >
            <div style={{ fontWeight: 700, fontSize: '15px' }}>ÁREA HÚMEDA</div>
            <div style={{ fontSize: '12px', color: 'var(--mu)', lineHeight: 1.5 }}>
              Ambientes corrosivos. BARRA POT 010/17A–B, BARRA INST 010/17C–D, soportes inox y
              detalles 008/5, 009/8, 010/13.
            </div>
            <button
              type="button"
              className={activeArea === 'AREA HUMEDA' ? 'btn-primary' : 'btn-ghost'}
              onClick={e => {
                e.stopPropagation();
                handleSelectArea('AREA HUMEDA');
              }}
            >
              {activeArea === 'AREA HUMEDA' ? 'Área seleccionada' : 'Seleccionar área húmeda'}
            </button>
          </div>
        </div>
      </div>
      {canClose && (
        <div className="modal-ft">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
      )}
    </ModalShell>
  );
};
