const express = require('express');
const router = express.Router();
const pool = require('../db/dbConfig');
const { requireAuth } = require('../middleware/authMiddleware');

// Protege todas as rotas de equipes com autenticação
router.use(requireAuth);

// GET /api/teams — List all teams the user belongs to (accepted only)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.id, e.nome, e.criador_id, e.data_criacao, m.papel
       FROM equipes e
       JOIN membros_equipe m ON e.id = m.equipe_id
       WHERE m.usuario_id = $1 AND m.status = 'aceito'
       ORDER BY e.nome ASC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing teams:', err);
    res.status(500).json({ error: 'Erro ao carregar equipes.' });
  }
});

// GET /api/teams/invitations — List pending invitations for the logged-in user
router.get('/invitations', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id as membership_id, m.papel, m.created_at, e.id as team_id, e.nome as team_name, u.name as creator_name
       FROM membros_equipe m
       JOIN equipes e ON m.equipe_id = e.id
       LEFT JOIN users u ON e.criador_id = u.id
       WHERE m.usuario_id = $1 AND m.status = 'pendente'
       ORDER BY m.created_at DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing invitations:', err);
    res.status(500).json({ error: 'Erro ao carregar convites.' });
  }
});

// POST /api/teams/invitations/:membershipId/accept — Accept pending team invite
router.post('/invitations/:membershipId/accept', async (req, res) => {
  try {
    const { membershipId } = req.params;

    const { rowCount } = await pool.query(
      `UPDATE membros_equipe SET status = 'aceito' WHERE id = $1 AND usuario_id = $2`,
      [membershipId, req.userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Convite não encontrado ou já processado.' });
    }

    res.json({ success: true, message: 'Convite aceito com sucesso!' });
  } catch (err) {
    console.error('Error accepting invitation:', err);
    res.status(500).json({ error: 'Erro ao aceitar convite.' });
  }
});

// POST /api/teams/invitations/:membershipId/reject — Reject/Delete pending team invite
router.post('/invitations/:membershipId/reject', async (req, res) => {
  try {
    const { membershipId } = req.params;

    const { rowCount } = await pool.query(
      `DELETE FROM membros_equipe WHERE id = $1 AND usuario_id = $2`,
      [membershipId, req.userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Convite não encontrado ou já processado.' });
    }

    res.json({ success: true, message: 'Convite recusado com sucesso.' });
  } catch (err) {
    console.error('Error rejecting invitation:', err);
    res.status(500).json({ error: 'Erro ao recusar convite.' });
  }
});

// POST /api/teams — Create a new team and add creator as admin
router.post('/', async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'O nome da equipe é obrigatório.' });
    }

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const teamInsert = await client.query(
        `INSERT INTO equipes (nome, criador_id) VALUES ($1, $2) RETURNING id, nome, criador_id, data_criacao`,
        [nome.trim(), req.userId]
      );
      const newTeam = teamInsert.rows[0];

      await client.query(
        `INSERT INTO membros_equipe (equipe_id, usuario_id, papel, status) VALUES ($1, $2, 'admin', 'aceito')`,
        [newTeam.id, req.userId]
      );

      await client.query('COMMIT');
      res.status(201).json({ ...newTeam, papel: 'admin' });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error creating team:', err);
    res.status(500).json({ error: 'Erro ao criar equipe.' });
  }
});

// GET /api/teams/users/search — Search users by exact corporate email
router.get('/users/search', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'E-mail não fornecido.' });
    }

    const { rows } = await pool.query(
      `SELECT id, name, email, avatar FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Colaborador não encontrado.' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error searching user:', err);
    res.status(500).json({ error: 'Erro ao buscar colaborador.' });
  }
});

// GET /api/teams/:id/members — List members of a team
router.get('/:id/members', async (req, res) => {
  try {
    const teamId = req.params.id;

    // Check if the user is a member of the team
    const checkMembership = await pool.query(
      `SELECT papel, status FROM membros_equipe WHERE equipe_id = $1 AND usuario_id = $2`,
      [teamId, req.userId]
    );

    if (checkMembership.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado. Você não é membro desta equipe.' });
    }

    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar, m.papel, m.status, m.created_at
       FROM membros_equipe m
       JOIN users u ON m.usuario_id = u.id
       WHERE m.equipe_id = $1
       ORDER BY m.papel ASC, u.name ASC`,
      [teamId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Error listing team members:', err);
    res.status(500).json({ error: 'Erro ao carregar membros da equipe.' });
  }
});

