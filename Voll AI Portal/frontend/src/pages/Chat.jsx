import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Trash2, MessageSquarePlus, Send, Loader2, Bot, Edit2, Check, X, ShieldAlert, Paperclip, Mic, MicOff, Share2 } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';

const BACKEND = 'http://localhost:3001';

const Chat = () => {
  const location = useLocation();
  const selectSessionId = location.state?.selectSessionId;

  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const [isSharedPreview, setIsSharedPreview] = useState(false);
  const [sharedSessionInfo, setSharedSessionInfo] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const toggleSpeechRecognition = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Erro no reconhecimento de voz:', event.error);
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? prev + ' ' + transcript : transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Sensitive-data detection ────────────────────────────────
  // Detects CPF (000.000.000-00 or 00000000000) and
  // CNPJ (00.000.000/0000-00 or 00000000000000) in the input.
  // Does NOT block sending — just educates the user.
  const hasSensitiveData = useMemo(() => {
    if (!input) return false;
    const dlp = localStorage.getItem('dlp_level') || 'rigoroso';
    if (dlp === 'desativado') return false;
    
    const cpfFormatted  = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/;
    const cpfRaw        = /\b\d{11}\b/;
    const cnpjFormatted = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/;
    const cnpjRaw       = /\b\d{14}\b/;
    return (
      cpfFormatted.test(input) ||
      cpfRaw.test(input)       ||
      cnpjFormatted.test(input)||
      cnpjRaw.test(input)
    );
  }, [input]);
  // ────────────────────────────────────────────────────────────

  // Load sessions on mount or check for shared session link
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const shareId = queryParams.get('share');

    if (shareId) {
      loadSharedPreview(shareId);
    } else {
      loadSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectSessionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSharedPreview = async (shareId) => {
    setLoading(true);
    setIsSharedPreview(true);
    try {
      const sessionRes = await fetch(`${BACKEND}/api/chat/sessions/${shareId}`);
      if (!sessionRes.ok) {
        throw new Error('Conversa compartilhada não encontrada.');
      }
      const sessionInfo = await sessionRes.json();
      setSharedSessionInfo(sessionInfo);

      const messagesRes = await fetch(`${BACKEND}/api/chat/sessions/${shareId}/messages`);
      const messagesData = await messagesRes.json();
      setMessages(messagesData);
      
      const listRes = await fetch(`${BACKEND}/api/chat/sessions`);
      const listData = await listRes.json();
      if (Array.isArray(listData)) {
        setSessions(listData);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro ao carregar pré-visualização compartilhada.');
      setIsSharedPreview(false);
      loadSessions();
    } finally {
      setLoading(false);
    }
  };

  const cloneSharedSession = async () => {
    if (!sharedSessionInfo) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/chat/sessions/${sharedSessionInfo.id}/clone`, {
        method: 'POST'
      });
      if (!res.ok) {
        throw new Error('Falha ao importar conversa compartilhada.');
      }
      const clonedSession = await res.json();
      
      window.history.replaceState({}, document.title, window.location.pathname);
      
      setIsSharedPreview(false);
      setSharedSessionInfo(null);
      
      setSessions(prev => [clonedSession, ...prev]);
      setActiveSession(clonedSession);
      
      await selectSession(clonedSession);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro ao importar conversa.');
    } finally {
      setLoading(false);
    }
  };

  const shareSession = () => {
    if (!activeSession) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${activeSession.id}`;
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch(`${BACKEND}/api/chat/sessions`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(data);
        
        if (selectSessionId) {
          const matchedSession = data.find(s => s.id === selectSessionId);
          if (matchedSession) {
            selectSession(matchedSession);
            // Clear router state to avoid resetting selection on unrelated renders
            window.history.replaceState({}, document.title);
            return;
          }
        }
        
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

    const userMessage = { 
      role: 'user', 
      content: input, 
      file_name: selectedFile?.name,
      created_at: new Date().toISOString() 
    };
    setMessages(prev => [...prev, userMessage]);
    const messageInput = input;
    const fileToUpload = selectedFile;
    setInput('');
    setSelectedFile(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('sessionId', currentSession.id);
      formData.append('content', messageInput);
      formData.append('dlpLevel', localStorage.getItem('dlp_level') || 'rigoroso');
      formData.append('aiModel', localStorage.getItem('ai_model') || 'gpt-4o');
      formData.append('aiTemp', localStorage.getItem('ai_temp') || '0.7');
      if (fileToUpload) {
        formData.append('file', fileToUpload);
      }

      const res = await fetch(`${BACKEND}/api/chat/message`, {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro no servidor (${res.status})`);
      }
      
      const aiMessage = await res.json();
      if (!aiMessage || !aiMessage.content) {
        throw new Error('Formato de resposta do servidor inválido');
      }

      const fullText = aiMessage.content;
      const newMessage = {
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, newMessage]);

      // Efeito de digitação otimizado: ajusta a velocidade dinamicamente de acordo com o tamanho do texto
      const delayMs = 8; // Intervalo de tempo entre os passos em ms
      const maxSteps = 50; // Máximo de passos para garantir respostas rápidas mesmo para textos longos
      const charsPerStep = Math.max(1, Math.ceil(fullText.length / maxSteps));
      let currentLength = 0;

      while (currentLength < fullText.length) {
        currentLength = Math.min(fullText.length, currentLength + charsPerStep);
        const currentText = fullText.slice(0, currentLength);

        await new Promise(resolve => setTimeout(resolve, delayMs));

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
        const autoTitle = messageInput.slice(0, 50);
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 5MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB.');
            return;
          }
          setSelectedFile(file);
          e.preventDefault(); // Evita colar dados binários ou lixo no textarea
          break;
        }
      }
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
        {/* Header da conversa / Compartilhamento */}
        {(activeSession || isSharedPreview) && (
          <div className="chat-main-header" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 28px',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {isSharedPreview ? `[Compartilhada] ${sharedSessionInfo?.title || ''}` : activeSession.title}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {isSharedPreview ? (
                  <>
                    <span style={{ color: 'var(--voll-red)', fontWeight: 600 }}>Modo leitura</span>
                    <span>•</span>
                    <span>Compartilhada por: <strong>{sharedSessionInfo?.creator_name || 'Colaborador Voll'}</strong></span>
                    <span>•</span>
                    <span>{sharedSessionInfo?.message_count || 0} mensagens</span>
                    {sharedSessionInfo?.file_count > 0 && (
                      <>
                        <span>•</span>
                        <span>📎 {sharedSessionInfo.file_count} {sharedSessionInfo.file_count === 1 ? 'anexo' : 'anexos'}</span>
                      </>
                    )}
                  </>
                ) : (
                  <span>Conversa ativa</span>
                )}
              </div>
            </div>

            {isSharedPreview ? (
              <button 
                className="btn btn-primary" 
                onClick={cloneSharedSession} 
                disabled={loading}
                style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 14px' }}
              >
                <Plus size={14} />
                <span>Continuar esta Conversa</span>
              </button>
            ) : (
              <button 
                className="btn btn-outline" 
                onClick={shareSession} 
                style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderColor: shareCopied ? 'var(--border-focus)' : 'var(--border)' }}
              >
                <Share2 size={14} />
                <span>{shareCopied ? 'Link Copiado!' : 'Compartilhar'}</span>
              </button>
            )}
          </div>
        )}

        {!activeSession && messages.length === 0 && !isSharedPreview ? (
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
                <div className="chat-message__avatar"><Bot size={16} /></div>
                <div className="chat-message__body">
                  <div className="chat-message__header">
                    <span className="chat-message__sender">Voll AI</span>
                  </div>
                  <div className="chat-typing">
                    <Loader2 size={14} className="spin" />
                    <span>Voll AI está pensando…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input area */}
        {isSharedPreview ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-page)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0
          }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Esta é uma conversa compartilhada por um colega. Importe para continuar de onde ele parou.
            </p>
            <button 
              className="btn btn-primary" 
              onClick={cloneSharedSession}
              disabled={loading}
              style={{ gap: '8px', padding: '8px 20px', fontSize: '0.9rem' }}
            >
              <Plus size={16} />
              <span>Importar e Continuar Conversa</span>
            </button>
          </div>
        ) : (
          <div className="chat-input-area">
          {isListening && (
            <div className="chat-voice-active-banner">
              <span className="voice-pulse-dot" />
              <span>Ouvindo sua voz... Fale agora!</span>
            </div>
          )}
          {selectedFile && (
            <div className="chat-file-preview">
              <span className="chat-file-name">📎 {selectedFile.name}</span>
              <button className="chat-file-remove" onClick={() => setSelectedFile(null)} title="Remover anexo">
                <X size={14} />
              </button>
            </div>
          )}
          <form
            onSubmit={sendMessage}
            className={`chat-input-form${hasSensitiveData ? ' chat-input-form--warn' : ''}${isListening ? ' chat-input-form--recording' : ''}`}
          >
            <button 
              type="button" 
              className="chat-attach-btn" 
              onClick={() => fileInputRef.current?.click()} 
              title="Anexar arquivo (PDF, Imagem, Texto)"
              disabled={loading}
            >
              <Paperclip size={20} />
            </button>
            <button
              type="button"
              className={`chat-voice-btn${isListening ? ' chat-voice-btn--recording' : ''}`}
              onClick={toggleSpeechRecognition}
              title={isListening ? "Parar ditar" : "Ditar mensagem (Gravar voz)"}
              disabled={loading}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
              accept=".pdf,.txt,.csv,.json,.png,.jpg,.jpeg"
            />
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={isListening ? "Ouvindo sua voz... Fale agora!" : "Mensagem para o Voll AI... (Enter para enviar, Shift+Enter para nova linha, Ctrl+V para colar imagem)"}
              rows={1}
              disabled={loading}
              className="chat-input"
              style={{ paddingLeft: '8px' }}
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

          {/* Sensitive-data hint — shown only when CPF/CNPJ detected */}
          {hasSensitiveData && (
            <p className="chat-input-warn-hint">
              <ShieldAlert size={13} />
              Nota: Lembre-se de não compartilhar dados pessoais de clientes.
            </p>
          )}

          {!hasSensitiveData && (
            <p className="chat-disclaimer">
              Voll AI pode cometer erros. Dados sensíveis são automaticamente mascarados antes do envio.
            </p>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
