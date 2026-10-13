import React, { useState, useEffect } from 'react';
import { useAppStore } from '../features/app-config/model/useAppStore';
import { loadInitialCloudConfig } from '../features/sync-cloud/model/useCloudSync';
import { Header } from '../widgets/header/ui/Header';
import { TakeoffPage } from '../pages/takeoff/ui/TakeoffPage';
import { BductosPage } from '../features/generate-bducto/ui/BductosPage';
import { RulesPage } from '../pages/rules/ui/RulesPage';
import { CurveCatalogPage } from '../features/generate-bducto/ui/CurveCatalogPage';
import { PackagesPage } from '../pages/packages/ui/PackagesPage';
import { ModalsHost } from '../widgets/modals-host/ui/ModalsHost';
import { CatalogDrawer } from '../shared/ui/CatalogDrawer';
import { useAuthStore } from '../features/auth/model/useAuthStore';
import { LoginScreen } from '../features/auth/ui/LoginScreen';
import { UserManagementModal } from '../features/auth/ui/UserManagementModal';

export const App: React.FC = () => {
  const tab = useAppStore(state => state.tab);
  const section = useAppStore(state => state.section);
  const setTab = useAppStore(state => state.setTab);
  const isBductos = section === 'bductos';
  const showRules = section === 'pat' && tab === 'rules';
  const showCurves = isBductos && tab === 'curves';

  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const { currentUser, initAuth } = useAuthStore();

  useEffect(() => {
    // Initialize authentication and users
    void initAuth();

    // Load initial cloud configuration asynchronously
    loadInitialCloudConfig();

    // Check if initial area modal needs to be displayed
    if (!localStorage.getItem('epc-active-area')) {
      setAreaModalOpen(true);
    }
  }, []);

  // If user is not logged in, show authentication screen
  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <>
      <Header onOpenAreaModal={() => setAreaModalOpen(true)} />

      <main className="main" id="main-content">
        {isBductos && tab !== 'packages' && <BductosPage />}
        {!isBductos && tab !== 'packages' && <TakeoffPage />}
        {tab === 'packages' && <PackagesPage />}
      </main>

      {showRules && (
        <CatalogDrawer title="Reglas" onClose={() => setTab('takeoff')}>
          <RulesPage />
        </CatalogDrawer>
      )}
      {showCurves && (
        <CatalogDrawer title="Curvas" onClose={() => setTab('takeoff')}>
          <CurveCatalogPage />
        </CatalogDrawer>
      )}

      <ModalsHost
        areaModalOpen={areaModalOpen}
        onCloseAreaModal={() => setAreaModalOpen(false)}
      />

      <UserManagementModal />
    </>
  );
};

export default App;

