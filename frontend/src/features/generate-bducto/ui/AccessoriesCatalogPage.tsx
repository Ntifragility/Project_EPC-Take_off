import React, { useState } from 'react';
import { CurveCatalogPage } from './CurveCatalogPage';
import { JointLossCatalogSection } from './JointLossCatalogSection';

export const AccessoriesCatalogPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'curvas' | 'embone'>('curvas');

  return (
    <div className="accessories-catalog-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub-navigation bar inside drawer */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '10px 20px',
          borderBottom: '1px solid #22242e',
          backgroundColor: '#0d0e12'
        }}
      >
        <button
          type="button"
          onClick={() => setSubTab('curvas')}
          style={{
            padding: '6px 16px',
            fontSize: '12.5px',
            fontWeight: subTab === 'curvas' ? 600 : 500,
            color: subTab === 'curvas' ? '#ffffff' : '#9ca3af',
            backgroundColor: subTab === 'curvas' ? '#1c1e28' : 'transparent',
            border: subTab === 'curvas' ? '1px solid #333647' : '1px solid transparent',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          Curvas
        </button>
        <button
          type="button"
          onClick={() => setSubTab('embone')}
          style={{
            padding: '6px 16px',
            fontSize: '12.5px',
            fontWeight: subTab === 'embone' ? 600 : 500,
            color: subTab === 'embone' ? '#ffffff' : '#9ca3af',
            backgroundColor: subTab === 'embone' ? '#1c1e28' : 'transparent',
            border: subTab === 'embone' ? '1px solid #333647' : '1px solid transparent',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          Pérdida por embone
        </button>
      </div>

      {/* Active Section Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {subTab === 'curvas' ? <CurveCatalogPage /> : <JointLossCatalogSection />}
      </div>
    </div>
  );
};
