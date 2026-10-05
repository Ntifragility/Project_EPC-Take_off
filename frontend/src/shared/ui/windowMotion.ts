/** Where a minimized prompt collapses, and where it grows back from. */
export const RESTORE_BUTTON_ID = 'bducto-restore-btn';

const MINIMIZE_MS = 260;
const RESTORE_MS = 220;
const EASE_IN = 'cubic-bezier(0.4, 0, 1, 1)';
const EASE_OUT = 'cubic-bezier(0, 0, 0.2, 1)';
const SCRIM = 'rgba(32, 31, 30, 0.45)';

let restoreAnchor: DOMRect | null = null;

export function rememberRestoreAnchor(rect: DOMRect) {
  restoreAnchor = rect;
}

export function takeRestoreAnchor(): DOMRect | null {
  const rect = restoreAnchor;
  restoreAnchor = null;
  return rect;
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function origin(host: DOMRect, target: DOMRect): string {
  const x = target.left + target.width / 2 - host.left;
  const y = target.top + target.height / 2 - host.top;
  return `${x}px ${y}px`;
}

/** Shrink the dialog onto the taskbar button and fade the dim layer behind it. */
export function shrinkWindow(modal: HTMLElement, overlay: HTMLElement, target: HTMLElement): Animation {
  const from = modal.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  modal.style.transformOrigin = origin(from, to);
  const sx = Math.max(to.width / from.width, 0.05);
  const sy = Math.max(to.height / from.height, 0.05);
  overlay.animate(
    [{ backgroundColor: SCRIM }, { backgroundColor: 'rgba(32, 31, 30, 0)' }],
    { duration: MINIMIZE_MS, easing: EASE_IN, fill: 'forwards' }
  );
  return modal.animate(
    [{ transform: 'scale(1, 1)' }, { transform: `scale(${sx}, ${sy})` }],
    { duration: MINIMIZE_MS, easing: EASE_IN, fill: 'forwards' }
  );
}

/** Grow the dialog out of the taskbar button. */
export function growWindow(modal: HTMLElement, overlay: HTMLElement, fromTarget: DOMRect): Animation {
  const full = modal.getBoundingClientRect();
  modal.style.transformOrigin = origin(full, fromTarget);
  const sx = Math.max(fromTarget.width / full.width, 0.05);
  const sy = Math.max(fromTarget.height / full.height, 0.05);
  overlay.animate(
    [{ backgroundColor: 'rgba(32, 31, 30, 0)' }, { backgroundColor: SCRIM }],
    { duration: RESTORE_MS, easing: EASE_OUT, fill: 'both' }
  );
  const animation = modal.animate(
    [{ transform: `scale(${sx}, ${sy})` }, { transform: 'scale(1, 1)' }],
    { duration: RESTORE_MS, easing: EASE_OUT, fill: 'both' }
  );
  animation.finished.finally(() => {
    modal.style.transformOrigin = '';
  });
  return animation;
}
