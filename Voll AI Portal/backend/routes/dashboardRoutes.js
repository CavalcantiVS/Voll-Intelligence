const express = require('express');
const router = express.Router();
const pool = require('../db/dbConfig');

// GET /api/dashboard/metrics
router.get('/metrics', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId || userId === 'undefined') return res.status(400).json({ error: 'Missing userId' });

    // Quantidade de logs gerados hoje
    const todayRes = await pool.query(
      `SELECT COUNT(*) FROM prompt_history WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE`,
      [userId]
    );

    // Total de fluxos salvos
    const fluxosRes = await pool.query(
      `SELECT COUNT(*) FROM prompt_history WHERE user_id = $1 AND type = 'ChatbotFlow'`,
      [userId]
    );

    // Respostas enviadas
    const respostasRes = await pool.query(
      `SELECT COUNT(*) FROM prompt_history WHERE user_id = $1 AND type = 'ResponseGenerator'`,
      [userId]
    );

    res.json({
      atendimentosHoje: parseInt(todayRes.rows[0].count, 10),
      fluxosAtivos: parseInt(fluxosRes.rows[0].count, 10),
      respostasEnviadas: parseInt(respostasRes.rows[0].count, 10),
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// GET /api/dashboard/chart
router.get('/chart', async (req, res) => {
  try {
    const { userId, days = 7 } = req.query;
    if (!userId || userId === 'undefined') return res.status(400).json({ error: 'Missing userId' });

    const numDays = parseInt(days, 10);

    // Gera série dos últimos N dias e junta com as contagens agrupadas por data
    // Nota: Isso depende das funções do PostgreSQL
    const query = `
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${numDays - 1} days',
          CURRENT_DATE,
          '1 day'::interval
        )::date AS date_val
      )
      SELECT 
        to_char(ds.date_val, 'DD/MM/YYYY') as date_formatted,
        ds.date_val as raw_date,
        COUNT(ph.id) as total
      FROM date_series ds
      LEFT JOIN prompt_history ph ON DATE(ph.created_at) = ds.date_val AND ph.user_id = $1
      GROUP BY ds.date_val
      ORDER BY ds.date_val ASC;
    `;

    const result = await pool.query(query, [userId]);
    
    // Formata para recharts
    const chartData = result.rows.map(row => {
      const d = new Date(row.raw_date);
      // Para <=14 dias, podemos mostrar o nome do dia (Dom, Seg, etc) no frontend, 
      // mas vamos fornecer a data bruta e a data formatada aqui
      return {
        date: row.date_formatted,
        rawDate: row.raw_date,
        total: parseInt(row.total, 10)
      };
    });

    res.json(chartData);
  } catch (error) {
    console.error('Error fetching dashboard chart:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

module.exports = router;
