import React, { useState } from 'react';
import { Mail, Key, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../model/useAuthStore';
import { UserRole } from '../model/authTypes';
import { submitAccessRequest } from '../api/authApi';

export const LoginScreen: React.FC = () => {
  const { signIn, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'reset' | 'register'>('login');

  // Register form state
  const [regEmail, setRegEmail] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regDni, setRegDni] = useState('');
  const [regArea, setRegArea] = useState('Todas las áreas');
  const [regRole, setRegRole] = useState<UserRole>('Operario');
  const [regSuccess, setRegSuccess] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regMsg, setRegMsg] = useState('');

  // Reset password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    await signIn(email, password);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail) return;
    setRegLoading(true);
    setRegMsg('');
    const res = await submitAccessRequest({
      email: regEmail,
      fullName: regFullName,
      dni: regDni,
      area: regArea,
      roleRequested: regRole
    });
    setRegLoading(false);
    if (res.success) {
      setRegSuccess(true);
      setRegMsg('¡Solicitud enviada exitosamente! Un Administrador la revisará a la brevedad.');
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
        zIndex: 99999,
        padding: '16px',
        boxSizing: 'border-box',
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif"
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#111215',
          borderRadius: '16px',
          border: '1px solid #23252f',
          padding: '36px 32px 28px 32px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)',
          boxSizing: 'border-box'
        }}
      >
        {mode === 'login' && (
          <>
            {/* Header matching Image 1 */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h1
                style={{
                  margin: '0 0 4px 0',
                  color: '#ffffff',
                  fontSize: '27px',
                  fontWeight: 700,
                  letterSpacing: '-0.3px',
                  lineHeight: 1.2
                }}
              >
                Log-In
              </h1>
              <div
                style={{
                  color: '#71717a',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.4px'
                }}
              >
                OT E&I
              </div>
            </div>

            {/* Error Message */}
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
                  marginBottom: '18px'
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Field 1: Correo Electrónico */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="login-email"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    marginBottom: '8px'
                  }}
                >
                  <Mail size={16} color="#8b5cf6" strokeWidth={2.2} />
                  <span>Correo Electrónico</span>
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoFocus
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#1b1c22',
                    border: '1px solid #2d2f3a',
                    borderRadius: '8px',
                    padding: '11px 14px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Field 2: Contraseña */}
              <div style={{ marginBottom: '22px' }}>
                <label
                  htmlFor="login-password"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    marginBottom: '8px'
                  }}
                >
                  <Key size={16} color="#8b5cf6" strokeWidth={2.2} />
                  <span>Contraseña</span>
                </label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#1b1c22',
                    border: '1px solid #2d2f3a',
                    borderRadius: '8px',
                    padding: '11px 14px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Submit Button matching Image 1: Centered, dark, bordered */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#1b1c22',
                  border: '1px solid #3d404e',
                  borderRadius: '8px',
                  padding: '9px 36px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500,
                  margin: '22px auto 0 auto',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  minWidth: '135px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#252733';
                  e.currentTarget.style.borderColor = '#55586d';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#1b1c22';
                  e.currentTarget.style.borderColor = '#3d404e';
                }}
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                <span>{isLoading ? 'Ingresando...' : 'Ingresar'}</span>
              </button>
            </form>

            {/* Bottom Links matching Image 1: Reset Password & Create an account */}
            <div
              style={{
                borderTop: '1px solid #23252f',
                marginTop: '26px',
                paddingTop: '18px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '28px'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setMode('reset');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'color 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
              >
                Reset Password
              </button>

              <button
                type="button"
                onClick={() => {
                  clearError();
                  setMode('register');
                  setRegSuccess(false);
                  setRegMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'color 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
              >
                Create an account
              </button>
            </div>
          </>
        )}

        {mode === 'reset' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <h2 style={{ color: '#ffffff', fontSize: '22px', fontWeight: 700, margin: '0 0 6px 0' }}>
                Reset Password
              </h2>
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>
                Ingrese su correo electrónico registrado para restablecer su acceso.
              </p>
            </div>

            {resetSent ? (
              <div
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  padding: '14px',
                  borderRadius: '8px',
                  fontSize: '13.5px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}
              >
                <CheckCircle2 size={24} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                Instrucciones enviadas a <strong>{resetEmail}</strong>. Revise su bandeja o contacte a un Administrador.
              </div>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (resetEmail) setResetSent(true);
                }}
              >
                <div style={{ marginBottom: '18px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      marginBottom: '8px'
                    }}
                  >
                    <Mail size={16} color="#8b5cf6" />
                    <span>Correo Electrónico</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="correo@ejemplo.com"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#1b1c22',
                      border: '1px solid #2d2f3a',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    backgroundColor: '#6366f1',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: '16px'
                  }}
                >
                  Enviar enlace de recuperación
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setResetSent(false);
              }}
              style={{
                width: '100%',
                background: 'none',
                border: '1px solid #2d2f3a',
                borderRadius: '8px',
                padding: '9px',
                color: '#9ca3af',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              ← Volver al Log-In
            </button>
          </div>
        )}

        {mode === 'register' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#ffffff', fontSize: '22px', fontWeight: 700, margin: '0 0 6px 0' }}>
                Create an account
              </h2>
              <p style={{ color: '#9ca3af', fontSize: '12.5px', margin: 0 }}>
                Complete sus datos para solicitar una cuenta en EPC TAKEOFF
              </p>
            </div>

            {regSuccess ? (
              <div
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  padding: '14px',
                  borderRadius: '8px',
                  fontSize: '13.5px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}
              >
                <CheckCircle2 size={24} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                {regMsg}
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label
                    style={{
                      display: 'block',
                      color: '#ffffff',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      marginBottom: '6px'
                    }}
                  >
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="usuario@empresa.com"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#1b1c22',
                      border: '1px solid #2d2f3a',
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
                  <label
                    style={{
                      display: 'block',
                      color: '#ffffff',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      marginBottom: '6px'
                    }}
                  >
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    placeholder="Nombres y Apellidos"
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#1b1c22',
                      border: '1px solid #2d2f3a',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      color: '#ffffff',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        color: '#ffffff',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        marginBottom: '6px'
                      }}
                    >
                      DNI
                    </label>
                    <input
                      type="text"
                      placeholder="8 dígitos"
                      value={regDni}
                      onChange={e => setRegDni(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1b1c22',
                        border: '1px solid #2d2f3a',
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
                    <label
                      style={{
                        display: 'block',
                        color: '#ffffff',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        marginBottom: '6px'
                      }}
                    >
                      Rol Solicitado
                    </label>
                    <select
                      value={regRole}
                      onChange={e => setRegRole(e.target.value as any)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1b1c22',
                        border: '1px solid #2d2f3a',
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
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{
                      display: 'block',
                      color: '#ffffff',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      marginBottom: '6px'
                    }}
                  >
                    Área
                  </label>
                  <select
                    value={regArea}
                    onChange={e => setRegArea(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#1b1c22',
                      border: '1px solid #2d2f3a',
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

                <button
                  type="submit"
                  disabled={regLoading}
                  style={{
                    width: '100%',
                    backgroundColor: '#6366f1',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: regLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '14px'
                  }}
                >
                  {regLoading && <Loader2 size={16} className="animate-spin" />}
                  <span>{regLoading ? 'Enviando...' : 'Enviar Solicitud'}</span>
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => setMode('login')}
              style={{
                width: '100%',
                background: 'none',
                border: '1px solid #2d2f3a',
                borderRadius: '8px',
                padding: '9px',
                color: '#9ca3af',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              ← Volver al Log-In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
