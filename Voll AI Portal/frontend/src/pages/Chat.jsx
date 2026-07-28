import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Trash2, MessageSquarePlus, Send, Loader2, Bot, Edit2, Check, X, ShieldAlert, Paperclip, Mic, MicOff, Share2, PanelLeftClose, PanelLeftOpen, Folder, FolderOpen, FolderPlus, ChevronRight, ChevronDown } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';
import TypingIndicator from '../components/TypingIndicator';
import { useToast } from '../contexts/ToastContext';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import TechBackground from '../components/TechBackground';

import styles from './Chat.module.css';
const BACKEND = 'http://localhost:3001';

const Chat = () => {
  const { user, token } = useAuth();
  const location = useLocation();
  const selectSessionId = location.state?.selectSessionId;
  const [isDark, setIsDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');

  // Sincronizar com mudanças de tema
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // === Pastas ===
  const [folders, setFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [isChatSidebarCollapsed, setIsChatSidebarCollapsed] = useState(false);
  const [isSharedPreview, setIsSharedPreview] = useState(false);
  const [sharedSessionInfo, setSharedSessionInfo] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Rolar para o fundo
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Carregar sessão compartilhada ou sessões gerais
  useEffect(() => {
    if (!token) return;
    const queryParams = new URLSearchParams(window.location.search);
    const shareId = queryParams.get('share');

    if (shareId) {
      loadSharedPreview(shareId);
    } else {
      loadSessions();
      loadFolders();
    }
  }, [selectSessionId, token]);

  const loadSharedPreview = async (shareId) => {
    setLoading(true);
    setIsSharedPreview(true);
    try {
      const sessionRes = await fetch(`${BACKEND}/api/chat/sessions/${shareId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!sessionRes.ok) {
        throw new Error('Conversa compartilhada não encontrada.');
      }
      const sessionInfo = await sessionRes.json();
      setSharedSessionInfo(sessionInfo);

      const messagesRes = await fetch(`${BACKEND}/api/chat/sessions/${shareId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const messagesData = await messagesRes.json();
      setMessages(messagesData);
      
      const listRes = await fetch(`${BACKEND}/api/chat/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const listData = await listRes.json();
      if (Array.isArray(listData)) {
        setSessions(listData);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Erro ao carregar pré-visualização compartilhada.');
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
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Falha ao importar conversa compartilhada.');
      }
      const clonedSession = await res.json();
      
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsSharedPreview(false);
      setSharedSessionInfo(null);
      setSessions(prev => [clonedSession, ...prev]);
      selectSession(clonedSession);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Erro ao importar conversa.');
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
      const res = await fetch(`${BACKEND}/api/chat/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(data);
        if (selectSessionId) {
          const matchedSession = data.find(s => s.id === selectSessionId);
          if (matchedSession) {
            selectSession(matchedSession);
            window.history.replaceState({}, document.title);
            return;
          }
        }
        const personal = data.filter(s => !s.team_id);
        if (personal.length > 0 && !activeSession) {
          selectSession(personal[0]);
        }
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  // === Funções de Pastas ===
  const loadFolders = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/chat/folders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setFolders(data);
        const initExpanded = {};
        data.forEach(f => { initExpanded[f.id] = false; });
        setExpandedFolders(prev => ({ ...initExpanded, ...prev }));
      }
    } catch (err) {
      console.error('Failed to load folders:', err);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch(`${BACKEND}/api/chat/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newFolderName })
      });
      if (!res.ok) throw new Error('Falha ao criar pasta');
      const newFolder = await res.json();
      setFolders(prev => [...prev, newFolder]);
      setExpandedFolders(prev => ({ ...prev, [newFolder.id]: true }));
      setIsCreatingFolder(false);
      setNewFolderName('');
    } catch (err) {
      console.error(err);
    }
  };

  const deleteFolder = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Excluir esta pasta? As conversas dentro dela NÃO serão apagadas.')) return;
    try {
      await fetch(`${BACKEND}/api/chat/folders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setFolders(prev => prev.filter(f => f.id !== id));
      setSessions(prev => prev.map(s => s.folder_id === id ? { ...s, folder_id: null } : s));
    } catch (err) {
      console.error(err);
    }
  };

  const moveSessionToFolder = async (sessionId, folderId) => {
    try {
      await fetch(`${BACKEND}/api/chat/sessions/${sessionId}/folder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ folderId })
      });
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, folder_id: folderId } : s));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFolder = (id) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectSession = async (session) => {
    setActiveSession(session);
    setMessages([]);
    try {
      const res = await fetch(`${BACKEND}/api/chat/sessions/${session.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const createNewSession = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/chat/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'Nova conversa',
        })
      });
      if (!res.ok) throw new Error('Falha ao iniciar conversa.');
      const newSession = await res.json();
      setSessions(prev => [newSession, ...prev]);
      setActiveSession(newSession);
      setMessages([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao iniciar conversa.');
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('Excluir esta conversa?')) return;
    try {
      await fetch(`${BACKEND}/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: editTitle }),
      });
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: editTitle } : s));
      if (activeSession?.id === sessionId) setActiveSession(prev => ({ ...prev, title: editTitle }));
    } catch (err) {
      console.error('Failed to rename session:', err);
    }
    setEditingId(null);
  };

  const handleEditMessage = async (messageId, newContent) => {
    try {
      const res = await fetch(`${BACKEND}/api/chat/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newContent })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao salvar edição.');
      }
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent } : m));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    let currentSession = activeSession;

    // Criar sessão se nenhuma existir
    if (!currentSession) {
      try {
        const res = await fetch(`${BACKEND}/api/chat/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
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

    const messageInput = input;
    const fileToUpload = selectedFile;
    setInput('');
    setSelectedFile(null);
    setLoading(true);

    const userMessage = { 
      role: 'user', 
      content: messageInput, 
      file_name: fileToUpload?.name,
      created_at: new Date().toISOString() 
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

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
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro no servidor (${res.status})`);
      }
      
      const aiMessage = await res.json();
      setIsTyping(false);
      const fullText = aiMessage.content;
      const newMessage = {
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, newMessage]);

      // Lidar com a animação de digitação localmente
      const delayMs = 8;
      const maxSteps = 50;
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

      // Renomear sessão automaticamente
      if (currentSession.title === 'Nova conversa') {
        const autoTitle = messageInput.slice(0, 50);
        await fetch(`${BACKEND}/api/chat/sessions/${currentSession.id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title: autoTitle }),
        });
        setSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, title: autoTitle } : s));
        setActiveSession(prev => ({ ...prev, title: autoTitle }));
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
        toast.error('O arquivo deve ter no máximo 5MB.');
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
            toast.error('A imagem deve ter no máximo 5MB.');
            return;
          }
          setSelectedFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const toggleSpeechRecognition = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz.");
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

  // Excluir chats de equipe desta tela completamente
  const personalSessions = useMemo(() => sessions.filter(s => !s.team_id), [sessions]);

  // Agrupar sessões por pasta
  const sessionsByFolder = useMemo(() => {
    const grouped = { unassigned: [] };
    folders.forEach(f => { grouped[f.id] = []; });
    personalSessions.forEach(s => {
      if (s.folder_id && grouped[s.folder_id]) {
        grouped[s.folder_id].push(s);
      } else {
        grouped.unassigned.push(s);
      }
    });
    return grouped;
  }, [personalSessions, folders]);

  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e, folderId) => {
    e.preventDefault();
    const sessionId = e.dataTransfer.getData('sessionId');
    if (sessionId) moveSessionToFolder(sessionId, folderId);
  };

  const renderSessionItem = (session) => (
    <div
      key={session.id}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('sessionId', session.id)}
      className={`${styles.sessionItem} ${activeSession?.id === session.id ? styles.sessionItemActive : ''}`}
      onClick={() => selectSession(session)}
    >
      {editingId === session.id ? (
        <div className={styles.sessionEdit} onClick={e => e.stopPropagation()}>
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
          <span className={styles.sessionItemTitle}>{session.title}</span>
          <div className={styles.sessionItemActions}>
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
  );

  return (
    <div className={styles.chatPage}>
      {/* Sidebar conversas privadas */}
      <div 
        className={styles.sidebar} 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%',
          width: isChatSidebarCollapsed ? '0px' : '248px',
          minWidth: isChatSidebarCollapsed ? '0px' : '248px',
          transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          borderRight: isChatSidebarCollapsed ? 'none' : '1px solid var(--border)'
        }}
      >
        <div style={{ width: '248px', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>
          <div className={styles.sidebarHeader}>
            <h2>Conversas Privadas</h2>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className={styles.newBtn} onClick={() => setIsCreatingFolder(true)} title="Nova pasta" style={{ background: 'transparent', color: 'var(--text-secondary)' }}>
                <FolderPlus size={16} />
              </button>
              <button className={styles.newBtn} onClick={createNewSession} title="Nova conversa">
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className={styles.sidebarSessions} onDragOver={onDragOver} onDrop={(e) => onDrop(e, null)}>
            {loadingSessions ? (
              <div className={styles.sidebarLoading}>
                <Loader2 size={20} className="spin" />
              </div>
            ) : (
              <>
                {isCreatingFolder && (
                  <div className={styles.folderCreateInput}>
                    <input
                      autoFocus
                      placeholder="Nome da pasta..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') createFolder();
                        if (e.key === 'Escape') { setIsCreatingFolder(false); setNewFolderName(''); }
                      }}
                    />
                    <div style={{ display: 'flex' }}>
                      <button onClick={createFolder}><Check size={14} /></button>
                      <button onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }}><X size={14} /></button>
                    </div>
                  </div>
                )}

                {folders.map(folder => (
                  <div key={folder.id} className={styles.folderContainer}>
                    <div
                      className={styles.folderHeader}
                      onClick={() => toggleFolder(folder.id)}
                      onDragOver={onDragOver}
                      onDrop={(e) => { e.stopPropagation(); onDrop(e, folder.id); }}
                    >
                      <div className={styles.folderHeaderLeft}>
                        {expandedFolders[folder.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        {expandedFolders[folder.id] ? <FolderOpen size={14} className={styles.folderIcon} /> : <Folder size={14} className={styles.folderIcon} />}
                        <span className={styles.folderName}>{folder.name}</span>
                      </div>
                      <button className={styles.folderDeleteBtn} onClick={(e) => deleteFolder(e, folder.id)} title="Excluir pasta">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {expandedFolders[folder.id] && (
                      <div className={styles.folderContent}>
                        {(sessionsByFolder[folder.id] || []).length === 0 ? (
                          <div className={styles.folderEmpty}>Solte conversas aqui</div>
                        ) : (
                          (sessionsByFolder[folder.id] || []).map(renderSessionItem)
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {sessionsByFolder.unassigned.length === 0 && folders.length === 0 && !isCreatingFolder ? (
                  <div className={styles.sidebarEmpty} style={{ padding: '20px 10px' }}>
                    <MessageSquarePlus size={24} style={{ color: 'var(--text-muted)' }} />
                    <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>Nenhuma conversa ainda</p>
                  </div>
                ) : (
                  sessionsByFolder.unassigned.map(renderSessionItem)
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Área Principal do Chat */}
      <div className={styles.main} style={{ position: 'relative' }}>
        {/* Canvas de Fundo Tecnológico */}
        <TechBackground isDark={isDark} />

        {/* Cabeçalho */}
        <div className="chat-main-header" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 28px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-surface)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 2
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {!isSharedPreview && (
              <button
                onClick={() => setIsChatSidebarCollapsed(prev => !prev)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title={isChatSidebarCollapsed ? "Mostrar menu lateral" : "Esconder menu lateral"}
                type="button"
              >
                {isChatSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {isSharedPreview 
                  ? `[Compartilhada] ${sharedSessionInfo?.title || ''}` 
                  : (activeSession ? activeSession.title : 'Assistente Voll')}
              </h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {isSharedPreview ? (
                  <>
                    <span style={{ color: 'var(--voll-red)', fontWeight: 600 }}>Modo leitura</span>
                    <span>•</span>
                    <span>Compartilhada por: <strong>{sharedSessionInfo?.creator_name || 'Colaborador Voll'}</strong></span>
                    <span>•</span>
                    <span>{sharedSessionInfo?.message_count || 0} mensagens</span>
                  </>
                ) : activeSession ? (
                  <span>Conversa ativa</span>
                ) : (
                  <span>Selecione ou crie uma conversa na barra lateral</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
            ) : activeSession ? (
              <button 
                className="btn btn-outline" 
                onClick={shareSession} 
                style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderColor: shareCopied ? 'var(--border-focus)' : 'var(--border)' }}
              >
                <Share2 size={14} />
                <span>{shareCopied ? 'Link Copiado!' : 'Compartilhar'}</span>
              </button>
            ) : null}
          </div>
        </div>

        {!activeSession && messages.length === 0 && !isSharedPreview ? (
          <div className={styles.welcome} style={{ position: 'relative', zIndex: 1 }}>
            <div className={styles.welcomeIcon}>
              <Bot size={48} />
            </div>
            <h1>Olá, sou o Voll AI</h1>
            <p>Assistente corporativo interno da Voll Solutions.<br />Como posso ajudar você hoje?</p>
            <div className={styles.welcomeSuggestions}>
              {[
                'Crie um fluxo de chatbot para suporte técnico via WhatsApp',
                'Gere uma resposta profissional para cliente insatisfeito',
                'Sugira uma automação para triagem de tickets no Zendesk',
                'Documente uma integration via webhook com a API da Voll',
              ].map((s, i) => (
                <button
                  key={i}
                  className={styles.suggestion}
                  onClick={() => setInput(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.messages} style={{ position: 'relative', zIndex: 1 }}>
            {messages.map((msg, index) => (
              <ChatMessage key={msg.id || msg.created_at || `msg-${index}`} message={msg} onEdit={handleEditMessage} />
            ))}
            {loading && (
              <div className={`${styles.message} ${styles.messageAi}`}>
                <div className={styles.messageAvatar}><Bot size={16} /></div>
                <div className={styles.messageBody}>
                  <div className={styles.messageHeader}>
                    <span className={styles.messageSender}>Voll AI</span>
                  </div>
                  <div className={styles.typing}>
                    <Loader2 size={14} className="spin" />
                    <span>Voll AI está pensando…</span>
                  </div>
                </div>
              </div>
            )}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Área de Entrada */}
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
          <div className={styles.inputArea} style={{ position: 'relative', zIndex: 2 }}>
            {isListening && (
              <div className={styles.voiceActiveBanner}>
                <span className={styles.voicePulseDot} />
                <span>Ouvindo sua voz... Fale agora!</span>
              </div>
            )}
            {selectedFile && (
              <div className={styles.filePreview}>
                <span className={styles.fileName}>📎 {selectedFile.name}</span>
                <button className={styles.fileRemove} onClick={() => setSelectedFile(null)} title="Remover anexo">
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
                className={styles.attachBtn} 
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
                className={styles.input}
                style={{ paddingLeft: '8px' }}
              />
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={!input.trim() || loading}
                title="Enviar"
              >
                {loading ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
              </button>
            </form>

            {hasSensitiveData ? (
              <p className={styles.inputWarnHint}>
                <ShieldAlert size={13} />
                Nota: Lembre-se de não compartilhar dados pessoais de clientes.
              </p>
            ) : (
              <p className={styles.disclaimer}>
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
