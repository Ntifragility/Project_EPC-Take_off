import React from 'react';

interface RuleCardShellProps {
  trigger: string;
  badge: string;
  preview?: string[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}

const PREVIEW_LIMIT = 6;

export const RuleCardShell: React.FC<RuleCardShellProps> = ({
  trigger,
  badge,
  preview = [],
  isExpanded,
  onToggleExpand,
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
        <span className="rule-card-badge">{badge}</span>
      </div>
      {isExpanded && children ? <div className="rule-card-body">{children}</div> : null}
    </div>
  );
};
