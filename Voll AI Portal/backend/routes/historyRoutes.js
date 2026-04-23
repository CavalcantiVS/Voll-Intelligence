const express = require('express');
const router = express.Router();
const pool = require('../db/dbConfig');

// Get history for the current user
router.get('/', async (req, res) => {
  try {
    // In a real app, user_id comes from auth token (JWT)
    const userId = '00000000-0000-0000-0000-000000000000'; // Mock Admin User

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

module.exports = router;
