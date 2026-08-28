import React from 'react';
import { useTakeoff } from '../../context/TakeoffContext';

interface SearchBarProps {
  filteredCount: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({ filteredCount }) => {
  const {
    searchQuery,
    setSearchQuery,
    filterPlano,
    filterDetalle,
    clearFilters,
    undoSnapshot,
    undoLastAction,
    items
  } = useTakeoff();

  const hasActiveFilters = Boolean(searchQuery || filterPlano || filterDetalle);

  return (
    <div className="search-bar">
      <input
        className="search-input"
        id="search-input"
        type="text"
        placeholder="Buscar por TAG, PLANO o DESCRIPCIÓN..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />

      {hasActiveFilters && (
        <button
          className="btn-ghost btn-sm"
          onClick={clearFilters}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 8px',
            color: '#ef4444',
            borderColor: 'rgba(239, 68, 68, 0.4)',
            borderRadius: '4px'
          }}
          title="Quitar todos los filtros activos"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            <line x1="16" y1="14" x2="22" y2="20" stroke="#ef4444" strokeWidth="2.5" />
            <line x1="22" y1="14" x2="16" y2="20" stroke="#ef4444" strokeWidth="2.5" />
          </svg>
        </button>
      )}

      <div style={{ flex: 1 }} />
      {undoSnapshot && (
        <button
          className="btn-ghost btn-sm btn-danger"
          title="Deshacer la última regla aplicada"
          onClick={undoLastAction}
        >
          DESHACER ADICIÓN
        </button>
      )}
      <span className="item-count">
        {filteredCount} / {items.length} ítems
      </span>
    </div>
  );
};
