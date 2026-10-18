import React, { useState } from 'react';
import { UserPlus, Bell, ShieldCheck, Shield, User, X } from 'lucide-react';
import { UserRole } from '../model/authTypes';
import { useAuthStore } from '../model/useAuthStore';
import { RegisterUserModal } from './RegisterUserModal';
import { UserRequestsModal } from './UserRequestsModal';

export const UserManagementModal: React.FC = () => {
  const {
    showUserManagement,
    setShowUserManagement,
    currentUser,
    users,
    requests,
    updateRoleAndArea
  } = useAuthStore();

  const [registerOpen, setRegisterOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);

  if (!showUserManagement) return null;

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99990,
        padding: '24px',
        overflowY: 'auto',
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif"
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1060px',
          backgroundColor: '#0c0d11',
          border: '1px solid #1c1d24',
          borderRadius: '14px',
          padding: '24px 28px 32px 28px',
          color: '#ffffff',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        {/* Top Header Row matching Image 2 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          {/* Left: Icon + Gestión de Usuarios */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserPlus size={22} color="#ffffff" strokeWidth={2.2} />
            <h1
              style={{
                margin: 0,
                fontSize: '19px',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.2px'
              }}
            >
              Gestión de Usuarios
            </h1>
          </div>

          {/* Right: Solicitudes + Registrar Nuevo Usuario */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Solicitudes Button */}
            <button
              type="button"
              onClick={() => setRequestsOpen(true)}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #272833',
                borderRadius: '8px',
                padding: '7px 16px',
                color: '#e4e4e7',
                fontSize: '13.5px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#161720';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Bell size={15} color="#e4e4e7" />
              <span>Solicitudes</span>
              {pendingCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '9999px',
                    padding: '1px 6px',
                    marginLeft: '2px'
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </button>

            {/* Registrar Nuevo Usuario Button */}
            <button
              type="button"
              onClick={() => setRegisterOpen(true)}
              style={{
                backgroundColor: '#6366f1',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                color: '#ffffff',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#4f46e5';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#6366f1';
              }}
            >
              Registrar Nuevo Usuario
            </button>

            {/* Close Button to return to Metrados */}
            <button
              type="button"
              onClick={() => setShowUserManagement(false)}
              title="Volver al Metrado"
              style={{
                background: 'none',
                border: 'none',
                color: '#71717a',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '4px'
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#71717a')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Subtitle matching Image 2 */}
        <h2
          style={{
            margin: '28px 0 20px 0',
            fontSize: '17px',
            fontWeight: 700,
            color: '#ffffff'
          }}
        >
          Lista de Usuarios Registrados
        </h2>

        {/* Scoped CSS to override global spreadsheet table styles */}
        <style>{`
          .users-mgmt-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
          }
          .users-mgmt-table thead,
          .users-mgmt-table thead tr,
          .users-mgmt-table th {
            background: transparent !important;
            background-color: transparent !important;
            border: none !important;
            border-bottom: 1px solid #1c1d25 !important;
            color: #9ca3af !important;
            text-align: left !important;
            box-shadow: none !important;
          }
          .users-mgmt-table tbody tr {
            background: transparent !important;
            background-color: transparent !important;
            border: none !important;
          }
          .users-mgmt-table tbody td {
            background: transparent !important;
            background-color: transparent !important;
            border: none !important;
            border-bottom: 1px solid #16171f !important;
            text-align: left !important;
            height: auto !important;
          }
        `}</style>

        {/* Table matching Image 2 */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table className="users-mgmt-table">
            <thead>
              <tr style={{ borderBottom: '1px solid #1c1d25', background: 'transparent' }}>
                <th
                  style={{
                    padding: '12px 14px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left'
                  }}
                >
                  CORREO ELECTRÓNICO
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left'
                  }}
                >
                  ROL
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left'
                  }}
                >
                  ÁREA
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left'
                  }}
                >
                  DNI / NOMBRE ADMIN
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left'
                  }}
                >
                  F. REGISTRO
                </th>
              </tr>
            </thead>

            <tbody>
              {users.map((user, idx) => {
                const isCurrent = currentUser?.email.toLowerCase() === user.email.toLowerCase();

                return (
                  <tr
                    key={user.id || user.email}
                    style={{
                      borderBottom: idx < users.length - 1 ? '1px solid #16171f' : 'none'
                    }}
                  >
                    {/* CORREO ELECTRÓNICO */}
                    <td style={{ padding: '16px 14px', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#ffffff' }}>
                        {user.email}
                      </span>
                      {isCurrent && (
                        <span
                          style={{
                            color: '#818cf8',
                            fontStyle: 'italic',
                            fontSize: '12.5px',
                            marginLeft: '4px'
                          }}
                        >
                          (Tú)
                        </span>
                      )}
                    </td>

                    {/* ROL */}
                    <td style={{ padding: '16px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        {user.role === 'Admin' ? (
                          <span
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              color: '#34d399',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              borderRadius: '9999px',
                              padding: '4px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <ShieldCheck size={14} color="#34d399" />
                            <span>Level 3 - Admin</span>
                          </span>
                        ) : user.role === 'Superv' ? (
                          <span
                            style={{
                              backgroundColor: 'rgba(245, 158, 11, 0.12)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              borderRadius: '9999px',
                              padding: '4px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Shield size={14} color="#fbbf24" />
                            <span>Level 2 - Superv</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              backgroundColor: 'rgba(59, 130, 246, 0.12)',
                              color: '#93c5fd',
                              border: '1px solid rgba(59, 130, 246, 0.35)',
                              borderRadius: '9999px',
                              padding: '4px 12px',
                              fontSize: '12px',
                              fontWeight: 500,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <User size={13} color="#93c5fd" />
                            <span>Level 1 - Operario</span>
                          </span>
                        )}

                        {!isCurrent && (
                          <select
                            value={user.role}
                            onChange={e => void updateRoleAndArea(user.id, user.email, e.target.value as UserRole, user.area)}
                            title="Cambiar nivel"
                            style={{
                              backgroundColor: '#1b1c23',
                              color: '#9ca3af',
                              border: '1px solid #2d2e3b',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value="Operario">Level 1</option>
                            <option value="Superv">Level 2</option>
                            <option value="Admin">Level 3</option>
                          </select>
                        )}
                      </div>
                    </td>

                    {/* ÁREA */}
                    <td
                      style={{
                        padding: '16px 14px',
                        verticalAlign: 'middle',
                        color: '#d1d5db',
                        fontSize: '13.5px'
                      }}
                    >
                      {user.area || 'Todas las áreas'}
                    </td>

                    {/* DNI / NOMBRE ADMIN */}
                    <td style={{ padding: '16px 14px', verticalAlign: 'middle' }}>
                      {user.adminName ? (
                        <div>
                          <div style={{ color: '#ffffff', fontSize: '13.5px', fontWeight: 500 }}>
                            {user.adminName}
                          </div>
                          {user.dni && (
                            <div style={{ color: '#e4e4e7', fontSize: '12.5px', marginTop: '3px' }}>
                              DNI: {user.dni}
                            </div>
                          )}
                        </div>
                      ) : user.dni ? (
                        <div style={{ color: '#e4e4e7', fontSize: '12.5px' }}>
                          DNI: {user.dni}
                        </div>
                      ) : (
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>—</span>
                      )}
                    </td>

                    {/* F. REGISTRO */}
                    <td
                      style={{
                        padding: '16px 14px',
                        verticalAlign: 'middle',
                        color: '#d1d5db',
                        fontSize: '13px'
                      }}
                    >
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sub-modals */}
      <RegisterUserModal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} />
      <UserRequestsModal isOpen={requestsOpen} onClose={() => setRequestsOpen(false)} />
    </div>
  );
};
