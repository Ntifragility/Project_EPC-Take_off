import React, { useEffect, useState } from 'react';
import { ToastState } from '../types/common';

export interface ToastProps {
  toast?: ToastState | null;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!visible || !toast) return null;

  return (
    <div
      id="toast"
      className={`toast ${toast.type === 'warn' ? 'warn' : ''}`}
      style={{ display: 'block' }}
    >
      {toast.message}
    </div>
  );
};
