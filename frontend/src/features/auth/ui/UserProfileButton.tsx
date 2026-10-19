import React, { useState, useRef, useEffect } from 'react';
import { User, ShieldCheck, Shield, LogOut, UserPlus } from 'lucide-react';
import { getRoleDisplayName } from '../model/authTypes';
import { useAuthStore } from '../model/useAuthStore';

export const UserProfileButton: React.FC = () => {
  const { currentUser, setShowUserManagement, signOut } = useAuthStore();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('pointerdown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [open]);

  if (!currentUser) return null;

  const isLevel3 = currentUser.role === 'Level 3';
  const initials = currentUser.email
    ? currentUser.email.substring(0, 2).toUpperCase()
    : 'U';

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Clickable Profile Avatar Button */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        title={`Sesión activa: ${currentUser.email} (${getRoleDisplayName(currentUser.role)})`}
        aria-label="Perfil de usuario"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isLevel3 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.18)',
          border: isLevel3 ? '1px solid rgba(16, 185, 129, 0.6)' : '1px solid rgba(255, 255, 255, 0.3)',
          color: '#ffffff',
          cursor: 'pointer',
          padding: 0,
          transition: 'all 0.2s',
          fontSize: '11px',
          fontWeight: 700,
          userSelect: 'none'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.borderColor = '#ffffff';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.borderColor = isLevel3 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(255, 255, 255, 0.3)';
        }}
      >
        <User size={14} strokeWidth={2.2} />
      </button>

      {/* Popover Dropdown when clicked */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '250px',
            backgroundColor: '#111216',
            border: '1px solid #262833',
            borderRadius: '12px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.8)',
            padding: '14px 16px',
            zIndex: 9999,
            color: '#ffffff',
            fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* User Info Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: isLevel3 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                border: isLevel3 ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(99, 102, 241, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                color: isLevel3 ? '#34d399' : '#a5b4fc',
                flexShrink: 0
              }}
            >
              {initials}
            </div>

            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={currentUser.email}
              >
                {currentUser.email}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                {currentUser.role === 'Level 3' ? (
                  <span
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      borderRadius: '9999px',
                      padding: '1px 8px',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <ShieldCheck size={11} />
                    <span>Level 3</span>
                  </span>
                ) : currentUser.role === 'Level 2' ? (
                  <span
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      color: '#fbbf24',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: '9999px',
                      padding: '1px 8px',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Shield size={11} />
                    <span>Level 2</span>
                  </span>
                ) : (
                  <span
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      color: '#93c5fd',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      borderRadius: '9999px',
                      padding: '1px 8px',
                      fontSize: '10.5px',
                      fontWeight: 500,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <User size={10} />
                    <span>Level 1</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Area & Admin details */}
          <div
            style={{
              fontSize: '11.5px',
              color: '#9ca3af',
              backgroundColor: '#16171e',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #22242e',
              marginBottom: '10px'
            }}
          >
            <div>
              <strong style={{ color: '#d1d5db' }}>Área:</strong> {currentUser.area || 'Todas las áreas'}
            </div>
            {currentUser.adminName && (
              <div style={{ marginTop: '2px' }}>
                <strong style={{ color: '#d1d5db' }}>Nombre:</strong> {currentUser.adminName}
              </div>
            )}
            {currentUser.dni && (
              <div style={{ marginTop: '2px' }}>
                <strong style={{ color: '#d1d5db' }}>DNI:</strong> {currentUser.dni}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid #22242e', margin: '8px 0' }} />

          {/* Level 3 Management Option */}
          {isLevel3 && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setShowUserManagement(true);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 10px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: '#e4e4e7',
                fontSize: '12.5px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.15s',
                marginBottom: '4px'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#1c1e27';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#e4e4e7';
              }}
            >
              <UserPlus size={14} color="#818cf8" />
              <span>Gestión de Usuarios</span>
            </button>
          )}

          {/* Logout Option */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 10px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: '#f87171',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={14} color="#f87171" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      )}
    </div>
  );
};
