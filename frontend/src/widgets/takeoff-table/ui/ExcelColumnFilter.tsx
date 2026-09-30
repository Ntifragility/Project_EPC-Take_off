import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BLANK_FILTER_LABEL } from '../model/columnValue';

export interface ExcelColumnFilterProps {
  values: string[];
  selected?: string[];
  onApply: (values: string[] | null) => void;
}

export const ExcelColumnFilter: React.FC<ExcelColumnFilterProps> = ({ values, selected, onApply }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const isActive = selected != null;

  const visibleValues = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return values;
    return values.filter(value => (value || BLANK_FILTER_LABEL).toLowerCase().includes(q));
  }, [query, values]);

  const allVisibleChecked = visibleValues.length > 0 && visibleValues.every(value => draft.has(value));

  const placeMenu = () => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = 260;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    setMenuPos({ top: rect.bottom + 4, left });
  };

  const openMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDraft(new Set(selected == null ? values : selected));
    setQuery('');
    setOpen(true);
    requestAnimationFrame(placeMenu);
  };

  useEffect(() => {
    if (!open) return;
    placeMenu();
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onLayout = () => placeMenu();
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [open]);

  const toggleValue = (value: string) => {
    setDraft(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const toggleVisible = () => {
    setDraft(prev => {
      const next = new Set(prev);
      if (allVisibleChecked) {
        visibleValues.forEach(value => next.delete(value));
      } else {
        visibleValues.forEach(value => next.add(value));
      }
      return next;
    });
  };

  const apply = () => {
    const everyValueChecked = values.every(value => draft.has(value));
    onApply(everyValueChecked ? null : Array.from(draft));
    setOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`excel-filter-btn${isActive ? ' is-active' : ''}`}
        aria-label={isActive ? 'Filtro activo. Abrir filtro de columna' : 'Abrir filtro de columna'}
        title={isActive ? 'Filtro activo' : 'Filtrar'}
        onMouseDown={event => event.stopPropagation()}
        onClick={openMenu}
      />
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="excel-filter-menu"
            style={{ top: menuPos.top, left: menuPos.left }}
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="excel-filter-hd">Filtro de columna</div>
            <input
              className="excel-filter-search"
              value={query}
              autoFocus
              placeholder="Buscar"
              onChange={event => setQuery(event.target.value)}
            />
            <label className="excel-filter-option excel-filter-all">
              <input type="checkbox" checked={allVisibleChecked} onChange={toggleVisible} />
              <span>(Seleccionar todo)</span>
            </label>
            <div className="excel-filter-list">
              {visibleValues.length === 0 ? (
                <div className="excel-filter-empty">No hay coincidencias</div>
              ) : (
                visibleValues.map(value => (
                  <label key={value || '__blank'} className="excel-filter-option">
                    <input
                      type="checkbox"
                      checked={draft.has(value)}
                      onChange={() => toggleValue(value)}
                    />
                    <span>{value || BLANK_FILTER_LABEL}</span>
                  </label>
                ))
              )}
            </div>
            <div className="excel-filter-actions">
              <button type="button" className="btn btn-primary" onClick={apply}>
                Aceptar
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
