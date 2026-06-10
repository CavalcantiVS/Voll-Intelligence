import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff, AlertCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Ícone SVG da Microsoft
const MicrosoftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
  </svg>
);

const Login = () => {
  const { login, loginWithMicrosoft, authError, setAuthError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTraditional, setShowTraditional] = useState(false);

  // Sync global auth error with local error display
  React.useEffect(() => {
    if (authError) {
      setError(authError);
      setAuthError(null); // Limpa para não ficar preso
    }
  }, [authError, setAuthError]);

  // Login via Microsoft SSO
  const handleMicrosoftLogin = async () => {
    setError('');
    setMsLoading(true);
    try {
      const loggedUser = await loginWithMicrosoft();
      if (loggedUser) {
        navigate('/', { replace: true });
      }
      // se loggedUser === null, o utilizador fechou o popup — não faz nada
    } catch (err) {
      // Mostra a mensagem real do erro para facilitar diagnóstico
      const msg = err.message || err.errorMessage || String(err);
      // Ignora somente o cancelamento explícito pelo usuário
      if (!msg.includes('user_cancelled')) {
        console.error('[SSO Error]', err);
        setError(msg || 'Falha ao autenticar com Microsoft. Tente novamente.');
      }
    } finally {
      setMsLoading(false);
    }
  };

  // Login tradicional com e-mail + senha
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Erro ao autenticar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Logo */}
        <div className="login-logo">
          <img src="/images/RemoveFundo Icon.png" alt="Voll Logo" className="login-logo__img" />
          <div className="login-logo__text">
            <span className="login-logo__brand">Voll Intelligence</span>
            <span className="login-logo__sub">Plataforma de Atendimento</span>
          </div>
        </div>

        {/* Divider */}
        <div className="login-divider" />

        {/* Heading */}
        <div className="login-heading">
          <h1>Bem-vindo de volta</h1>
          <p>Acesse sua conta corporativa para continuar.</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="login-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* ── Botão Principal: Microsoft SSO ── */}
        <button
          type="button"
          className="login-microsoft-btn"
          onClick={handleMicrosoftLogin}
          disabled={msLoading || loading}
        >
          {msLoading ? (
            <>
              <span className="login-spinner" />
              Conectando à Microsoft…
            </>
          ) : (
            <>
              <MicrosoftIcon />
              Entrar com Conta Microsoft
            </>
          )}
        </button>

        <p className="login-ms-hint">
          Use o mesmo e-mail do Microsoft Teams e Office 365
        </p>

        {/* ── Separador ── */}
        <div className="login-separator">
          <span>ou</span>
        </div>

        {/* ── Toggle para login tradicional ── */}
        <button
          type="button"
          className="login-traditional-toggle"
          onClick={() => setShowTraditional((v) => !v)}
        >
          Entrar com E-mail e Senha
          <ChevronDown
            size={15}
            style={{ transition: 'transform 0.2s', transform: showTraditional ? 'rotate(180deg)' : 'none' }}
          />
        </button>

        {/* ── Formulário tradicional (colapsável) ── */}
        {showTraditional && (
          <form className="login-form" onSubmit={handleSubmit} noValidate style={{ marginTop: '12px' }}>
            <div className="login-field">
              <label htmlFor="login-email">E-mail Corporativo</label>
              <div className="login-input-wrap">
                <Mail size={16} className="login-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="nome@vollsolutions.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Senha</label>
              <div className="login-input-wrap">
                <Lock size={16} className="login-input-icon" />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Verificando…
                </>
              ) : (
                <>
                  <LogIn size={17} />
                  Entrar no Portal
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer hint */}
        <p className="login-hint">
          Problemas de acesso? Fale com o time de TI da Voll.
        </p>
      </div>
    </div>
  );
};

export default Login;
