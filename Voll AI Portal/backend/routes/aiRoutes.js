const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const sanitizationService = require('../services/sanitizationService');
const pool = require('../db/dbConfig');

router.post('/generate', async (req, res) => {
  try {
    const { prompt, type } = req.body;
    
    // Sanitize the prompt
    const sanitizedPrompt = sanitizationService.sanitize(prompt);
    
    // Call AI Service
    const aiResponse = await aiService.generateResponse(sanitizedPrompt, type);
    
    // Save to DB
    const userId = '00000000-0000-0000-0000-000000000000'; // Mock Admin User
    await pool.query(
      `INSERT INTO prompt_history (user_id, type, original_prompt, sanitized_prompt, ai_response)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, prompt, sanitizedPrompt, aiResponse]
    );
    
    res.json({ originalPrompt: prompt, sanitizedPrompt, result: aiResponse });
  } catch (error) {
    console.error('Error generating AI response:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

module.exports = router;
