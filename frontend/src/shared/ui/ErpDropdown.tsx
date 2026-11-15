import React, { useState, useRef, useEffect, useMemo } from 'react';

export interface ErpDropdownOption {
  value: string;
  label: string;
  code?: string;
  description?: string;
  meta?: string;
  group?: string;
}

export interface ErpDropdownProps {
  value: string;
  options: ErpDropdownOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  onChange: (value: string) => void;
  accent?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

export const ErpDropdown: React.FC<ErpDropdownProps> = ({
  value,
  options,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Filtrar opciones...',
  onChange,
  accent = false,
  disabled = false,
  ariaLabel
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find(opt => opt.value === value) || null,
    [options, value]
  );

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);

    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(opt => {
      const hay = `${opt.code || ''} ${opt.label} ${opt.description || ''} ${opt.group || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  const groupedSections = useMemo(() => {
    const groups: { name: string | null; items: ErpDropdownOption[] }[] = [];
    for (const item of filteredOptions) {
      const groupName = item.group || null;
      const existing = groups.find(g => g.name === groupName);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.push({ name: groupName, items: [item] });
      }
    }
    return groups;
  }, [filteredOptions]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => !disabled && setOpen(prev => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '6px 10px',
          minHeight: '34px',
          background: disabled ? 'var(--s1)' : 'var(--bg)',
          border: `1px solid ${open || accent ? '#107c41' : 'var(--b1)'}`,
          borderRadius: '2px',
          color: 'var(--tx)',
          fontSize: '12px',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: open ? '0 0 0 2px rgba(16, 124, 65, 0.14)' : 'none',
          transition: 'border-color 0.12s, box-shadow 0.12s'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minWidth: 0,
            flex: 1,
            overflow: 'hidden'
          }}
        >
          {selectedOption?.code && (
            <span
              style={{
                fontFamily: 'var(--mo)',
                fontSize: '11px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '2px',
                background: 'var(--s1)',
                border: '1px solid var(--b1)',
                color: accent ? '#107c41' : 'var(--tx)',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {selectedOption.code}
            </span>
          )}
          <span
            style={{
              fontWeight: selectedOption ? 600 : 400,
              color: selectedOption ? 'var(--tx)' : 'var(--mu)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {selectedOption?.meta && (
            <span style={{ fontFamily: 'var(--mo)', fontSize: '10px', color: 'var(--mu)' }}>
              {selectedOption.meta}
            </span>
          )}
          <span
            aria-hidden="true"
            style={{
              fontSize: '9px',
              color: open ? '#107c41' : 'var(--mu)',
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.12s'
            }}
          >
            ▼
          </span>
        </div>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 60,
            background: 'var(--bg)',
            border: '1px solid var(--b1)',
            borderRadius: '3px',
            boxShadow: '0 10px 28px rgba(0, 0, 0, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Quick filter bar */}
          <div style={{ padding: '8px', background: 'var(--s1)', borderBottom: '1px solid var(--b1)' }}>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                padding: '5px 8px',
                fontSize: '11px',
                fontFamily: 'var(--mo)',
                border: '1px solid var(--b1)',
                borderRadius: '2px',
                background: 'var(--bg)',
                color: 'var(--tx)',
                outline: 'none'
              }}
            />
          </div>

          {/* Scrollable options */}
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '14px', textAlign: 'center', fontSize: '11px', color: 'var(--mu)' }}>
                Sin coincidencias para "{query}"
              </div>
            ) : (
              groupedSections.map(group => (
                <div key={group.name || '__default__'}>
                  {group.name && (
                    <div
                      style={{
                        padding: '5px 10px',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--mu)',
                        background: 'var(--s1)',
                        borderBottom: '1px solid var(--b2, #e5e7eb)',
                        borderTop: '1px solid var(--b2, #e5e7eb)'
                      }}
                    >
                      {group.name}
                    </div>
                  )}
                  {group.items.map(opt => {
                    const isSelected = opt.value === value;
                    return (
                      <button
                        key={opt.value || '__empty__'}
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setOpen(false);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          padding: '7px 10px',
                          border: 'none',
                          borderBottom: '1px solid var(--b2, #f1f3f5)',
                          borderLeft: isSelected ? '3px solid #107c41' : '3px solid transparent',
                          background: isSelected ? 'rgba(16, 124, 65, 0.08)' : 'transparent',
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: 'var(--tx)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                            {opt.code && (
                              <span
                                style={{
                                  fontFamily: 'var(--mo)',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '2px',
                                  background: isSelected ? 'rgba(16, 124, 65, 0.14)' : 'var(--s1)',
                                  color: isSelected ? '#107c41' : 'var(--tx)',
                                  border: `1px solid ${isSelected ? 'rgba(16, 124, 65, 0.35)' : 'var(--b1)'}`,
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0
                                }}
                              >
                                {opt.code}
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: isSelected ? 700 : 600,
                                color: isSelected ? '#107c41' : 'var(--tx)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {opt.label}
                            </span>
                          </div>
                          {opt.meta && (
                            <span
                              style={{
                                fontFamily: 'var(--mo)',
                                fontSize: '10px',
                                color: isSelected ? '#107c41' : 'var(--mu)',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                              }}
                            >
                              {opt.meta}
                            </span>
                          )}
                        </div>
                        {opt.description && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--mu)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              width: '100%'
                            }}
                          >
                            {opt.description}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
