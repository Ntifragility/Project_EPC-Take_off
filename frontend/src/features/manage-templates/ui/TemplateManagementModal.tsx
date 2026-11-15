import React, { useRef, useState } from 'react';
import { ModalShell } from '../../../shared/ui/ModalShell';
import { useTemplatesStore } from '../model/useTemplatesStore';
import { TEMPLATE_DEFINITIONS, TemplateKey } from '../model/templateTypes';
import { useAuthStore } from '../../auth/model/useAuthStore';
import { useUIStore } from '../../filter-takeoff/model/useUIStore';
import { siteConfirm } from '../../../shared/ui/askSite';
import { FileSpreadsheet, Upload, Download, RotateCcw, CheckCircle2, Clock, User, HardDrive } from 'lucide-react';
import { downloadMetradoTemplateXlsx } from '../../../shared/lib/excelTemplates';
import { downloadPartidasTemplateXlsx } from '../../../shared/lib/partidasExcel';
import { downloadBductoTemplate } from '../../generate-bducto/model/exportBductosExcel';

export const TemplateManagementModal: React.FC = () => {
  const showModal = useTemplatesStore(state => state.showModal);
  const setShowModal = useTemplatesStore(state => state.setShowModal);
  const templates = useTemplatesStore(state => state.templates);
  const uploadTemplate = useTemplatesStore(state => state.uploadTemplate);
  const restoreDefault = useTemplatesStore(state => state.restoreDefault);
  const downloadTemplate = useTemplatesStore(state => state.downloadTemplate);
  const isLoading = useTemplatesStore(state => state.isLoading);

  const currentUser = useAuthStore(state => state.currentUser);
  const showToast = useUIStore(state => state.showToast);

  const [uploadingKey, setUploadingKey] = useState<TemplateKey | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (!showModal) return null;

  const handleFileSelect = async (key: TemplateKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      showToast('Solo se permiten archivos en formato Excel (.xlsx)', 'warn');
      return;
    }

    setUploadingKey(key);
    try {
      const adminName = currentUser?.adminName || currentUser?.dni || 'Administrador';
      const res = await uploadTemplate(key, file, adminName);
      if (res.success) {
        showToast(`Plantilla "${file.name}" actualizada con éxito`, 'success');
      } else {
        showToast(res.error || 'Error al subir la plantilla', 'warn');
      }
    } finally {
      setUploadingKey(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleRestore = async (key: TemplateKey, name: string) => {
    const ok = await siteConfirm(
      `¿Deseas restaurar la plantilla predeterminada de "${name}"? Se eliminará el archivo personalizado de Base de Datos y volverá a generarse por código.`
    );
    if (!ok) return;

    const res = await restoreDefault(key);
    if (res.success) {
      showToast(`Plantilla "${name}" restaurada al formato predeterminado`, 'info');
    } else {
      showToast(res.error || 'Error al restaurar', 'warn');
    }
  };

  const handleDownload = async (key: TemplateKey) => {
    if (key === 'metrado_pat') {
      await downloadTemplate('metrado_pat', downloadMetradoTemplateXlsx);
    } else if (key === 'partidas_master') {
      await downloadTemplate('partidas_master', downloadPartidasTemplateXlsx);
    } else if (key === 'bductos') {
      await downloadTemplate('bductos', downloadBductoTemplate);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <ModalShell
      title="Gestión de Plantillas Excel"
      subtitle="Sube y gestiona los archivos .xlsx oficiales que descargan los usuarios del sistema"
      onClose={() => setShowModal(false)}
      closeDisabled={isLoading}
      maxWidth="840px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          padding: '10px 14px',
          borderRadius: '6px',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          color: '#93c5fd',
          fontSize: '12px',
          lineHeight: 1.5
        }}>
          💡 <strong>Modo Administrador:</strong> Puedes descargar la plantilla actual, editarla en Microsoft Excel con tus propios formatos corporativos, notas o listas desplegables, y volver a subirla aquí. La versión que subas será la que descarguen todos los usuarios del sistema.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {TEMPLATE_DEFINITIONS.map(def => {
            const customRecord = templates[def.key];
            const isCustom = Boolean(customRecord && customRecord.file_data);
            const isProcessing = uploadingKey === def.key || isLoading;

            return (
              <div
                key={def.key}
                style={{
                  border: isCustom ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--b1)',
                  borderRadius: '8px',
                  background: 'var(--s1)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      padding: '8px',
                      borderRadius: '6px',
                      background: isCustom ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                      color: isCustom ? '#10b981' : '#94a3b8'
                    }}>
                      <FileSpreadsheet size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--tx)' }}>
                          {def.name}
                        </h4>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: '#818cf8'
                        }}>
                          {def.sectionBadge}
                        </span>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: 'var(--tx2)' }}>
                        {def.description}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isCustom ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 9px',
                        borderRadius: '4px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}>
                        <CheckCircle2 size={13} />
                        Personalizada (Oficial)
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        padding: '3px 9px',
                        borderRadius: '4px',
                        background: 'rgba(148, 163, 184, 0.12)',
                        color: '#94a3b8',
                        border: '1px solid rgba(148, 163, 184, 0.25)'
                      }}>
                        Predeterminada (Código)
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--s2)',
                  fontSize: '11.5px',
                  color: 'var(--tx2)',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <HardDrive size={13} />
                    <span>Archivo: <strong>{isCustom ? customRecord!.file_name : def.defaultFileName}</strong></span>
                  </div>
                  {isCustom && (
                    <>
                      <div>
                        Tamaño: <strong>{formatBytes(customRecord!.file_size)}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={13} />
                        <span>Actualizado: {formatDate(customRecord!.updated_at)}</span>
                      </div>
                      {customRecord!.updated_by && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <User size={13} />
                          <span>Por: {customRecord!.updated_by}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => handleDownload(def.key)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      borderRadius: '5px',
                      border: '1px solid var(--b1)',
                      background: 'var(--s1)',
                      color: 'var(--tx)',
                      cursor: 'pointer'
                    }}
                    title="Descargar archivo activo"
                  >
                    <Download size={13} />
                    Descargar actual
                  </button>

                  <input
                    type="file"
                    accept=".xlsx"
                    ref={el => { fileInputRefs.current[def.key] = el; }}
                    style={{ display: 'none' }}
                    onChange={e => handleFileSelect(def.key, e)}
                  />

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => fileInputRefs.current[def.key]?.click()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '5px',
                      border: 'none',
                      background: 'var(--p1)',
                      color: '#ffffff',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      opacity: isProcessing ? 0.7 : 1
                    }}
                    title="Subir archivo .xlsx editado"
                  >
                    <Upload size={13} />
                    {isProcessing ? 'Subiendo...' : 'Subir nuevo .xlsx'}
                  </button>

                  {isCustom && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRestore(def.key, def.name)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        borderRadius: '5px',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: '#f87171',
                        cursor: isProcessing ? 'not-allowed' : 'pointer'
                      }}
                      title="Volver al generador por código"
                    >
                      <RotateCcw size={13} />
                      Restaurar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
};
