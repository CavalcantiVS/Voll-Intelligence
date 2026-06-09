import React, { createContext, useContext, useState, useCallback } from 'react';

/* ----------------------------------------------------------------
   Auth Context
   Simulates authentication with a mock check.
   When the backend is ready, replace _mockLogin with a real fetch.
---------------------------------------------------------------- */

const AuthContext = createContext(null);

const MOCK_USERS = [
  { id: '00000000-0000-0000-0000-000000000000', email: 'joao.cavalcanti@vollsolutions.com.br', password: '123456', name: 'João Cavalcanti', role: 'Administrador Geral' },
  { id: '11111111-1111-1111-1111-111111111111', email: 'suporte@voll.com.br', password: '123456', name: 'Suporte', role: 'Atendente' },
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('voll_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email, password) => {
    // ── Mock authentication ────────────────────────────────────
    // TODO: replace this block with a real API call:
    // const res = await fetch('/api/auth/login', { method:'POST', body: JSON.stringify({email,password}) });
    // const data = await res.json();
    // if (!res.ok) throw new Error(data.message || 'Credenciais inválidas');
    // ──────────────────────────────────────────────────────────

    await new Promise((r) => setTimeout(r, 700)); // simulate network delay

    const found = MOCK_USERS.find(
      (u) => u.email === email.trim().toLowerCase() && u.password === password
    );

    if (!found) {
      throw new Error('E-mail ou senha incorretos.');
    }

    const session = { id: found.id, email: found.email, name: found.name, role: found.role };
    localStorage.setItem('voll_user', JSON.stringify(session));
    setUser(session);
    return session;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('voll_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
