const express = require('express');
const router = express.Router();
const pool = require('../db/dbConfig');

// ── Helper: verifica se o chamador é um Administrador Geral ──────────
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.query.userId || req.body.userId;
    if (!userId || userId === 'undefined') {
      return res.status(401).json({ error: 'userId ausente' });
    }

    const { rows } = await pool.query(
      `SELECT role FROM users WHERE id = $1`,
      [userId]
    );

    if (!rows.length || rows[0].role !== 'Administrador Geral') {
      return res.status(403).json({ error: 'Acesso restrito a Administrador Geral' });
    }

    req.adminId = userId;
    next();
  } catch (err) {
    console.error('Admin check failed:', err);
    res.status(500).json({ error: 'Erro interno ao verificar permissões' });
  }
};

// GET /api/departments
// Lista todos os departamentos ordenados pela ordem de classificação e depois pelo nome
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT id, name, order_index FROM departments ORDER BY order_index ASC, name ASC`);
    res.json(rows);
  } catch (err) {
    console.error('Error listing departments:', err);
    res.status(500).json({ error: 'Falha ao listar departamentos' });
  }
});

// PUT /api/departments/reorder
// Reordena departamentos
router.put('/reorder', requireAdmin, async (req, res) => {
  try {
    const { order } = req.body; // array of { id, order_index }
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'Formato de ordem inválido' });
    }

    // Inicia a transação
    await pool.query('BEGIN');
    for (const item of order) {
      await pool.query(`UPDATE departments SET order_index = $1 WHERE id = $2`, [item.order_index, item.id]);
    }
    await pool.query('COMMIT');
    
    res.json({ message: 'Ordem atualizada com sucesso' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error reordering departments:', err);
    res.status(500).json({ error: 'Falha ao reordenar departamentos' });
  }
});

// POST /api/departments
// Adiciona um novo departamento (requer nome, verifica duplicata)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nome do departamento é obrigatório' });
    }

    const existing = await pool.query(`SELECT id FROM departments WHERE name = $1`, [name.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Já existe um departamento com este nome' });
    }

    const { rows } = await pool.query(
      `INSERT INTO departments (name) VALUES ($1) RETURNING id, name`,
      [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating department:', err);
    res.status(500).json({ error: 'Falha ao criar departamento' });
  }
});

// DELETE /api/departments/:id
// Exclui um departamento (previne se algum usuário o estiver usando atualmente)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const deptRes = await pool.query(`SELECT name FROM departments WHERE id = $1`, [id]);
    if (deptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Departamento não encontrado' });
    }
    const deptName = deptRes.rows[0].name;

    const userCheck = await pool.query(`SELECT id FROM users WHERE department = $1 LIMIT 1`, [deptName]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Não é possível excluir o departamento porque há usuários vinculados a ele' });
    }

    await pool.query(`DELETE FROM departments WHERE id = $1`, [id]);
    res.json({ message: 'Departamento excluído com sucesso' });
  } catch (err) {
    console.error('Error deleting department:', err);
    res.status(500).json({ error: 'Falha ao excluir departamento' });
  }
});

module.exports = router;
