import React from 'react';

export interface ModalShellProps {
  title: string;
  subtitle?: React.ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  maxWidth?: string | number;
  children: React.ReactNode;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  title,
  subtitle,
  onClose,
  closeDisabled,
  maxWidth,
  children
}) => (
  <div
    className="modal-overlay"
    onClick={e => {
      if (e.target === e.currentTarget && !closeDisabled) onClose();
    }}
  >
    <div className="modal" style={maxWidth ? { maxWidth } : undefined}>
      <div className="modal-hd">
        <div className="modal-hd-text">
          <div className="modal-hd-title">{title}</div>
          {subtitle ? <div className="modal-hd-sub">{subtitle}</div> : null}
        </div>
        <button type="button" className="modal-close" onClick={onClose} disabled={closeDisabled}>
          Cerrar
        </button>
      </div>
      {children}
    </div>
  </div>
);
