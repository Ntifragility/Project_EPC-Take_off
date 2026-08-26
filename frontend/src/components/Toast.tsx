import React, { useEffect, useState } from 'react';
import { useTakeoff } from '../context/TakeoffContext';

export const Toast: React.FC = () => {
  const { toast } = useTakeoff();
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

