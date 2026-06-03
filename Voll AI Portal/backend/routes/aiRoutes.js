const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const sanitizationService = require('../services/sanitizationService');
const pool = require('../db/dbConfig');

router.post('/generate', async (req, res) => {
  try {
    const { prompt, type, userId, formData } = req.body;
    
    // Sanitize the prompt
    const sanitizedPrompt = sanitizationService.sanitize(prompt);
    
    // Call AI Service
    const aiResponse = await aiService.generateResponse(sanitizedPrompt, type);
    
    // Save to DB
    // Fallback to Admin User if no userId provided
    const uid = userId || '00000000-0000-0000-0000-000000000000';
    
    await pool.query(
      `INSERT INTO prompt_history (user_id, type, original_prompt, form_data, sanitized_prompt, ai_response)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uid, type, prompt, formData ? JSON.stringify(formData) : null, sanitizedPrompt, aiResponse]
    );
    
    res.json({ originalPrompt: prompt, sanitizedPrompt, result: aiResponse });
  } catch (error) {
    console.error('Error generating AI response:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

module.exports = router;
