import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

import Layout             from './components/Layout';
import Login              from './pages/Login';
import Dashboard          from './pages/Dashboard';
import Chat               from './pages/Chat';
import TeamChat           from './pages/TeamChat';
import ChatbotGenerator   from './pages/ChatbotGenerator';
import ResponseGenerator  from './pages/ResponseGenerator';
import AutomationGenerator from './pages/AutomationGenerator';
import DocsGenerator      from './pages/DocsGenerator';
import RefineGenerator    from './pages/RefineGenerator';
import PromptGenerator    from './pages/PromptGenerator';
import History            from './pages/History';
import Settings           from './pages/Settings';
import UserManagement     from './pages/UserManagement';
import Profile            from './pages/Profile';

import './index.css';

/* ----------------------------------------------------------------
   ProtectedRoute — redireciona para /login se o usuário não estiver autenticado
---------------------------------------------------------------- */
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const path = location.pathname;
  const isAdmin = user.role === 'Administrador Geral' || user.role === 'Administrador';
  
  if (path === '/users' && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  if (
    path !== '/' &&
    path !== '/profile' &&
    path !== '/settings' &&
    path !== '/users' &&
    path !== '/teams' &&
    user.allowed_screens &&
    !user.allowed_screens.includes(path)
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
};

/* ----------------------------------------------------------------
   Rotas do app
---------------------------------------------------------------- */
function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Públicas */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      {/* Protegidas — todas dentro de Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index               element={<Dashboard />} />
        <Route path="chat"         element={<Chat />} />
        <Route path="teams"        element={<TeamChat />} />
        <Route path="chatbots"     element={<ChatbotGenerator />} />
        <Route path="responses"    element={<ResponseGenerator />} />
        <Route path="automations"  element={<AutomationGenerator />} />
        <Route path="docs"         element={<DocsGenerator />} />
        <Route path="refine"       element={<RefineGenerator />} />
        <Route path="prompts"      element={<PromptGenerator />} />
        <Route path="history"      element={<History />} />
        <Route path="settings"     element={<Settings />} />
        <Route path="users"        element={<UserManagement />} />
        <Route path="profile"      element={<Profile />} />
      </Route>

      {/* Catch-all (qualquer outra rota) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
