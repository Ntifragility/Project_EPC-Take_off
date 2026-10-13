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

      <RuleTriggerModal
        isOpen={Boolean(pendingRule) && section !== 'bductos'}
        rule={pendingRule}
        activeArea={activeArea}
        onClose={() => setPendingRule(null)}
      />

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
