import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Bot, User } from 'lucide-react';

const ChatMessage = ({ message }) => {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`chat-message ${isUser ? 'chat-message--user' : 'chat-message--ai'}`}>
      <div className="chat-message__avatar">
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>
      <div className="chat-message__body">
        <div className="chat-message__header">
          <span className="chat-message__sender">{isUser ? 'Você' : 'Voll AI'}</span>
          {message.created_at && (
            <span className="chat-message__time">{formatTime(message.created_at)}</span>
          )}
        </div>
        <div className="chat-message__content">
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          )}
        </div>
        {!isUser && (
          <button className="chat-message__copy" onClick={handleCopy} title="Copiar mensagem">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
