import React, { useMemo } from 'react';
import { useBductoStore } from '../model/useBductoStore';
import { tramosToAdd } from '../model/importTramos';
import { BductoPromptModal } from './BductoPromptModal';
import { BductoTable } from './BductoTable';
import { BductoPrompt } from '../../../entities/bducto/model/types';
import { expandBducto, promptFromRows } from '../../../entities/bducto/model/expandBducto';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';
import { uid } from '../../../shared/lib/uid';
import './bductos.css';

export const BductosPage: React.FC = () => {
  const rows = useBductoStore(state => state.rows);
  const sources = useBductoStore(state => state.sources);
  const wizardIds = useBductoStore(state => state.wizardIds);
  const wizardIndex = useBductoStore(state => state.wizardIndex);
  const manualDraft = useBductoStore(state => state.manualDraft);
  const clearManualDraft = useBductoStore(state => state.clearManualDraft);
  const commitManualDraft = useBductoStore(state => state.commitManualDraft);
  const setWizard = useBductoStore(state => state.setWizard);
  const moveWizard = useBductoStore(state => state.moveWizard);
  const commitTramo = useBductoStore(state => state.commitTramo);
  const promptMinimized = useBductoStore(state => state.promptMinimized);
  const setPromptMinimized = useBductoStore(state => state.setPromptMinimized);
  const showToast = useUIStore(state => state.showToast);

  const found = useMemo(() => {
    const item = sources.find(source => source.id === wizardIds[wizardIndex]);
    if (!item || item.prompt) return item ?? null;
    const recovered = promptFromRows(item, rows);
    return recovered ? { ...item, prompt: recovered } : item;
  }, [sources, rows, wizardIds, wizardIndex]);
  const manual = manualDraft !== null;
  const current = manualDraft ?? found;

  const confirmPrompt = (prompt: BductoPrompt) => {
    if (!current) return;
    if (manual && manualDraft && current.id === manualDraft.id) {
      const effective = {
        ...manualDraft,
        plano: manualDraft.plano.trim().toUpperCase(),
        tagEnPlano: manualDraft.tagEnPlano.trim().toUpperCase().replace(/\s+/g, ' '),
        desde: prompt.desde.trim().toUpperCase(),
        hasta: prompt.hasta.trim().toUpperCase(),
        quantity: typeof prompt.quantity === 'number' ? prompt.quantity : manualDraft.quantity
      };
      if (tramosToAdd(sources, [effective]).length === 0) {
        showToast('Ese tramo ya está cargado. No lo volví a agregar.', 'warn');
        return;
      }
      const result = expandBducto(effective, prompt, uid);
      if (result.ok === false) {
        showToast(result.error, 'warn');
        return;
      }
      commitManualDraft(effective, prompt, result.rows);
      return;
    }
    const result = expandBducto(current, prompt, uid);
    if (result.ok === false) {
      showToast(result.error, 'warn');
      return;
    }
    commitTramo(current.id, prompt, result.rows);
  };

  return (
    <div className="takeoff-layout">
      <section className="takeoff-content">
        <div id="table-container">
          {rows.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📊</div>
              <div className="empty-title">Sin ítems aún</div>
              <div className="empty-sub">Abre el panel e importa un Excel o CSV de tramos, o agrega un tramo manual</div>
            </div>
          ) : (
            <BductoTable rows={rows} />
          )}
        </div>
      </section>

      <BductoPromptModal
        key={current ? `${current.id}:${wizardIndex}` : 'closed'}
        source={current}
        index={manual ? 1 : wizardIds.length === 0 ? 1 : wizardIndex + 1}
        total={manual ? 1 : wizardIds.length || 1}
        canGoBack={!manual && wizardIndex > 0}
        minimized={promptMinimized}
        manual={manual}
        onMinimize={() => setPromptMinimized(true)}
        onBack={() => moveWizard(wizardIndex - 1)}
        onCancel={() => {
          clearManualDraft();
          setWizard([]);
        }}
        onConfirm={confirmPrompt}
      />
    </div>
  );
};
