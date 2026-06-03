const express = require('express');
const router = express.Router();
const pool = require('../db/dbConfig');

// Get history for the current user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId || userId === 'undefined') {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await pool.query(
      'SELECT * FROM prompt_history WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Delete history item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM prompt_history WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting history item:', error);
    res.status(500).json({ error: 'Failed to delete history item' });
  }
});

module.exports = router;
