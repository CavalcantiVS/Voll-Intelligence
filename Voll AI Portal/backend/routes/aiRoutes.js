const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const sanitizationService = require('../services/sanitizationService');
const pool = require('../db/dbConfig');

router.post('/generate', async (req, res) => {
  try {
    const { prompt, type, userId, formData, dlpLevel = 'rigoroso', aiModel, aiTemp } = req.body;
    
    // Sanitiza o prompt apenas se dlpLevel for 'rigoroso'
    const sanitizedPrompt = dlpLevel === 'rigoroso'
      ? sanitizationService.sanitize(prompt)
      : prompt;
    
    // Chama o AI Service
    const aiResponse = await aiService.generateResponse(sanitizedPrompt, type, { model: aiModel, temperature: aiTemp });
    
    // Salva no DB
    // Alternativa para Admin User se nenhum userId for fornecido
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
