import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { growWindow, prefersReducedMotion, shrinkWindow, takeRestoreAnchor } from './windowMotion';

export type ModalDismissPolicy = 'safe' | 'dirty-confirm' | 'locked';

export const DIRTY_DISCARD_MESSAGE = 'Hay cambios sin guardar. ¿Descartarlos?';

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
  /**
   * Dismiss policy. 'safe' keeps the historical behavior, 'dirty-confirm'
   * asks for confirmation when `isDirty`, 'locked' behaves like `closeDisabled`.
   */
  dismiss?: ModalDismissPolicy;
  /** Whether the modal holds unsaved edits (only used with 'dirty-confirm'). */
  isDirty?: boolean;
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
  dismiss = 'safe',
  isDirty = false,
  maxWidth,
  children
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  // 'locked' is today's closeDisabled path; closeDisabled is kept for callers.
  const locked = dismiss === 'locked' || closeDisabled;
  const overlayAllowed = dismissOnOverlay && !locked;

  useLayoutEffect(() => {
    const modal = modalRef.current;
    const overlay = overlayRef.current;
    const anchor = takeRestoreAnchor();
    if (!modal || !overlay || !anchor || prefersReducedMotion()) return;
    growWindow(modal, overlay, anchor);
  }, []);

  const tryDismiss = () => {
    if (locked) return;
    if (dismiss === 'dirty-confirm' && isDirty && !window.confirm(DIRTY_DISCARD_MESSAGE)) return;
    onClose();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (locked) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (dismiss === 'dirty-confirm' && isDirty && !window.confirm(DIRTY_DISCARD_MESSAGE)) return;
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [locked, dismiss, isDirty, onClose]);

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
        if (event.target === event.currentTarget && overlayAllowed) tryDismiss();
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
            <button type="button" className="modal-close" onClick={tryDismiss} disabled={locked}>
              Cerrar
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};
