const express = require('express');
const router = express.Router();
const pool = require('../db/dbConfig');
const aiService = require('../services/aiService');
const sanitizationService = require('../services/sanitizationService');

// POST /api/chat/message — send a message, receive AI response
router.post('/message', async (req, res) => {
  try {
    const { sessionId, content } = req.body;
    const userId = '00000000-0000-0000-0000-000000000000'; // Mock admin user

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Sanitize user message
    const sanitizedContent = sanitizationService.sanitize(content);

    // Save user message to DB
    await pool.query(
      `INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)`,
      [sessionId, 'user', content]
    );

    // Load conversation history for this session (last 20 messages for context)
    const historyResult = await pool.query(
      `SELECT role, content FROM chat_messages 
       WHERE session_id = $1 
       ORDER BY created_at ASC 
       LIMIT 20`,
      [sessionId]
    );

    const messages = historyResult.rows.map(row => ({
      role: row.role,
      content: row.content
    }));

    // Override last message with sanitized version for AI
    if (messages.length > 0) {
      messages[messages.length - 1].content = sanitizedContent;
    }

    // Generate AI response
    const aiResponse = await aiService.generateChatResponse(messages);

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
