const express = require('express');
const router = express.Router();
const pool = require('../db/dbConfig');
const aiService = require('../services/aiService');
const sanitizationService = require('../services/sanitizationService');
const { requireAuth } = require('../middleware/authMiddleware');

const multer = require('multer');
const pdfParse = require('pdf-parse');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Protege todas as rotas de chat com autenticação JWT real
router.use(requireAuth);

// POST /api/chat/message — send a message, receive AI response (sync or async WebSocket stream)
router.post('/message', upload.single('file'), async (req, res) => {
  try {
    const { sessionId, content, dlpLevel = 'rigoroso', aiModel, aiTemp } = req.body;
    const userId = req.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Check if session belongs to a team
    const sessionResult = await pool.query(
      `SELECT team_id FROM chat_sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversa não encontrada.' });
    }

    const teamId = sessionResult.rows[0].team_id;
    const isTeamSession = !!teamId;

    // Verify team membership
    if (isTeamSession) {
      const checkMembership = await pool.query(
        `SELECT papel FROM membros_equipe WHERE equipe_id = $1 AND usuario_id = $2`,
        [teamId, userId]
      );
      if (checkMembership.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado. Você não é membro desta equipe.' });
      }
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
        let extractedText = (pdfData.text || '').replace(/\x00/g, '').trim();
        if (extractedText.length === 0) {
          extractedText = "(O arquivo PDF anexado não contém texto selecionável/extraível...)";
        }
        dbFileContent = extractedText;
        attachmentParams = { fileName: dbFileName, text: dbFileContent };
      } else if (dbFileMime.startsWith('image/')) {
        dbFileContent = buffer.toString('base64');
        attachmentParams = { fileName: dbFileName, base64: dbFileContent, mimeType: dbFileMime };
      } else {
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

    const history = historyResult.rows.map(row => ({
      role: row.role,
      content: dlpLevel === 'rigoroso' ? sanitizationService.sanitize(row.content) : row.content
    }));

    // Save original user message to DB (linked with user_id)
    const userMsgInsert = await pool.query(
      `INSERT INTO chat_messages (session_id, role, content, file_name, file_content, file_mimetype, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, role, content, file_name, created_at, user_id`,
      [sessionId, 'user', content, dbFileName, dbFileContent, dbFileMime, userId]
    );
    const userMsg = userMsgInsert.rows[0];

    // Fetch user details for WebSocket emission
    const userResult = await pool.query(
      `SELECT name, avatar FROM users WHERE id = $1`,
      [userId]
    );
    const userRow = userResult.rows[0];
    const userMsgWithSender = {
      ...userMsg,
      sender_name: userRow.name,
      sender_avatar: userRow.avatar
    };

    const io = req.app.get('io');

    if (isTeamSession) {
      // Emit the user message to the team room
      if (io) {
        io.to(teamId).emit('message_added', userMsgWithSender);
      }

      // Create an assistant message placeholder in DB
      const assistantPlaceholder = await pool.query(
        `INSERT INTO chat_messages (session_id, role, content) 
         VALUES ($1, $2, $3) 
         RETURNING id, role, content, created_at`,
        [sessionId, 'assistant', '']
      );
      const assistantMsg = assistantPlaceholder.rows[0];

      // Emit the empty assistant placeholder to team room
      if (io) {
        io.to(teamId).emit('message_added', {
          ...assistantMsg,
          sender_name: 'Voll AI',
          sender_avatar: null
        });
      }

      // Trigger asynchronous response streaming in background
      aiService.generateChatResponseStream(history, sanitizedContent, {
        model: aiModel,
        temperature: aiTemp,
        attachment: attachmentParams
      }, (chunk) => {
        // Emit chunk to room
        if (io) {
          io.to(teamId).emit('message_chunk', {
            messageId: assistantMsg.id,
            chunk
          });
        }
      }).then(async (fullContent) => {
        // Update database with completed content
        await pool.query(
          `UPDATE chat_messages SET content = $1 WHERE id = $2`,
          [fullContent, assistantMsg.id]
        );
        // Update session timestamp
        await pool.query(
          `UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1`,
          [sessionId]
        );
        // Emit finished signal
        if (io) {
          io.to(teamId).emit('message_complete', {
            messageId: assistantMsg.id,
            content: fullContent
          });
        }
      }).catch(async (err) => {
        console.error('Streaming failed:', err);
        const errorText = '⚠️ Erro ao gerar resposta da IA.';
        await pool.query(
          `UPDATE chat_messages SET content = $1 WHERE id = $2`,
          [errorText, assistantMsg.id]
        );
        if (io) {
          io.to(teamId).emit('message_complete', {
            messageId: assistantMsg.id,
            content: errorText
          });
        }
      });

      // Send 202 Accepted right away (non-blocking)
      return res.status(202).json({ success: true, message: 'Processando resposta...', messageId: assistantMsg.id });
    }

    // Normal flow: Private sessions (Sync generation)
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

// POST /api/chat/sessions — create a new session (can be linked to teamId)
router.post('/sessions', async (req, res) => {
  try {
    const userId = req.userId;
    const { title, teamId } = req.body;

    const result = await pool.query(
      `INSERT INTO chat_sessions (user_id, title, team_id) VALUES ($1, $2, $3) RETURNING id, title, created_at, team_id`,
      [userId, title || 'Nova conversa', teamId || null]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[chatRoutes] Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/chat/sessions — list all sessions for user (private + teams they are in)
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT DISTINCT s.id, s.title, s.created_at, s.updated_at, s.team_id, e.nome as team_name
       FROM chat_sessions s
       LEFT JOIN equipes e ON s.team_id = e.id
       LEFT JOIN membros_equipe m ON e.id = m.equipe_id
       WHERE (s.user_id = $1 AND s.team_id IS NULL) OR (m.usuario_id = $1)
       ORDER BY s.updated_at DESC
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

    // Verify access
    const sessionRes = await pool.query(`SELECT team_id, user_id FROM chat_sessions WHERE id = $1`, [id]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Conversa não encontrada.' });
    }

    const { team_id: teamId, user_id: sessionOwnerId } = sessionRes.rows[0];
    if (teamId) {
      const checkMembership = await pool.query(
        `SELECT papel FROM membros_equipe WHERE equipe_id = $1 AND usuario_id = $2`,
        [teamId, req.userId]
      );
      if (checkMembership.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado. Você não é membro desta equipe.' });
      }
    } else if (sessionOwnerId !== req.userId) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const result = await pool.query(
      `SELECT m.id, m.role, m.content, m.file_name, m.created_at, m.user_id, u.name as sender_name, u.avatar as sender_avatar
       FROM chat_messages m
       LEFT JOIN users u ON m.user_id = u.id
       WHERE m.session_id = $1
       ORDER BY m.created_at ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[chatRoutes] Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// PUT /api/chat/messages/:messageId — edit a message content (collaborative editing)
router.put('/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'O conteúdo da mensagem é obrigatório.' });
    }

    // Find the session and team_id of this message
    const msgInfo = await pool.query(
      `SELECT m.session_id, s.team_id 
       FROM chat_messages m
       JOIN chat_sessions s ON m.session_id = s.id
       WHERE m.id = $1`,
      [messageId]
    );

    if (msgInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Mensagem não encontrada.' });
    }

    const { session_id: sessionId, team_id: teamId } = msgInfo.rows[0];

    // Check permissions
    if (teamId) {
      const checkMembership = await pool.query(
        `SELECT papel FROM membros_equipe WHERE equipe_id = $1 AND usuario_id = $2`,
        [teamId, req.userId]
      );
      if (checkMembership.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado. Você não é membro desta equipe.' });
      }
    } else {
      // If private, only the session owner can edit
      const sessionOwner = await pool.query(`SELECT user_id FROM chat_sessions WHERE id = $1`, [sessionId]);
      if (sessionOwner.rows.length === 0 || sessionOwner.rows[0].user_id !== req.userId) {
        return res.status(403).json({ error: 'Acesso negado.' });
      }
    }

    // Update message
    await pool.query(
      `UPDATE chat_messages SET content = $1 WHERE id = $2`,
      [content.trim(), messageId]
    );

    // Emit WebSocket event to sync screens in real-time
    const io = req.app.get('io');
    if (teamId && io) {
      io.to(teamId).emit('message_edited', { messageId, content: content.trim() });
    }

    res.json({ success: true, content: content.trim() });
  } catch (err) {
    console.error('Error editing message:', err);
    res.status(500).json({ error: 'Erro ao salvar a edição da mensagem.' });
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
      `SELECT s.id, s.title, s.user_id, s.created_at, s.updated_at, s.team_id, u.name as creator_name, u.avatar as creator_avatar
       FROM chat_sessions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    const session = sessionResult.rows[0];

    // Fetch stats
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
    const userId = req.userId;

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
        `INSERT INTO chat_messages (session_id, role, content, file_name, file_content, file_mimetype, user_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newSession.id, msg.role, msg.content, msg.file_name, msg.file_content, msg.file_mimetype, msg.role === 'user' ? userId : null]
      );
    }

    res.json(newSession);
  } catch (error) {
    console.error('[chatRoutes] Error cloning session:', error);
    res.status(500).json({ error: 'Failed to clone session' });
  }
});

module.exports = router;
