import React from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';

export type IconActionKind = 'edit' | 'delete' | 'save' | 'cancel';

const ICONS: Record<IconActionKind, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  edit: Pencil,
  delete: Trash2,
  save: Check,
  cancel: X
};

export interface IconActionButtonProps {
  kind: IconActionKind;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}

export const IconActionButton: React.FC<IconActionButtonProps> = ({
  kind,
  title,
  onClick,
  disabled
}) => {
  const Icon = ICONS[kind];
  return (
    <button
      type="button"
      className={`icon-act-btn icon-act-${kind}`}
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      aria-label={title}
      disabled={disabled}
    >
      <Icon size={16} strokeWidth={2} />
    </button>
  );
};

export const IconActionGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="icon-act-group">{children}</div>
);
