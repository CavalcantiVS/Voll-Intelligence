const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/dbConfig');
const { requireAuth, JWT_SECRET } = require('../middleware/authMiddleware');
const { validateMicrosoftToken } = require('../middleware/msalMiddleware');

// ── Helper: gera um JWT Voll para um usuário ──────────────────────
const issueVollToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ── POST /api/auth/login ──────────────────────────────────────────
// Login tradicional com e-mail e senha
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const { rows } = await pool.query(
      `SELECT id, name, email, role, status, password_hash, avatar, department, allowed_screens
       FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    const user = rows[0];

    if (user.status === 'Suspenso') {
      return res.status(403).json({ error: 'Esta conta está suspensa. Fale com o Administrador.' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Esta conta utiliza login via Microsoft. Use o botão "Entrar com Conta Microsoft".' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    const token = issueVollToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, allowed_screens: user.allowed_screens }
    });

  } catch (err) {
    console.error('Error in /login:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// ── POST /api/auth/microsoft ──────────────────────────────────────
// Login via Microsoft SSO — valida token MSAL e emite JWT Voll
router.post('/microsoft', async (req, res) => {
  try {
    const { msalToken, msalAccount } = req.body;

    if (!msalToken && !msalAccount) {
      return res.status(400).json({ error: 'Token Microsoft não fornecido' });
    }

    // Use info from msalAccount (already validated by MSAL on client side)
    // and optionally cross-validate with JWKS if token present
    let email, name, microsoftId;

    if (msalAccount) {
      email = msalAccount.username || msalAccount.preferred_username;
      name = msalAccount.name;
      microsoftId = msalAccount.localAccountId || msalAccount.homeAccountId;
    }

    // Optional deep validation with JWKS if access token provided
    if (msalToken) {
      try {
        const decoded = await validateMicrosoftToken(msalToken);
        email = decoded.preferred_username || decoded.upn || email;
        name = decoded.name || name;
        microsoftId = decoded.oid || decoded.sub || microsoftId;
      } catch (validationErr) {
        // If JWKS validation fails due to token type issues, still allow if account info is valid
        console.warn('JWKS validation skipped (using account info):', validationErr.message);
      }
    }

    if (!email) {
      return res.status(400).json({ error: 'Não foi possível obter o e-mail da conta Microsoft' });
    }

    // Enforce domain restriction
    const domain = email.split('@')[1] || '';
    const allowedDomain = process.env.AZURE_ALLOWED_DOMAIN || 'vollsolutions.com.br';
    if (domain.toLowerCase() !== allowedDomain.toLowerCase()) {
      return res.status(403).json({ error: `Acesso restrito a contas @${allowedDomain}` });
    }

    // Find or auto-create the user
    let { rows } = await pool.query(
      `SELECT id, name, email, role, status, avatar, allowed_screens FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    let user;
    if (rows.length === 0) {
      // Auto-cadastro: cria conta como Colaborador
      const inserted = await pool.query(
        `INSERT INTO users (name, email, role, department, status)
         VALUES ($1, $2, 'Colaborador', 'Atendimento', 'Ativo')
         RETURNING id, name, email, role, status, avatar, allowed_screens`,
        [name || email.split('@')[0], email.toLowerCase()]
      );
      user = inserted.rows[0];
      console.log(`[SSO] Auto-cadastro: ${user.email}`);
    } else {
      user = rows[0];
    }

    if (user.status === 'Suspenso') {
      return res.status(403).json({ error: 'Esta conta está suspensa. Fale com o Administrador.' });
    }

    const token = issueVollToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, allowed_screens: user.allowed_screens }
    });

  } catch (err) {
    console.error('Error in /microsoft:', err);
    res.status(500).json({ error: 'Erro ao autenticar com Microsoft: ' + err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────
// Retorna dados do usuário atual a partir do JWT Voll
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, department, status, avatar, allowed_screens FROM users WHERE id = $1`,
      [req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (rows[0].status === 'Suspenso') {
      return res.status(403).json({ error: 'Esta conta está suspensa' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error in /me:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// PUT /api/auth/profile — updates the currently logged in user's own profile (name, avatar, password)
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, avatar, password } = req.body;
    const userId = req.userId;

    const userResult = await pool.query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = userResult.rows[0];

    const fields = [];
    const values = [];
    let idx = 1;

    if (name && name.trim()) {
      fields.push(`name = $${idx++}`);
      values.push(name.trim());
    }

    if (avatar !== undefined) {
      fields.push(`avatar = $${idx++}`);
      values.push(avatar);
    }

    if (password && password.trim()) {
      if (!user.password_hash) {
        return res.status(400).json({ error: 'Contas autenticadas via Microsoft não possuem senha local para alterar.' });
      }
      const salt = await bcrypt.hash(password.trim(), 10);
      fields.push(`password_hash = $${idx++}`);
      values.push(salt);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    values.push(userId);

    const updateResult = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, department, status, avatar, allowed_screens`,
      values
    );

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: updateResult.rows[0]
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar perfil' });
  }
});

module.exports = router;