// POST /api/teams/:id/members — Add member to team (sets status to pending)
router.post('/:id/members', async (req, res) => {
  try {
    const teamId = req.params.id;
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }

    // Verify req.userId is admin of this team
    const checkRole = await pool.query(
      `SELECT papel FROM membros_equipe WHERE equipe_id = $1 AND usuario_id = $2`,
      [teamId, req.userId]
    );

    if (checkRole.rows.length === 0 || checkRole.rows[0].papel !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores da equipe podem gerenciar membros.' });
    }

    // Find user by email
    const userSearch = await pool.query(
      `SELECT id, name, email, avatar FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    if (userSearch.rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum colaborador cadastrado com este e-mail.' });
    }

    const targetUser = userSearch.rows[0];

    // Check if already member
    const checkMember = await pool.query(
      `SELECT id, status FROM membros_equipe WHERE equipe_id = $1 AND usuario_id = $2`,
      [teamId, targetUser.id]
    );

    if (checkMember.rows.length > 0) {
      const statusText = checkMember.rows[0].status === 'pendente' ? 'pendente (aguardando aceitação)' : 'membro ativo';
      return res.status(409).json({ error: `Este colaborador já é um ${statusText} desta equipe.` });
    }

    // Add member as pending
    const insertResult = await pool.query(
      `INSERT INTO membros_equipe (equipe_id, usuario_id, papel, status) VALUES ($1, $2, 'membro', 'pendente') RETURNING id, papel, status, created_at`,
      [teamId, targetUser.id]
    );

    res.status(201).json({
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      avatar: targetUser.avatar,
      papel: insertResult.rows[0].papel,
      status: insertResult.rows[0].status,
      created_at: insertResult.rows[0].created_at
    });
  } catch (err) {
    console.error('Error adding member:', err);
    res.status(500).json({ error: 'Erro ao adicionar membro.' });
  }
});

// PATCH /api/teams/:id/members/:userId — Change user role (admin/membro)
router.patch('/:id/members/:userId', async (req, res) => {
  try {
    const { id: teamId, userId: targetUserId } = req.params;
    const { papel } = req.body;

    if (!papel || (papel !== 'admin' && papel !== 'membro')) {
      return res.status(400).json({ error: 'Papel inválido. Escolha admin ou membro.' });
    }

    // Verify req.userId is admin of this team
    const checkRole = await pool.query(
      `SELECT papel FROM membros_equipe WHERE equipe_id = $1 AND usuario_id = $2`,
      [teamId, req.userId]
    );

    if (checkRole.rows.length === 0 || checkRole.rows[0].papel !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores da equipe podem alterar papéis.' });
    }

    // Can't demote yourself
    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Você não pode alterar seu próprio papel.' });
    }

    const { rowCount } = await pool.query(
      `UPDATE membros_equipe SET papel = $1 WHERE equipe_id = $2 AND usuario_id = $3`,
      [papel, teamId, targetUserId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Membro não encontrado nesta equipe.' });
    }

    res.json({ success: true, message: 'Papel atualizado com sucesso.' });
  } catch (err) {
    console.error('Error changing member role:', err);
    res.status(500).json({ error: 'Erro ao alterar papel do membro.' });
  }
});

// DELETE /api/teams/:id/members/:userId — Remove member from team
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const { id: teamId, userId: targetUserId } = req.params;

    // Verify req.userId is admin OR it is targetUserId leaving the team themselves
    const checkRole = await pool.query(
      `SELECT papel FROM membros_equipe WHERE equipe_id = $1 AND usuario_id = $2`,
      [teamId, req.userId]
    );

    if (checkRole.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado. Você não pertence a esta equipe.' });
    }

    const isSelfLeaving = targetUserId === req.userId;
    const isAdmin = checkRole.rows[0].papel === 'admin';

    if (!isAdmin && !isSelfLeaving) {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores da equipe podem remover membros.' });
    }

    // If admin leaving, verify they are not the only admin
    if (isSelfLeaving && isAdmin) {
      const adminCount = await pool.query(
        `SELECT COUNT(*) FROM membros_equipe WHERE equipe_id = $1 AND papel = 'admin' AND status = 'aceito'`,
        [teamId]
      );
      if (parseInt(adminCount.rows[0].count, 10) <= 1) {
        return res.status(400).json({ error: 'Você é o único administrador desta equipe. Defina outro administrador antes de sair.' });
      }
    }

    const { rowCount } = await pool.query(
      `DELETE FROM membros_equipe WHERE equipe_id = $1 AND usuario_id = $2`,
      [teamId, targetUserId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Membro não encontrado nesta equipe.' });
    }

    res.json({ success: true, message: 'Membro removido com sucesso.' });
  } catch (err) {
    console.error('Error removing member:', err);
    res.status(500).json({ error: 'Erro ao remover membro da equipe.' });
  }
});

// DELETE /api/teams/:id — Delete team
router.delete('/:id', async (req, res) => {
  try {
    const teamId = req.params.id;

    // Verify req.userId is admin of this team
    const checkRole = await pool.query(
      `SELECT papel FROM membros_equipe WHERE equipe_id = $1 AND usuario_id = $2`,
      [teamId, req.userId]
    );

    if (checkRole.rows.length === 0 || checkRole.rows[0].papel !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem excluir a equipe.' });
    }

    await pool.query(`DELETE FROM equipes WHERE id = $1`, [teamId]);

    res.json({ success: true, message: 'Equipe excluída com sucesso.' });
  } catch (err) {
    console.error('Error deleting team:', err);
    res.status(500).json({ error: 'Erro ao excluir equipe.' });
  }
});

module.exports = router;
