const express = require('express');
const router = express.Router();
const pool = require('../db/dbConfig');
const aiService = require('../services/aiService');
const sanitizationService = require('../services/sanitizationService');

const multer = require('multer');
const pdfParse = require('pdf-parse');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// POST /api/chat/message — send a message, receive AI response
router.post('/message', upload.single('file'), async (req, res) => {
  try {
    const { sessionId, content, dlpLevel = 'rigoroso', aiModel, aiTemp } = req.body;
    const userId = '00000000-0000-0000-0000-000000000000'; // Mock admin user

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Sanitize user message if dlpLevel is 'rigoroso'
    const sanitizedContent = dlpLevel === 'rigoroso'
      ? sanitizationService.sanitize(content)
      : content;

    let attachmentParams = null;
    let dbFileContent = null;
    let dbFileName = null;
    let dbFileMime = null;

    if (req.file) {
      dbFileName = req.file.originalname;
      dbFileMime = req.file.mimetype;
      const buffer = req.file.buffer;

      if (dbFileMime === 'application/pdf') {
        const pdfData = await pdfParse(buffer);
        // Clean null bytes from parsed PDF text to prevent PostgreSQL crashes
        let extractedText = (pdfData.text || '').replace(/\x00/g, '').trim();
        if (extractedText.length === 0) {
          extractedText = "(O arquivo PDF anexado não contém texto selecionável/extraível. Ele pode ser uma imagem digitalizada ou um documento sem OCR. Por favor, sugira ao usuário tirar capturas de tela das páginas e enviá-las como imagens no chat, já que você possui capacidade de visão.)";
        }
        dbFileContent = extractedText;
        attachmentParams = { fileName: dbFileName, text: dbFileContent };
      } else if (dbFileMime.startsWith('image/')) {
        dbFileContent = buffer.toString('base64');
        attachmentParams = { fileName: dbFileName, base64: dbFileContent, mimeType: dbFileMime };
      } else {
        // assume text
        let extractedText = buffer.toString('utf-8').replace(/\x00/g, '').trim();
        if (extractedText.length === 0) {
          extractedText = "(O arquivo de texto anexado está vazio.)";
        }
        dbFileContent = extractedText;
        attachmentParams = { fileName: dbFileName, text: dbFileContent };
      }
    }

    // Load conversation history for this session BEFORE saving the new message
    const historyResult = await pool.query(
      `SELECT role, content FROM chat_messages 
       WHERE session_id = $1 
       ORDER BY created_at ASC 
       LIMIT 20`,
      [sessionId]
    );

    // Sanitize the history as well before sending to AI if dlpLevel is 'rigoroso'
    const history = historyResult.rows.map(row => ({
      role: row.role,
      content: dlpLevel === 'rigoroso' ? sanitizationService.sanitize(row.content) : row.content
    }));

    // Save original user message to DB (including file info if present)
    await pool.query(
      `INSERT INTO chat_messages (session_id, role, content, file_name, file_content, file_mimetype) VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, 'user', content, dbFileName, dbFileContent, dbFileMime]
    );

    // Generate AI response passing history and the new sanitized prompt
    const aiResponse = await aiService.generateChatResponse(history, sanitizedContent, { 
      model: aiModel, 
      temperature: aiTemp,
      attachment: attachmentParams
    });

    // Save AI response to DB
    await pool.query(
      `INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)`,
      [sessionId, 'assistant', aiResponse]
    );

    // Update session updated_at
    await pool.query(
      `UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1`,
      [sessionId]
    );

    res.json({ role: 'assistant', content: aiResponse });
  } catch (error) {
    console.error('[chatRoutes] Error sending message:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// POST /api/chat/sessions — create a new session
router.post('/sessions', async (req, res) => {
  try {
    const userId = '00000000-0000-0000-0000-000000000000';
    const { title } = req.body;

    const result = await pool.query(
      `INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at`,
      [userId, title || 'Nova conversa']
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[chatRoutes] Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/chat/sessions — list all sessions for user
router.get('/sessions', async (req, res) => {
  try {
    const userId = '00000000-0000-0000-0000-000000000000';

    const result = await pool.query(
      `SELECT id, title, created_at, updated_at 
       FROM chat_sessions 
       WHERE user_id = $1 
       ORDER BY updated_at DESC 
       LIMIT 50`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[chatRoutes] Error listing sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// GET /api/chat/sessions/:id/messages — get messages of a session
router.get('/sessions/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, role, content, file_name, created_at 
       FROM chat_messages 
       WHERE session_id = $1 
       ORDER BY created_at ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[chatRoutes] Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// PATCH /api/chat/sessions/:id — rename a session
router.patch('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    await pool.query(
      `UPDATE chat_sessions SET title = $1 WHERE id = $2`,
      [title, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[chatRoutes] Error renaming session:', error);
    res.status(500).json({ error: 'Failed to rename session' });
  }
});

// DELETE /api/chat/sessions/:id — delete a session and its messages
router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(`DELETE FROM chat_messages WHERE session_id = $1`, [id]);
    await pool.query(`DELETE FROM chat_sessions WHERE id = $1`, [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('[chatRoutes] Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});
// GET /api/chat/sessions/:id — get single session info with creator details and statistics
router.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch session details and join user name/avatar
    const sessionResult = await pool.query(
      `SELECT s.id, s.title, s.user_id, s.created_at, s.updated_at, u.name as creator_name, u.avatar as creator_avatar
       FROM chat_sessions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    const session = sessionResult.rows[0];

    // Fetch stats (message count and files count)
    const statsResult = await pool.query(
      `SELECT COUNT(*) as message_count,
              COUNT(CASE WHEN file_name IS NOT NULL THEN 1 END) as file_count
       FROM chat_messages
       WHERE session_id = $1`,
      [id]
    );

    const stats = statsResult.rows[0];
    session.message_count = parseInt(stats.message_count || 0, 10);
    session.file_count = parseInt(stats.file_count || 0, 10);

    res.json(session);
  } catch (error) {
    console.error('[chatRoutes] Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// POST /api/chat/sessions/:id/clone — clone a shared session
router.post('/sessions/:id/clone', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = '00000000-0000-0000-0000-000000000000'; // Mock admin user

    // Get original session details
    const sessionResult = await pool.query(
      `SELECT title FROM chat_sessions WHERE id = $1`,
      [id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversa original não encontrada' });
    }

    const originalTitle = sessionResult.rows[0].title;
    const newTitle = originalTitle.startsWith('Cópia de ') ? originalTitle : `Cópia de ${originalTitle}`;

    // Create a new session
    const newSessionResult = await pool.query(
      `INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at`,
      [userId, newTitle]
    );
    const newSession = newSessionResult.rows[0];

    // Get all original messages
    const messagesResult = await pool.query(
      `SELECT role, content, file_name, file_content, file_mimetype FROM chat_messages 
       WHERE session_id = $1 
       ORDER BY created_at ASC`,
      [id]
    );

    // Insert original messages into the cloned session
    for (const msg of messagesResult.rows) {
      await pool.query(
        `INSERT INTO chat_messages (session_id, role, content, file_name, file_content, file_mimetype) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newSession.id, msg.role, msg.content, msg.file_name, msg.file_content, msg.file_mimetype]
      );
    }

    res.json(newSession);
  } catch (error) {
    console.error('[chatRoutes] Error cloning session:', error);
    res.status(500).json({ error: 'Failed to clone session' });
  }
});

module.exports = router;
