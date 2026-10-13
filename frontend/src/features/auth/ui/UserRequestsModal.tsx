import React from 'react';
import { X, Bell, Check, Trash2 } from 'lucide-react';
import { useAuthStore } from '../model/useAuthStore';

interface UserRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserRequestsModal: React.FC<UserRequestsModalProps> = ({ isOpen, onClose }) => {
  const { requests, approveUserRequest, rejectUserRequest } = useAuthStore();
  const pendingRequests = requests.filter(r => r.status === 'pending');

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        padding: '16px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          backgroundColor: '#121318',
          border: '1px solid #282a36',
          borderRadius: '14px',
          padding: '24px 28px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
          color: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Bell size={18} color="#818cf8" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Solicitudes de Acceso</h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                {pendingRequests.length} solicitud(es) pendiente(s) de aprobación
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {pendingRequests.length === 0 ? (
          <div
            style={{
              padding: '36px 16px',
              textAlign: 'center',
              backgroundColor: '#171821',
              borderRadius: '8px',
              border: '1px dashed #2b2e3d',
              color: '#9ca3af',
              fontSize: '13.5px'
            }}
          >
            No hay solicitudes pendientes en este momento.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
            {pendingRequests.map(req => (
              <div
                key={req.id}
                style={{
                  backgroundColor: '#181922',
                  border: '1px solid #282a38',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
                    {req.email}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', gap: '12px' }}>
                    {req.fullName && <span><strong>Nombre:</strong> {req.fullName}</span>}
                    {req.dni && <span><strong>DNI:</strong> {req.dni}</span>}
                    <span><strong>Área:</strong> {req.area}</span>
                    <span><strong>Rol:</strong> {req.roleRequested}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => approveUserRequest(req)}
                    title="Aprobar Solicitud"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#34d399',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Check size={14} />
                    <span>Aprobar</span>
                  </button>

                  <button
                    onClick={() => rejectUserRequest(req.id)}
                    title="Rechazar Solicitud"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#1e2029',
              border: '1px solid #303342',
              color: '#d1d5db',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
