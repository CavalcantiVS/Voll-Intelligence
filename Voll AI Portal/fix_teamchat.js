const fs = require('fs');
const path = require('path');

const teamChatPath = path.join(__dirname, 'frontend/src/pages/TeamChat.jsx');
let content = fs.readFileSync(teamChatPath, 'utf8');

// 1. Imports
if (!content.includes('import { useToast }')) {
  content = content.replace(
    /import ChatMessage from '\.\.\/components\/ChatMessage';/,
    `import ChatMessage from '../components/ChatMessage';\nimport TypingIndicator from '../components/TypingIndicator';\nimport { useToast } from '../contexts/ToastContext';\nimport { Maximize2, Minimize2 } from 'lucide-react';`
  );
}

// 2. States
if (!content.includes('const toast = useToast();')) {
  content = content.replace(
    /const navigate = useNavigate\(\);/,
    `const navigate = useNavigate();\n  const toast = useToast();\n  const [isTyping, setIsTyping] = useState(false);\n  const [isZenMode, setIsZenMode] = useState(false);`
  );
}

// 3. Alerts -> Toast
content = content.replace(/alert\((.*)\);/g, 'toast.error($1);');

// 4. Online prop in ChatMessage - literal string replace to be safe
const searchString = '<ChatMessage key={msg.id || msg.created_at || `msg-${index}`} message={msg} onEdit={handleEditMessage} />';
const replaceString = '<ChatMessage key={msg.id || msg.created_at || `msg-${index}`} message={msg} onEdit={handleEditMessage} isOnline={onlineMembers.includes(msg.sender_id)} />';
content = content.replace(searchString, replaceString);

// 5. Zen Mode Button
if (!content.includes('isZenMode')) {
  const zenBtn = `
              <button
                onClick={() => {
                  setIsZenMode(!isZenMode);
                  window.dispatchEvent(new CustomEvent('toggle-zen-mode'));
                }}
                className="btn btn-outline"
                style={{ padding: '6px', border: 'none' }}
                title="Modo Foco"
              >
                {isZenMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>`;
              
  content = content.replace(
    /(<span style=\{\{ color: 'var\(--text-muted\)', fontSize: '0.85rem' \}\}>.*<\/span>\n\s*<\/div>\n\s*<\/div>)/,
    `$1\n${zenBtn}`
  );
}

fs.writeFileSync(teamChatPath, content);
console.log('TeamChat.jsx safely updated.');
