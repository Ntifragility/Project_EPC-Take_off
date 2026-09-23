import React from 'react';
import { useItemsStore } from '../../../features/manage-items/model/useItemsStore';
import { ItemEditModal } from '../../../features/manage-items/ui/ItemEditModal';
import { MaterialSummaryModal } from '../../../features/export-takeoff/ui/MaterialSummaryModal';
import { TagSummaryModal } from '../../../features/export-takeoff/ui/TagSummaryModal';
import { AreaSelectModal } from '../../../features/filter-takeoff/ui/AreaSelectModal';
import { Toast } from '../../../shared/ui/Toast';

export interface ModalsHostProps {
  summaryModalOpen: boolean;
  onCloseSummaryModal: () => void;
  tagSummaryModalOpen: boolean;
  onCloseTagSummaryModal: () => void;
  areaModalOpen: boolean;
  onCloseAreaModal: () => void;
}

export const ModalsHost: React.FC<ModalsHostProps> = ({
  summaryModalOpen,
  onCloseSummaryModal,
  tagSummaryModalOpen,
  onCloseTagSummaryModal,
  areaModalOpen,
  onCloseAreaModal
}) => {
  const items = useItemsStore(state => state.items);
  const editingItemId = useItemsStore(state => state.editingItemId);
  const setEditingItemId = useItemsStore(state => state.setEditingItemId);

  const editingItem = editingItemId ? items.find(i => i.id === editingItemId) || null : null;

  return (
    <>
      <ItemEditModal
        isOpen={Boolean(editingItemId && editingItem)}
        item={editingItem}
        onClose={() => setEditingItemId(null)}
      />

      <MaterialSummaryModal
        isOpen={summaryModalOpen}
        onClose={onCloseSummaryModal}
      />

      <TagSummaryModal
        isOpen={tagSummaryModalOpen}
        onClose={onCloseTagSummaryModal}
      />

      <AreaSelectModal
        isOpen={areaModalOpen}
        onClose={onCloseAreaModal}
        canClose={true}
      />

      <Toast />
    </>
  );
};
