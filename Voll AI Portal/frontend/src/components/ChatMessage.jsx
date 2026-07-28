import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Bot, User, Edit2, X } from 'lucide-react';

import styles from '../pages/Chat.module.css';

const CodeBlock = ({ node, inline, className, children, ...props }) => {
  const match = /language-(w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className={styles.codeBlockWrapper} style={{ borderRadius: '8px', overflow: 'hidden', margin: '12px 0', border: '1px solid var(--border)' }}>
        <div className={styles.codeBlockHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FF5F56' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#27C93F' }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lang}</span>
          <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        <pre style={{ margin: 0, padding: '12px', backgroundColor: 'rgba(0,0,0,0.03)', overflowX: 'auto' }}>
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  }
  return <code className={className} {...props} style={{ backgroundColor: 'var(--bg-subtle)', padding: '2px 4px', borderRadius: '4px', fontSize: '0.85em' }}>{children}</code>;
};

const ChatMessage = ({ message, onEdit, isOnline }) => {
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
    <div className={`${styles.message} ${isUser ? styles.messageUser : styles.messageAi}`}>
      <div className={styles.messageAvatar} style={isOnline ? { boxShadow: '0 0 0 2px var(--success, #10B981)', border: '2px solid var(--bg-surface)' } : {}}>
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
      <div className={styles.messageBody}>
        <div className={styles.messageHeader}>
          <span className={styles.messageSender}>
            {isUser ? (message.sender_name || 'Você') : 'Voll AI'}
          </span>
          {message.created_at && (
            <span className={styles.messageTime}>{formatTime(message.created_at)}</span>
          )}
        </div>
        <div className={styles.messageContent}>
          {message.file_name && (
            <div className={styles.messageAttachment}>
              <span className={styles.messageAttachmentIcon}>📎</span>
              <span className={styles.messageAttachmentName}>{message.file_name}</span>
            </div>
          )}
          
          {isEditing ? (
            <div className={styles.messageEditArea} style={{ marginTop: '8px' }}>
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
            <ReactMarkdown components={{ code: CodeBlock }}>{message.content}</ReactMarkdown>
          )}
        </div>

        {!isEditing && (
          <div className={`${styles.messageActions} ${styles.messageActionsWrapper}`} style={{ display: 'flex', gap: '8px', position: 'absolute', right: '16px', bottom: '8px', opacity: 0, transition: 'opacity 0.15s ease' }}>
            {!isUser && (
              <button 
                className={styles.messageCopy} 
                onClick={handleCopy} 
                title="Copiar mensagem"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}
            {!isUser && onEdit && message.id && (
              <button
                className={styles.messageCopy}
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
        .message:hover .messageActionsWrapper {
          opacity: 1 !important;
        }
        .message {
          position: relative;
        }
      `}</style>
    </div>
  );
};

export default ChatMessage;
