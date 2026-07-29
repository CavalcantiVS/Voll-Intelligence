const express = require('express');
const router = express.Router();
const pool = require('../db/dbConfig');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware.requireAuth);

// Obter todas as notificações do usuário logado
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
});

// Marcar uma notificação como lida
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Erro ao atualizar notificação' });
  }
});

// Marcar todas como lidas
router.patch('/read-all', async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1`,
      [req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Erro ao atualizar notificações' });
  }
});

module.exports = router;
