import React, { useState, useEffect } from 'react';
import { TakeoffProvider, useTakeoff } from './context/TakeoffContext';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { TakeoffView } from './components/Takeoff/TakeoffView';
import { RulesView } from './components/Rules/RulesView';
import { PackagesView } from './components/Packages/PackagesView';
import { MaterialSummaryModal } from './components/Modals/MaterialSummaryModal';
import { AreaSelectModal } from './components/Modals/AreaSelectModal';
import { TagSummaryModal } from './components/Modals/TagSummaryModal';

const AppContent: React.FC = () => {
  const { tab, customPlano, setCustomPlano } = useTakeoff();
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [tagSummaryModalOpen, setTagSummaryModalOpen] = useState(false);

  // When opening the site, if no active area is chosen yet, open the 2-card selector modal
  useEffect(() => {
    if (!localStorage.getItem('epc-active-area')) {
      setAreaModalOpen(true);
    }
  }, []);

  // Initial Plano prompt for first-time session
  useEffect(() => {
    if (!localStorage.getItem('epc-plano') && !customPlano) {
      let plano = '';
      while (true) {
        plano = (
          window.prompt(
            'BIENVENIDO A EPC TAKEOFF\n\n' +
              'Ingresa el PLANO del proyecto.\n' +
              'Formato requerido (6 partes separadas por guión):\n\n' +
              '  P22-DA-2151-07-GL-001\n\n' +
              'Este valor se usará para generar el TAG ÚNICO automáticamente.'
          ) || ''
        )
          .trim()
          .toUpperCase();

        if (plano && plano.split('-').length >= 6) {
          break;
        }
        window.alert(
          'PLANO inválido.\n\n' +
            'Debe tener al menos 6 partes separadas por guión.\n' +
            'Ejemplo: P22-DA-2151-07-GL-001'
        );
      }
      setCustomPlano(plano);
    }
  }, []);

  return (
    <>
      <Header
        onOpenSummaryModal={() => setSummaryModalOpen(true)}
        onOpenAreaModal={() => setAreaModalOpen(true)}
        onOpenTagSummaryModal={() => setTagSummaryModalOpen(true)}
      />

      <main className="main" id="main-content">
        {tab === 'takeoff' && <TakeoffView />}
        {tab === 'rules' && <RulesView />}
        {tab === 'packages' && <PackagesView />}
      </main>

      <MaterialSummaryModal
        isOpen={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
      />

      <TagSummaryModal
        isOpen={tagSummaryModalOpen}
        onClose={() => setTagSummaryModalOpen(false)}
      />

      <AreaSelectModal
        isOpen={areaModalOpen}
        onClose={() => setAreaModalOpen(false)}
        canClose={true}
      />

      <Toast />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <TakeoffProvider>
      <AppContent />
    </TakeoffProvider>
  );
};

export default App;
