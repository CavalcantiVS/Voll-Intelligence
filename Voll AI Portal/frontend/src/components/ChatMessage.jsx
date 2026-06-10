import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Bot, User, Edit2, X } from 'lucide-react';

const ChatMessage = ({ message, onEdit }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!editContent.trim()) return;
    try {
      await onEdit(message.id, editContent.trim());
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar edição.');
    }
  };

  const handleCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`chat-message ${isUser ? 'chat-message--user' : 'chat-message--ai'}`}>
      <div className="chat-message__avatar">
        {isUser ? (
          message.sender_avatar ? (
            <img src={message.sender_avatar} alt={message.sender_name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <User size={18} />
          )
        ) : (
          <Bot size={18} />
        )}
      </div>
      <div className="chat-message__body">
        <div className="chat-message__header">
          <span className="chat-message__sender">
            {isUser ? (message.sender_name || 'Você') : 'Voll AI'}
          </span>
          {message.created_at && (
            <span className="chat-message__time">{formatTime(message.created_at)}</span>
          )}
        </div>
        <div className="chat-message__content">
          {message.file_name && (
            <div className="chat-message-attachment">
              <span className="chat-message-attachment-icon">📎</span>
              <span className="chat-message-attachment-name">{message.file_name}</span>
            </div>
          )}
          
          {isEditing ? (
            <div className="chat-message__edit-area" style={{ marginTop: '8px' }}>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="form-control"
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-page)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleCancel}
                  style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <X size={12} />
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Check size={12} />
                  Salvar
                </button>
              </div>
            </div>
          ) : isUser ? (
            <p>{message.content}</p>
          ) : (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          )}
        </div>

        {!isEditing && (
          <div className="chat-message__actions message-actions-wrapper" style={{ display: 'flex', gap: '8px', position: 'absolute', right: '16px', bottom: '8px', opacity: 0, transition: 'opacity 0.15s ease' }}>
            {!isUser && (
              <button 
                className="chat-message__copy" 
                onClick={handleCopy} 
                title="Copiar mensagem"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}
            {!isUser && onEdit && message.id && (
              <button
                className="chat-message__copy"
                onClick={() => { setIsEditing(true); setEditContent(message.content); }}
                title="Editar resposta da IA"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' }}
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
      
      <style>{`
        .chat-message:hover .message-actions-wrapper {
          opacity: 1 !important;
        }
        .chat-message {
          position: relative;
        }
      `}</style>
    </div>
  );
};

export default ChatMessage;
