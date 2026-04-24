import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, MessageSquarePlus, Send, Loader2, Bot, Edit2, Check, X } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';

const BACKEND = 'http://localhost:3001';

const Chat = () => {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch(`${BACKEND}/api/chat/sessions`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(data);
        if (data.length > 0 && !activeSession) {
          selectSession(data[0]);
        }
      } else {
        console.error('API returned non-array:', data);
        setSessions([]);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const selectSession = async (session) => {
    setActiveSession(session);
    setMessages([]);
    try {
      const res = await fetch(`${BACKEND}/api/chat/sessions/${session.id}/messages`);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const createNewSession = () => {
    setActiveSession(null);
    setMessages([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await fetch(`${BACKEND}/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const startRename = (e, session) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const saveRename = async (sessionId) => {
    if (!editTitle.trim()) return;
    try {
      await fetch(`${BACKEND}/api/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle }),
      });
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: editTitle } : s));
      if (activeSession?.id === sessionId) setActiveSession(prev => ({ ...prev, title: editTitle }));
    } catch (err) {
      console.error('Failed to rename session:', err);
    }
    setEditingId(null);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    let currentSession = activeSession;

    // Create session if none exists
    if (!currentSession) {
      try {
        const res = await fetch(`${BACKEND}/api/chat/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: input.slice(0, 50) }),
        });
        currentSession = await res.json();
        setSessions(prev => [currentSession, ...prev]);
        setActiveSession(currentSession);
      } catch (err) {
        console.error('Failed to create session:', err);
        return;
      }
    }

    const userMessage = { role: 'user', content: input, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSession.id, content: input }),
      });
      const aiMessage = await res.json();

      const fullText = aiMessage.content;
      let currentText = '';

      const newMessage = {
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, newMessage]);

      for (let i = 0; i < fullText.length; i++) {
        currentText += fullText[i];

        await new Promise(resolve => setTimeout(resolve, 15));

        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: currentText
          };
          return updated;
        });
      }

      // Auto-rename first message if still default
      if (currentSession.title === 'Nova conversa') {
        const autoTitle = input.slice(0, 50);
        await fetch(`${BACKEND}/api/chat/sessions/${currentSession.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: autoTitle }),
        });
        setSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, title: autoTitle } : s));
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Erro ao conectar com o backend. Verifique se o servidor está rodando.',
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  return (
    <div className="chat-page">
      {/* Sidebar de sessões */}
      <div className="chat-sidebar">
        <div className="chat-sidebar__header">
          <h2>Conversas</h2>
          <button className="chat-new-btn" onClick={createNewSession} title="Nova conversa">
            <Plus size={18} />
          </button>
        </div>

        <div className="chat-sidebar__sessions">
          {loadingSessions ? (
            <div className="chat-sidebar__loading">
              <Loader2 size={20} className="spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="chat-sidebar__empty">
              <MessageSquarePlus size={32} />
              <p>Nenhuma conversa ainda</p>
              <button className="btn btn-primary" onClick={createNewSession} style={{ marginTop: 12 }}>
                Iniciar conversa
              </button>
            </div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                className={`chat-session-item ${activeSession?.id === session.id ? 'active' : ''}`}
                onClick={() => selectSession(session)}
              >
                {editingId === session.id ? (
                  <div className="chat-session-edit" onClick={e => e.stopPropagation()}>
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveRename(session.id)}
                      autoFocus
                    />
                    <button onClick={() => saveRename(session.id)}><Check size={14} /></button>
                    <button onClick={() => setEditingId(null)}><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <span className="chat-session-item__title">{session.title}</span>
                    <div className="chat-session-item__actions">
                      <button onClick={e => startRename(e, session)} title="Renomear">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={e => deleteSession(e, session.id)} title="Excluir">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Área principal do chat */}
      <div className="chat-main">
        {!activeSession && messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="chat-welcome__icon">
              <Bot size={48} />
            </div>
            <h1>Olá, sou o Voll AI</h1>
            <p>Assistente corporativo interno da Voll Solutions.<br />Como posso ajudar você hoje?</p>
            <div className="chat-welcome__suggestions">
              {[
                'Crie um fluxo de chatbot para suporte técnico via WhatsApp',
                'Gere uma resposta profissional para cliente insatisfeito',
                'Sugira uma automação para triagem de tickets no Zendesk',
                'Documente uma integração via webhook com a API da Voll',
              ].map((s, i) => (
                <button
                  key={i}
                  className="chat-suggestion"
                  onClick={() => setInput(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <ChatMessage key={msg.id || msg.created_at || `msg-${index}`} message={msg} />
            ))}
            {loading && (
              <div className="chat-message chat-message--ai">
                <div className="chat-message__avatar"><Bot size={18} /></div>
                <div className="chat-message__body">
                  <div className="chat-message__header">
                    <span className="chat-message__sender">Voll AI</span>
                  </div>
                  <div className="chat-typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input area */}
        <div className="chat-input-area">
          <form onSubmit={sendMessage} className="chat-input-form">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mensagem para o Voll AI... (Enter para enviar, Shift+Enter para nova linha)"
              rows={1}
              disabled={loading}
              className="chat-input"
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!input.trim() || loading}
              title="Enviar"
            >
              {loading ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
            </button>
          </form>
          <p className="chat-disclaimer">
            Voll AI pode cometer erros. Dados sensíveis são automaticamente mascarados antes do envio.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chat;
