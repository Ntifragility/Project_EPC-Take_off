import React, { useState } from 'react';
import { X, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../model/useAuthStore';
import { UserRole } from '../model/authTypes';

interface RegisterUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegisterUserModal: React.FC<RegisterUserModalProps> = ({ isOpen, onClose }) => {
  const { registerUser, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Operario');
  const [area, setArea] = useState('Todas las áreas');
  const [adminName, setAdminName] = useState('');
  const [dni, setDni] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError('El correo electrónico es obligatorio.');
      return;
    }

    const res = await registerUser({
      email,
      password: password || undefined,
      role,
      area,
      adminName: adminName || undefined,
      dni: dni || undefined
    });

    if (res.success) {
      onClose();
      setEmail('');
      setPassword('');
      setAdminName('');
      setDni('');
      setRole('Operario');
      setArea('Todas las áreas');
    } else {
      setError(res.error || 'Error al registrar el usuario.');
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
          maxWidth: '480px',
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
              <UserPlus size={18} color="#818cf8" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Registrar Nuevo Usuario</h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Cree una cuenta con rol y permisos específicos</p>
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

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px'
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
              Correo Electrónico *
            </label>
            <input
              type="email"
              required
              placeholder="usuario@empresa.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#1b1c23',
                border: '1px solid #2e303d',
                borderRadius: '8px',
                padding: '9px 12px',
                color: '#ffffff',
                fontSize: '13.5px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
              Contraseña Inicial (Opcional)
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#1b1c23',
                border: '1px solid #2e303d',
                borderRadius: '8px',
                padding: '9px 12px',
                color: '#ffffff',
                fontSize: '13.5px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Rol *
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                style={{
                  width: '100%',
                  backgroundColor: '#1b1c23',
                  border: '1px solid #2e303d',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <option value="Operario">Level 1 - Operario</option>
                <option value="Superv">Level 2 - Superv</option>
                <option value="Admin">Level 3 - Admin</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Área Asignada *
              </label>
              <select
                value={area}
                onChange={e => setArea(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#1b1c23',
                  border: '1px solid #2e303d',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <option value="Todas las áreas">Todas las áreas</option>
                <option value="Área Húmeda">Área Húmeda</option>
                <option value="Área Seca">Área Seca</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '22px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Nombre / Administrador
              </label>
              <input
                type="text"
                placeholder="Ej. Juan Pérez"
                value={adminName}
                onChange={e => setAdminName(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#1b1c23',
                  border: '1px solid #2e303d',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                DNI
              </label>
              <input
                type="text"
                placeholder="8 dígitos"
                value={dni}
                onChange={e => setDni(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#1b1c23',
                  border: '1px solid #2e303d',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #2e303d',
                borderRadius: '8px',
                padding: '9px 16px',
                color: '#9ca3af',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                backgroundColor: '#6366f1',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 20px',
                color: '#ffffff',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              <span>{isLoading ? 'Guardando...' : 'Crear Usuario'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
