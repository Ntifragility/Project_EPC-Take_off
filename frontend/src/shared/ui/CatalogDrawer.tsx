import React, { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';

interface CatalogDrawerProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const CatalogDrawer: React.FC<CatalogDrawerProps> = ({ title, onClose, children }) => {
  const [top, setTop] = useState(82);

  useEffect(() => {
    const measure = () => {
      const header = document.querySelector('.header');
      if (header) setTop(Math.round(header.getBoundingClientRect().height));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.classList.add('catalog-drawer-open');
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('catalog-drawer-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <>
      <button
        type="button"
        className="catalog-drawer-backdrop"
        style={{ top }}
        aria-label={`Cerrar ${title}`}
        onClick={onClose}
      />
      <aside className="catalog-drawer" style={{ top }} role="dialog" aria-label={title}>
        <div className="catalog-drawer-bar">
          <button type="button" className="catalog-drawer-close" onClick={onClose}>
            <ChevronLeft size={16} strokeWidth={2} />
            Metrado
          </button>
          <span className="catalog-drawer-title">{title}</span>
          <div id="catalog-subnav-actions" className="catalog-subnav-actions" />
        </div>
        <div className="catalog-drawer-body">{children}</div>
      </aside>
    </>
  );
};
