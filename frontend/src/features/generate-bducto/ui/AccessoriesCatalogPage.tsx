import React, { useState } from 'react';
import { CurveCatalogPage } from './CurveCatalogPage';
import { JointLossCatalogSection } from './JointLossCatalogSection';
import { MaterialCatalogSection } from './MaterialCatalogSection';
import './bductos.css';

export const AccessoriesCatalogPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'curvas' | 'embone' | 'materiales'>('curvas');

  return (
    <div className="accessories-catalog-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
      {/* Sub-navegación unificada con el diseño corporativo */}
      <nav className="accessories-subnav" aria-label="Secciones de Accesorios y Catálogos">
        <button
          type="button"
          className={`accessories-subnav-btn ${subTab === 'curvas' ? 'active' : ''}`}
          onClick={() => setSubTab('curvas')}
        >
          Curvas
        </button>
        <button
          type="button"
          className={`accessories-subnav-btn ${subTab === 'embone' ? 'active' : ''}`}
          onClick={() => setSubTab('embone')}
        >
          Pérdida por embone
        </button>
        <button
          type="button"
          className={`accessories-subnav-btn ${subTab === 'materiales' ? 'active' : ''}`}
          onClick={() => setSubTab('materiales')}
        >
          Materiales (Tubo, Unión, etc.)
        </button>
      </nav>

      {/* Contenido de la sección activa */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {subTab === 'curvas' && <CurveCatalogPage />}
        {subTab === 'embone' && <JointLossCatalogSection />}
        {subTab === 'materiales' && <MaterialCatalogSection />}
      </div>
    </div>
  );
};
