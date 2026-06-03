import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Layout             from './components/Layout';
import Login              from './pages/Login';
import Dashboard          from './pages/Dashboard';
import Chat               from './pages/Chat';
import ChatbotGenerator   from './pages/ChatbotGenerator';
import ResponseGenerator  from './pages/ResponseGenerator';
import AutomationGenerator from './pages/AutomationGenerator';
import DocsGenerator      from './pages/DocsGenerator';
import RefineGenerator    from './pages/RefineGenerator';
import PromptGenerator    from './pages/PromptGenerator';
import History            from './pages/History';
import Settings           from './pages/Settings';

import './index.css';

/* ----------------------------------------------------------------
   ProtectedRoute — redirects to /login if user is not authenticated
---------------------------------------------------------------- */
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

/* ----------------------------------------------------------------
   App routes
---------------------------------------------------------------- */
function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      {/* Protected — all inside Layout */}
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
        <Route path="chatbots"     element={<ChatbotGenerator />} />
        <Route path="responses"    element={<ResponseGenerator />} />
        <Route path="automations"  element={<AutomationGenerator />} />
        <Route path="docs"         element={<DocsGenerator />} />
        <Route path="refine"       element={<RefineGenerator />} />
        <Route path="prompts"      element={<PromptGenerator />} />
        <Route path="history"      element={<History />} />
        <Route path="settings"     element={<Settings />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
