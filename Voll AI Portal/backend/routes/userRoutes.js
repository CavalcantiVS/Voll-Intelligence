const express = require('express');
const router = express.Router();
const pool = require('../db/dbConfig');

// ── Helper: verify the caller is an Administrador Geral ──────────
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

// GET /api/users?userId=<admin_id>
// Lists all collaborators (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, department, status, avatar
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
// Creates a new collaborator (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, email, role, department, status, avatar } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e e-mail são obrigatórios' });
    }

    // Check duplicate email
    const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [email.trim().toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Já existe um colaborador com este e-mail' });
    }

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, role, department, status, avatar)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, department, status, avatar`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        role || 'Colaborador',
        department || 'Atendimento',
        status || 'Ativo',
        avatar || null,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Falha ao cadastrar colaborador' });
  }
});

// PUT /api/users/:targetId
// Updates role and/or status of a specific user (admin only)
router.put('/:targetId', requireAdmin, async (req, res) => {
  try {
    const { targetId } = req.params;
    const { role, status, name, email, department, avatar } = req.body;

    // Prevent admin from suspending themselves
    if (targetId === req.adminId && status === 'Suspenso') {
      return res.status(400).json({ error: 'Você não pode suspender sua própria conta' });
    }

    // Build dynamic SET clause
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

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    values.push(targetId);

    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, department, status, avatar`,
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
// Deletes a specific user (admin only)
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
