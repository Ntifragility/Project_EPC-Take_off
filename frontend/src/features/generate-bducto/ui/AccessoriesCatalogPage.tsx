import React, { useEffect, useState } from 'react';
import { CurveCatalogPage } from './CurveCatalogPage';
import { JointLossCatalogSection } from './JointLossCatalogSection';
import { MaterialCatalogSection } from './MaterialCatalogSection';
import './bductos.css';

const DRAWER_WIDTHS: Record<'curvas' | 'embone' | 'materiales', string> = {
  embone: '520px',
  materiales: '750px',
  curvas: '760px'
};

export const AccessoriesCatalogPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'curvas' | 'embone' | 'materiales'>('curvas');

  // Plan A: Ancho dinámico contextual del Drawer según el contenido de la tabla
  useEffect(() => {
    const drawer = document.querySelector<HTMLElement>('.catalog-drawer');
    if (drawer) {
      drawer.style.setProperty('--drawer-width', DRAWER_WIDTHS[subTab]);
    }
  }, [subTab]);

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
