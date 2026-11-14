import React from 'react';
import { useItemsStore } from '../../../features/manage-items/model/useItemsStore';
import { ItemEditModal } from '../../../features/manage-items/ui/ItemEditModal';
import { DetalleChangeModal } from '../../../features/manage-items/ui/DetalleChangeModal';
import { AreaSelectModal } from '../../../features/filter-takeoff/ui/AreaSelectModal';
import { useUIStore } from '../../../features/filter-takeoff/model/useUIStore';
import { useAppStore } from '../../../features/app-config/model/useAppStore';
import { RuleTriggerModal } from '../../../features/apply-rule/ui/RuleTriggerModal';
import { Toast } from '../../../shared/ui/Toast';
import { SitePrompt } from '../../../shared/ui/SitePromptDialog';

class ModalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Modal caught runtime error:', error, info);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export interface ModalsHostProps {
  areaModalOpen: boolean;
  onCloseAreaModal: () => void;
}

export const ModalsHost: React.FC<ModalsHostProps> = ({
  areaModalOpen,
  onCloseAreaModal
}) => {
  const items = useItemsStore(state => state.items);
  const editingItemId = useItemsStore(state => state.editingItemId);
  const setEditingItemId = useItemsStore(state => state.setEditingItemId);

  const editingItem = editingItemId ? items.find(i => i.id === editingItemId) || null : null;
  const toast = useUIStore(state => state.toast);
  const pendingRule = useUIStore(state => state.pendingRule);
  const setPendingRule = useUIStore(state => state.setPendingRule);
  const activeArea = useAppStore(state => state.activeArea);
  const section = useAppStore(state => state.section);

  return (
    <>
      <ItemEditModal
        isOpen={Boolean(editingItemId && editingItem)}
        item={editingItem}
        onClose={() => setEditingItemId(null)}
      />

      <DetalleChangeModal />

      <ModalErrorBoundary key={pendingRule?.id || 'none'}>
        {pendingRule && section !== 'bductos' && (
          <RuleTriggerModal
            isOpen={true}
            rule={pendingRule}
            activeArea={activeArea}
            onClose={() => setPendingRule(null)}
          />
        )}
      </ModalErrorBoundary>

      <AreaSelectModal
        isOpen={areaModalOpen}
        onClose={onCloseAreaModal}
        canClose={true}
      />

      <Toast toast={toast} />
      <SitePrompt />
    </>
  );
};
