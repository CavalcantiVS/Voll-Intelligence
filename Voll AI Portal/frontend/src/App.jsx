import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import ChatbotGenerator from './pages/ChatbotGenerator';
import ResponseGenerator from './pages/ResponseGenerator';
import AutomationGenerator from './pages/AutomationGenerator';
import DocsGenerator from './pages/DocsGenerator';
import RefineGenerator from './pages/RefineGenerator';
import PromptGenerator from './pages/PromptGenerator';
import History from './pages/History';
import Settings from './pages/Settings';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="chat" element={<Chat />} />
          <Route path="chatbots" element={<ChatbotGenerator />} />
          <Route path="responses" element={<ResponseGenerator />} />
          <Route path="automations" element={<AutomationGenerator />} />
          <Route path="docs" element={<DocsGenerator />} />
          <Route path="refine" element={<RefineGenerator />} />
          <Route path="prompts" element={<PromptGenerator />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
