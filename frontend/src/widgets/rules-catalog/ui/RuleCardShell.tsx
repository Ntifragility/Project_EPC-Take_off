import React from 'react';

interface RuleCardShellProps {
  trigger: string;
  badge: string;
  preview?: string[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete?: () => void;
  children?: React.ReactNode;
}

const PREVIEW_LIMIT = 6;

export const RuleCardShell: React.FC<RuleCardShellProps> = ({
  trigger,
  badge,
  preview = [],
  isExpanded,
  onToggleExpand,
  onDelete,
  children
}) => {
  const normalizedTrigger = trigger.trim().toUpperCase();
  const uniquePreview = preview.filter((item, i, all) => {
    const key = item.trim().toUpperCase();
    return key && key !== normalizedTrigger && all.findIndex(x => x.trim().toUpperCase() === key) === i;
  });
  const visiblePreview = uniquePreview.slice(0, PREVIEW_LIMIT);
  const hiddenCount = uniquePreview.length - visiblePreview.length;

  return (
    <div className={`rule-card${isExpanded ? ' is-open' : ''}`}>
      <div
        className="rule-card-head"
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        title={isExpanded ? 'Ocultar detalle' : 'Mostrar detalle'}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpand();
          }
        }}
      >
        <span className="rule-card-chevron" aria-hidden>
          {isExpanded ? '▼' : '▶'}
        </span>
        <div className="rule-trigger">{trigger}</div>
        <div className="rule-card-preview" title={preview.join(' · ')}>
          {visiblePreview.map((item, i) => (
            <span className="rule-card-chip" key={`${item}-${i}`}>
              {item}
            </span>
          ))}
          {hiddenCount > 0 ? <span className="rule-card-chip is-more">+{hiddenCount}</span> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <span className="rule-card-badge">{badge}</span>
          {onDelete && (
            <button
              type="button"
              className="btn-danger-ghost"
              title={`Eliminar regla "${trigger}"`}
              aria-label={`Eliminar regla "${trigger}"`}
              onClick={e => {
                e.stopPropagation();
                if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente la regla "${trigger}"?`)) {
                  onDelete();
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.75,
                transition: 'opacity 0.15s ease'
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.75')}
            >
              ✕
            </button>
          )}
        </div>
      </div>
      {isExpanded && children ? <div className="rule-card-body">{children}</div> : null}
    </div>
  );
};
