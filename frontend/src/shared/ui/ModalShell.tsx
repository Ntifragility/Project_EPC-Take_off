import React, { useLayoutEffect, useRef } from 'react';
import { growWindow, prefersReducedMotion, shrinkWindow, takeRestoreAnchor } from './windowMotion';

export interface ModalShellProps {
  title: string;
  subtitle?: React.ReactNode;
  onClose: () => void;
  onMinimize?: () => void;
  /** Mount the landing button before the shrink animation measures it. */
  onPrepareMinimize?: () => void;
  minimizeTargetId?: string;
  closeDisabled?: boolean;
  /** Backdrop click closes the window. The BDUCTOS prompt keeps edits until Cancelar or Cerrar. */
  dismissOnOverlay?: boolean;
  maxWidth?: string | number;
  children: React.ReactNode;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  title,
  subtitle,
  onClose,
  onMinimize,
  onPrepareMinimize,
  minimizeTargetId,
  closeDisabled,
  dismissOnOverlay = true,
  maxWidth,
  children
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useLayoutEffect(() => {
    const modal = modalRef.current;
    const overlay = overlayRef.current;
    const anchor = takeRestoreAnchor();
    if (!modal || !overlay || !anchor || prefersReducedMotion()) return;
    growWindow(modal, overlay, anchor);
  }, []);

  const handleMinimize = () => {
    if (!onMinimize || busy.current) return;
    onPrepareMinimize?.();
    const modal = modalRef.current;
    const overlay = overlayRef.current;
    const target = minimizeTargetId ? document.getElementById(minimizeTargetId) : null;
    if (prefersReducedMotion() || !modal || !overlay || !(target instanceof HTMLElement)) {
      onMinimize();
      return;
    }
    busy.current = true;
    shrinkWindow(modal, overlay, target).finished.finally(() => {
      busy.current = false;
      if (!overlayRef.current) return;
      onMinimize();
    });
  };

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={event => {
        if (busy.current) return;
        if (event.target === event.currentTarget && dismissOnOverlay && !closeDisabled) onClose();
      }}
    >
      <div className="modal" ref={modalRef} style={maxWidth ? { maxWidth } : undefined}>
        <div className="modal-hd">
          <div className="modal-hd-text">
            <div className="modal-hd-title">{title}</div>
            {subtitle ? <div className="modal-hd-sub">{subtitle}</div> : null}
          </div>
          <div className="modal-hd-actions">
            {onMinimize ? (
              <button type="button" className="modal-close" onClick={handleMinimize}>
                Minimizar
              </button>
            ) : null}
            <button type="button" className="modal-close" onClick={onClose} disabled={closeDisabled}>
              Cerrar
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};
