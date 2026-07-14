const express = require('express');
const router = express.Router();
const pool = require('../db/dbConfig');
const bcrypt = require('bcryptjs');
const { requireAdmin } = require('../middleware/authMiddleware');

// GET /api/users?userId=<admin_id>
// Lista todos os colaboradores (apenas admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, department, status, avatar, allowed_screens
       FROM users
       ORDER BY name ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing users:', err);
    res.status(500).json({ error: 'Falha ao listar colaboradores' });
  }
});

// POST /api/users
// Cria um novo colaborador (apenas admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, email, role, department, status, avatar, allowed_screens } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e e-mail são obrigatórios' });
    }

    // Verifica email duplicado
    const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [email.trim().toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Já existe um colaborador com este e-mail' });
    }

    const defaultHash = await bcrypt.hash('Mudar@123', 10);

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, role, department, status, avatar, allowed_screens, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, email, role, department, status, avatar, allowed_screens`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        role || 'Colaborador',
        department || 'Atendimento',
        status || 'Ativo',
        avatar || null,
        allowed_screens ? JSON.stringify(allowed_screens) : '["/chat", "/chatbots", "/responses", "/automations", "/docs", "/refine", "/prompts", "/history", "/settings"]',
        defaultHash,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Falha ao cadastrar colaborador' });
  }
});

// PUT /api/users/:targetId
// Atualiza papel e/ou status de um usuário específico (apenas admin)
router.put('/:targetId', requireAdmin, async (req, res) => {
  try {
    const { targetId } = req.params;
    const { role, status, name, email, department, avatar, allowed_screens } = req.body;

    // Impede o admin de suspender a si mesmo
    if (targetId === req.adminId && status === 'Suspenso') {
      return res.status(400).json({ error: 'Você não pode suspender sua própria conta' });
    }

    // Constrói cláusula SET dinâmica
    const fields = [];
    const values = [];
    let idx = 1;

    if (role) {
      fields.push(`role = $${idx++}`);
      values.push(role);
    }
    if (status) {
      fields.push(`status = $${idx++}`);
      values.push(status);
    }
    if (name) {
      fields.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (email) {
      fields.push(`email = $${idx++}`);
      values.push(email.trim().toLowerCase());
    }
    if (department) {
      fields.push(`department = $${idx++}`);
      values.push(department);
    }
    if (avatar !== undefined) {
      fields.push(`avatar = $${idx++}`);
      values.push(avatar);
    }
    if (allowed_screens !== undefined) {
      fields.push(`allowed_screens = $${idx++}`);
      values.push(JSON.stringify(allowed_screens));
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    values.push(targetId);

    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, department, status, avatar, allowed_screens`,
      values
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Colaborador não encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Falha ao atualizar colaborador' });
  }
});

// DELETE /api/users/:targetId
// Exclui um usuário específico (apenas admin)
router.delete('/:targetId', requireAdmin, async (req, res) => {
  try {
    const { targetId } = req.params;

    if (targetId === req.adminId) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
    }

    const { rowCount } = await pool.query(
      `DELETE FROM users WHERE id = $1`,
      [targetId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Colaborador não encontrado' });
    }

    res.json({ message: 'Colaborador excluído com sucesso' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Falha ao excluir colaborador' });
  }
});

module.exports = router;
