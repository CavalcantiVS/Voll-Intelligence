import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import API_URL from '../api';

const AuthContext = createContext(null);

// ── AuthProvider ──────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const { instance: msalInstance, accounts } = useMsal();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('voll_token') || null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Ao abrir o app, valida o JWT Voll armazenado em localStorage ou recupera a sessão do MSAL Redirect
  useEffect(() => {
    const validateToken = async () => {
      // Se não temos o token Voll, verificamos se o MSAL tem uma conta ativa (vindo de um redirect)
      if (!token) {
        const activeAccount = msalInstance.getActiveAccount() || accounts[0];
        
        if (activeAccount) {
          try {
            // Tenta obter o token silenciosamente da MS
            let accessToken = null;
            try {
              const tokenResult = await msalInstance.acquireTokenSilent({
                ...loginRequest,
                account: activeAccount,
              });
              accessToken = tokenResult.accessToken;
            } catch (e) {
              console.warn('[MSAL] acquireTokenSilent falhou no mount:', e.message);
            }

            // Troca pelo token do backend Voll
            const res = await fetch(`${API_URL}/api/auth/microsoft`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                msalToken: accessToken,
                msalAccount: {
                  username: activeAccount.username,
                  name: activeAccount.name,
                  localAccountId: activeAccount.localAccountId,
                  homeAccountId: activeAccount.homeAccountId,
                }
              })
            });

              const data = await res.json();
              if (res.ok) {
                localStorage.setItem('voll_token', data.token);
                setToken(data.token);
                
                // Opcional: tenta buscar a foto do MS Graph
                let userData = { ...data.user };
                if (accessToken) {
                  try {
                    const photoRes = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
                      headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    if (photoRes.ok) {
                      const blob = await photoRes.blob();
                      const base64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                      });
                      userData.msAvatar = base64;
                    }
                  } catch (err) {}
                }
                setUser(userData);
                setAuthError(null);
              } else {
                // Se a conta for recusada (ex: suspensa ou domínio inválido)
                setAuthError(data.error || 'Acesso negado.');
                msalInstance.setActiveAccount(null);
                try { await msalInstance.clearCache(); } catch(e) {}
              }
              setLoading(false);
              return;
          } catch (err) {
            console.error('[SSO] Erro ao recuperar sessão da Microsoft:', err);
            msalInstance.setActiveAccount(null); // Limpa para não entrar em loop
          }
        }

        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          localStorage.removeItem('voll_token');
          setToken(null);
        }
      } catch (err) {
        console.error('Falha ao validar token:', err);
        localStorage.removeItem('voll_token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token, msalInstance, accounts]);

  // ── Login tradicional (e-mail + senha) ───────────────────────────
  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Credenciais inválidas');

    localStorage.setItem('voll_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // ── Login via Microsoft SSO ───────────────────────────────────────
  const loginWithMicrosoft = useCallback(async () => {
    try {
      // Usa loginRedirect em vez de popup (é mais estável, evita bloqueadores de popup e timeouts)
      await msalInstance.loginRedirect({
        ...loginRequest,
        prompt: 'select_account', 
      });
      // A página vai redirecionar imediatamente, então nada mais é executado aqui
    } catch (err) {
      console.error('[MSAL] Erro ao iniciar loginRedirect:', err);
      throw err;
    }
  }, [msalInstance]);

  // ── Logout ────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    localStorage.removeItem('voll_token');
    setToken(null);
    setUser(null);

    // Encerra a sessão Microsoft se houver conta ativa
    const activeAccount = msalInstance.getActiveAccount() || accounts[0];
    if (activeAccount) {
      try {
        await msalInstance.logoutRedirect({ account: activeAccount });
      } catch (e) {
        console.warn('[MSAL] Logout Microsoft:', e.message);
      }
    }
  }, [msalInstance, accounts]);

  // ── Atualizar dados do usuário na sessão ─────────────────────────
  const updateUser = useCallback((newData) => {
    setUser((prev) => prev ? { ...prev, ...newData } : null);
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#0f0f11', color: '#8b8fa8', flexDirection: 'column', gap: '16px'
      }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid #e61c28', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: '0.9rem' }}>Verificando sessão...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, loginWithMicrosoft, logout, updateUser, authError, setAuthError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
