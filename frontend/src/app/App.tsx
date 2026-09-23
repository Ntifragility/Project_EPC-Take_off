import React, { useState, useEffect } from 'react';
import { useAppStore } from '../features/app-config/model/useAppStore';
import { loadInitialCloudConfig } from '../features/sync-cloud/model/useCloudSync';
import { Header } from '../widgets/header/ui/Header';
import { TakeoffPage } from '../pages/takeoff/ui/TakeoffPage';
import { RulesPage } from '../pages/rules/ui/RulesPage';
import { PackagesPage } from '../pages/packages/ui/PackagesPage';
import { ModalsHost } from '../widgets/modals-host/ui/ModalsHost';

export const App: React.FC = () => {
  const tab = useAppStore(state => state.tab);

  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [tagSummaryModalOpen, setTagSummaryModalOpen] = useState(false);

  useEffect(() => {
    // Load initial cloud configuration asynchronously
    loadInitialCloudConfig();

    // Check if initial area modal needs to be displayed
    if (!localStorage.getItem('epc-active-area')) {
      setAreaModalOpen(true);
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
        {tab === 'takeoff' && <TakeoffPage />}
        {tab === 'rules' && <RulesPage />}
        {tab === 'packages' && <PackagesPage />}
      </main>

      <ModalsHost
        summaryModalOpen={summaryModalOpen}
        onCloseSummaryModal={() => setSummaryModalOpen(false)}
        tagSummaryModalOpen={tagSummaryModalOpen}
        onCloseTagSummaryModal={() => setTagSummaryModalOpen(false)}
        areaModalOpen={areaModalOpen}
        onCloseAreaModal={() => setAreaModalOpen(false)}
      />
    </>
  );
};

export default App;
