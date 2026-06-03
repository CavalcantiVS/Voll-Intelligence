const express = require('express');
const router = express.Router();
const pool = require('../db/dbConfig');
const aiService = require('../services/aiService');
const sanitizationService = require('../services/sanitizationService');

// POST /api/chat/message — send a message, receive AI response
router.post('/message', async (req, res) => {
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

    // Save original user message to DB
    await pool.query(
      `INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)`,
      [sessionId, 'user', content]
    );

    // Generate AI response passing history and the new sanitized prompt
    const aiResponse = await aiService.generateChatResponse(history, sanitizedContent, { model: aiModel, temperature: aiTemp });

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
      `SELECT id, role, content, created_at 
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

module.exports = router;
