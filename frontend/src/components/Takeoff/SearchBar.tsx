import React from 'react';
import { useTakeoff } from '../../context/TakeoffContext';

interface SearchBarProps {
  filteredCount: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({ filteredCount }) => {
  const { searchQuery, setSearchQuery, undoSnapshot, undoLastAction, items } = useTakeoff();

  return (
    <div className="search-bar">
      <input
        className="search-input"
        id="search-input"
        type="text"
        placeholder="Buscar por TAG EN PLANO en el metrado..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />
      {searchQuery && (
        <button className="btn-ghost btn-sm" onClick={() => setSearchQuery('')}>
          LIMPIAR
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

