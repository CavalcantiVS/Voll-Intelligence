const express = require('express');
const router = express.Router();
const pool = require('../db/dbConfig');
const { executeAction } = require('../automationsRunner');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

// Helper functions for granular permissions
async function checkBoardPermission(userId, userGlobalRole, boardId, allowedRoles) {
  if (userGlobalRole === 'Administrador Geral') return true;
  if (!boardId) return false;
  const res = await pool.query(
    `SELECT papel FROM kanban_board_members WHERE board_id = $1 AND usuario_id = $2 AND status = 'aceito'`,
    [boardId, userId]
  );
  if (res.rowCount === 0) return false;
  return allowedRoles.includes(res.rows[0].papel);
}

async function getBoardIdForColumn(colId) {
  const res = await pool.query(`SELECT board_id FROM kanban_columns WHERE id = $1`, [colId]);
  return res.rowCount ? res.rows[0].board_id : null;
}

async function getBoardIdForTask(taskId) {
  const res = await pool.query(`SELECT c.board_id FROM kanban_tasks t JOIN kanban_columns c ON t.column_id = c.id WHERE t.id = $1`, [taskId]);
  return res.rowCount ? res.rows[0].board_id : null;
}

// Excluir quadro
router.delete('/boards/:id', async (req, res) => {
  if (req.userRole !== 'Administrador Geral') {
    return res.status(403).json({ error: 'Apenas o Administrador Geral pode excluir quadros Kanban.' });
  }

  const { id } = req.params;
  try {
    const { rowCount } = await pool.query('DELETE FROM kanban_boards WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Quadro não encontrado.' });
    res.json({ message: 'Quadro excluído com sucesso.' });
  } catch (err) {
    console.error('Error deleting kanban board:', err);
    res.status(500).json({ error: 'Erro ao excluir quadro.' });
  }
});

/* =========================================================
   BOARDS
========================================================= */

// Listar todos os boards com status de membro
router.get('/boards', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.id, b.nome, b.criador_id, b.data_criacao, b.avatar, b.background, b.tags, m.papel, m.status as membership_status
       FROM kanban_boards b
       LEFT JOIN kanban_board_members m ON b.id = m.board_id AND m.usuario_id = $1
       ORDER BY b.nome ASC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing kanban boards:', err);
    res.status(500).json({ error: 'Erro ao carregar quadros.' });
  }
});

// Listar convites pendentes
router.get('/boards/invitations', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id as membership_id, m.papel, m.created_at, b.id as board_id, b.nome as board_name, b.avatar as board_avatar, u.name as creator_name
       FROM kanban_board_members m
       JOIN kanban_boards b ON m.board_id = b.id
       LEFT JOIN users u ON b.criador_id = u.id
       WHERE m.usuario_id = $1 AND m.status = 'pendente'
       ORDER BY m.created_at DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing kanban invitations:', err);
    res.status(500).json({ error: 'Erro ao carregar convites.' });
  }
});

// Aceitar convite
router.post('/boards/invitations/:membershipId/accept', async (req, res) => {
  try {
    const { membershipId } = req.params;
    const { rowCount } = await pool.query(
      `UPDATE kanban_board_members 
       SET status = 'aceito' 
       WHERE id = $1 AND usuario_id = $2`,
      [membershipId, req.userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Convite não encontrado ou não pertence a você.' });
    res.json({ message: 'Convite aceito com sucesso!' });
  } catch (err) {
    console.error('Error accepting invitation:', err);
    res.status(500).json({ error: 'Erro ao aceitar convite.' });
  }
});

// Solicitar acesso a um quadro
router.post('/boards/:id/request-access', async (req, res) => {
  try {
    const { id } = req.params;
    // Verifica se já existe vínculo
    const check = await pool.query(`SELECT status FROM kanban_board_members WHERE board_id = $1 AND usuario_id = $2`, [id, req.userId]);
    if (check.rowCount > 0) {
      if (check.rows[0].status === 'aceito') return res.status(400).json({ error: 'Você já possui acesso a este quadro.' });
      return res.status(400).json({ error: 'Você já possui uma solicitação ou convite pendente para este quadro.' });
    }
    await pool.query(
      `INSERT INTO kanban_board_members (board_id, usuario_id, papel, status) VALUES ($1, $2, 'editor', 'solicitado')`,
      [id, req.userId]
    );

    // Trigger Notification to Admins
    try {
      const boardInfo = await pool.query(`SELECT nome FROM kanban_boards WHERE id = $1`, [id]);
      const userInfo = await pool.query(`SELECT name FROM users WHERE id = $1`, [req.userId]);
      const bName = boardInfo.rows[0]?.nome || 'Quadro';
      const uName = userInfo.rows[0]?.name || 'Usuário';

      const admins = await pool.query(
        `SELECT id FROM users WHERE role = 'Administrador Geral'
         UNION
         SELECT usuario_id as id FROM kanban_board_members WHERE board_id = $1 AND papel = 'admin'`,
        [id]
      );

      for (let admin of admins.rows) {
        if (admin.id !== req.userId) {
          await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)`,
            [admin.id, 'Nova Solicitação de Acesso', `${uName} solicitou acesso ao quadro "${bName}".`, 'kanban_request', '/kanban']
          );
        }
      }
    } catch (notifErr) {
      console.error('Error sending notification:', notifErr);
    }

    res.json({ message: 'Solicitação de acesso enviada!' });
  } catch (err) {
    console.error('Error requesting access:', err);
    res.status(500).json({ error: 'Erro ao solicitar acesso.' });
  }
});

// Listar solicitações de acesso (para admins de quadros)
router.get('/boards/access-requests', async (req, res) => {
  try {
    let query = `SELECT m.id as membership_id, m.created_at, b.id as board_id, b.nome as board_name, u.name as user_name, u.email as user_email
       FROM kanban_board_members m
       JOIN kanban_boards b ON m.board_id = b.id
       JOIN users u ON m.usuario_id = u.id
       WHERE m.status = 'solicitado'`;
    let values = [];

    if (req.userRole !== 'Administrador Geral') {
      query += ` AND EXISTS (
         SELECT 1 FROM kanban_board_members admin_m 
         WHERE admin_m.board_id = b.id AND admin_m.usuario_id = $1 AND admin_m.papel = 'admin' AND admin_m.status = 'aceito'
       )`;
      values.push(req.userId);
    }
    
    query += ` ORDER BY m.created_at DESC`;
    
    const { rows } = await pool.query(query, values);
    res.json(rows);
  } catch (err) {
    console.error('Error listing access requests:', err);
    res.status(500).json({ error: 'Erro ao carregar solicitações.' });
  }
});

// Aprovar solicitação de acesso
router.post('/boards/requests/:membershipId/approve', async (req, res) => {
  try {
    const { membershipId } = req.params;
    // Check if the current user is an admin of the board this membership belongs to
    const check = await pool.query(
      `SELECT m.board_id FROM kanban_board_members m 
       WHERE m.id = $1 AND m.status = 'solicitado'`,
      [membershipId]
    );
    if (check.rowCount === 0) return res.status(404).json({ error: 'Solicitação não encontrada.' });
    const boardId = check.rows[0].board_id;

    if (req.userRole !== 'Administrador Geral') {
      const adminCheck = await pool.query(
        `SELECT 1 FROM kanban_board_members WHERE board_id = $1 AND usuario_id = $2 AND papel = 'admin' AND status = 'aceito'`,
        [boardId, req.userId]
      );
      if (adminCheck.rowCount === 0) return res.status(403).json({ error: 'Acesso negado. Apenas administradores do quadro podem aprovar solicitações.' });
    }

    await pool.query(
      `UPDATE kanban_board_members SET status = 'aceito' WHERE id = $1`,
      [membershipId]
    );

    try {
      const memInfo = await pool.query(
        `SELECT m.usuario_id, b.nome FROM kanban_board_members m JOIN kanban_boards b ON m.board_id = b.id WHERE m.id = $1`,
        [membershipId]
      );
      if (memInfo.rowCount > 0) {
        const uId = memInfo.rows[0].usuario_id;
        const bName = memInfo.rows[0].nome;
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)`,
          [uId, 'Acesso Aprovado', `Seu acesso ao quadro "${bName}" foi aprovado!`, 'kanban_approved', '/kanban']
        );
      }
    } catch (notifErr) {
      console.error('Error sending approval notification:', notifErr);
    }

    res.json({ message: 'Solicitação aprovada com sucesso!' });
  } catch (err) {
    console.error('Error approving request:', err);
    res.status(500).json({ error: 'Erro ao aprovar solicitação.' });
  }
});

// Recusar/Deixar board
router.delete('/boards/:boardId/leave', async (req, res) => {
  try {
    const { boardId } = req.params;
    await pool.query(
      `DELETE FROM kanban_board_members WHERE board_id = $1 AND usuario_id = $2`,
      [boardId, req.userId]
    );
    res.json({ message: 'Você saiu do quadro.' });
  } catch (err) {
    console.error('Error leaving board:', err);
    res.status(500).json({ error: 'Erro ao sair do quadro.' });
  }
});

// Criar novo board
router.post('/boards', async (req, res) => {
  if (req.userRole !== 'Administrador Geral') {
    return res.status(403).json({ error: 'Apenas o Administrador Geral pode criar novos quadros Kanban.' });
  }

  const { nome, avatar, background } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome do quadro é obrigatório.' });

  try {
    await pool.query('BEGIN');
    const insertBoard = await pool.query(
      `INSERT INTO kanban_boards (nome, criador_id, avatar, background) VALUES ($1, $2, $3, $4) RETURNING *`,
      [nome, req.userId, avatar, background || null]
    );
    const newBoard = insertBoard.rows[0];

    await pool.query(
      `INSERT INTO kanban_board_members (board_id, usuario_id, papel, status) VALUES ($1, $2, 'admin', 'aceito')`,
      [newBoard.id, req.userId]
    );
    
    // Criar colunas padrão
    const defaultCols = [
      { title: 'A Fazer', dot_class: 'todo' },
      { title: 'Em Andamento', dot_class: 'inProgress' },
      { title: 'Em Revisão', dot_class: 'review' },
      { title: 'Concluído', dot_class: 'done' }
    ];
    
    for (let i = 0; i < defaultCols.length; i++) {
      await pool.query(
        `INSERT INTO kanban_columns (board_id, title, dot_class, order_index) VALUES ($1, $2, $3, $4)`,
        [newBoard.id, defaultCols[i].title, defaultCols[i].dot_class, i]
      );
    }

    await pool.query('COMMIT');
    res.status(201).json(newBoard);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error creating kanban board:', err);
    res.status(500).json({ error: 'Erro ao criar quadro.' });
  }
});

// Editar configurações do quadro (nome, background, tags, custom_fields)
router.patch('/boards/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, background, tags } = req.body;
  
  try {
    // Verifica permissão
    if (!await checkBoardPermission(req.userId, req.userRole, id, ['admin'])) {
      return res.status(403).json({ error: 'Permissão negada. Apenas Administradores do quadro podem alterar suas configurações.' });
    }
    
    let query = 'UPDATE kanban_boards SET ';
    const values = [];
    let idx = 1;
    if (nome !== undefined) { query += `nome = $${idx}, `; values.push(nome); idx++; }
    if (background !== undefined) { query += `background = $${idx}, `; values.push(background); idx++; }
    if (tags !== undefined) { query += `tags = $${idx}, `; values.push(JSON.stringify(tags)); idx++; }
    
    if (values.length === 0) return res.json({ message: 'Sem alterações' });
    
    query = query.slice(0, -2) + ` WHERE id = $${idx} RETURNING *`;
    values.push(id);
    
    const { rows } = await pool.query(query, values);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating kanban board:', err);
    res.status(500).json({ error: 'Erro ao atualizar quadro.' });
  }
});

// Listar membros do board
router.get('/boards/:boardId/members', async (req, res) => {
  try {
    const { boardId } = req.params;
    const { rows } = await pool.query(
      `SELECT m.id as membership_id, m.papel, m.status, u.id, u.name, u.email, u.avatar
       FROM kanban_board_members m
       JOIN users u ON m.usuario_id = u.id
       WHERE m.board_id = $1
       ORDER BY m.created_at ASC`,
      [boardId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing members:', err);
    res.status(500).json({ error: 'Erro ao carregar membros.' });
  }
});

// Convidar membro
router.post('/boards/:boardId/members', async (req, res) => {
  const { boardId } = req.params;
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório' });

  try {
    const userRes = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
    const targetUserId = userRes.rows[0].id;

    if (targetUserId === req.userId) return res.status(400).json({ error: 'Não pode adicionar a si mesmo.' });

    const checkRes = await pool.query(
      `SELECT status FROM kanban_board_members WHERE board_id = $1 AND usuario_id = $2`,
      [boardId, targetUserId]
    );
    if (checkRes.rows.length > 0) return res.status(400).json({ error: 'Membro já está no quadro ou tem convite.' });

    await pool.query(
      `INSERT INTO kanban_board_members (board_id, usuario_id, papel, status) VALUES ($1, $2, 'editor', 'pendente')`,
      [boardId, targetUserId]
    );
    res.json({ message: 'Convite enviado.' });
  } catch (err) {
    console.error('Error adding member:', err);
    res.status(500).json({ error: 'Erro ao adicionar membro.' });
  }
});

// Remover membro
// Deletar membro
router.delete('/boards/:boardId/members/:userId', async (req, res) => {
  try {
    const { boardId, userId } = req.params;
    if (!await checkBoardPermission(req.userId, req.userRole, boardId, ['admin'])) {
      return res.status(403).json({ error: 'Apenas Administradores podem remover membros.' });
    }
    await pool.query(`DELETE FROM kanban_board_members WHERE board_id = $1 AND usuario_id = $2`, [boardId, userId]);
    res.json({ message: 'Membro removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover membro.' });
  }
});

// Alterar papel de um membro
router.put('/boards/:boardId/members/:userId', async (req, res) => {
  try {
    const { boardId, userId } = req.params;
    const { papel } = req.body;
    if (!await checkBoardPermission(req.userId, req.userRole, boardId, ['admin'])) {
      return res.status(403).json({ error: 'Apenas Administradores podem alterar papéis.' });
    }
    if (!['admin', 'editor', 'leitor'].includes(papel)) {
      return res.status(400).json({ error: 'Papel inválido.' });
    }
    await pool.query(
      `UPDATE kanban_board_members SET papel = $1 WHERE board_id = $2 AND usuario_id = $3`,
      [papel, boardId, userId]
    );
    res.json({ message: 'Papel atualizado.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar papel do membro.' });
  }
});

/* =========================================================
   COLUMNS
========================================================= */

// Listar colunas e tarefas do board
router.get('/boards/:boardId/data', async (req, res) => {
  try {
    const { boardId } = req.params;
    
    // Check permission
    const check = await pool.query(`SELECT 1 FROM kanban_board_members WHERE board_id = $1 AND usuario_id = $2 AND status = 'aceito'`, [boardId, req.userId]);
    if (check.rowCount === 0) return res.status(403).json({ error: 'Acesso negado.' });

    const colsRes = await pool.query(`SELECT * FROM kanban_columns WHERE board_id = $1 ORDER BY order_index ASC`, [boardId]);
    const tasksRes = await pool.query(
      `SELECT t.* FROM kanban_tasks t 
       JOIN kanban_columns c ON t.column_id = c.id 
       WHERE c.board_id = $1 AND t.is_archived = FALSE
       ORDER BY t.order_index ASC`,
      [boardId]
    );

    res.json({ columns: colsRes.rows, tasks: tasksRes.rows });
  } catch (err) {
    console.error('Error loading kanban data:', err);
    res.status(500).json({ error: 'Erro ao carregar dados do quadro.' });
  }
});

// Listar tarefas arquivadas do board
router.get('/boards/:boardId/archive', async (req, res) => {
  try {
    const { boardId } = req.params;
    
    // Check permission
    const check = await pool.query(`SELECT 1 FROM kanban_board_members WHERE board_id = $1 AND usuario_id = $2 AND status = 'aceito'`, [boardId, req.userId]);
    if (check.rowCount === 0) return res.status(403).json({ error: 'Acesso negado.' });

    const tasksRes = await pool.query(
      `SELECT t.*, c.title as column_name FROM kanban_tasks t 
       JOIN kanban_columns c ON t.column_id = c.id 
       WHERE c.board_id = $1 AND t.is_archived = TRUE
       ORDER BY t.archived_at DESC`,
      [boardId]
    );

    res.json(tasksRes.rows);
  } catch (err) {
    console.error('Error loading archived tasks:', err);
    res.status(500).json({ error: 'Erro ao carregar tarefas arquivadas.' });
  }
});

// Criar coluna
router.post('/columns', async (req, res) => {
  const { board_id, title, dot_class, order_index, wip_limit } = req.body;
  if (!await checkBoardPermission(req.userId, req.userRole, board_id, ['admin', 'editor'])) {
    return res.status(403).json({ error: 'Permissão negada. Apenas Editores ou Admins podem alterar este quadro.' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO kanban_columns (board_id, title, dot_class, order_index, wip_limit) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [board_id, title, dot_class || 'todo', order_index || 0, wip_limit || null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar coluna.' });
  }
});

// Atualizar coluna (nome, ordem ou wip_limit)
router.put('/columns/:id', async (req, res) => {
  const { id } = req.params;
  const boardId = await getBoardIdForColumn(id);
  if (!boardId || !await checkBoardPermission(req.userId, req.userRole, boardId, ['admin', 'editor'])) {
    return res.status(403).json({ error: 'Permissão negada.' });
  }

  const { title, order_index, wip_limit } = req.body;
  try {
    let query = 'UPDATE kanban_columns SET ';
    let values = [];
    let idx = 1;
    if (title !== undefined) { query += `title = $${idx}, `; values.push(title); idx++; }
    if (order_index !== undefined) { query += `order_index = $${idx}, `; values.push(order_index); idx++; }
    if (wip_limit !== undefined) { query += `wip_limit = $${idx}, `; values.push(wip_limit); idx++; }
    query = query.slice(0, -2) + ` WHERE id = $${idx} RETURNING *`;
    values.push(id);
    
    const { rows } = await pool.query(query, values);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar coluna.' });
  }
});

// Deletar coluna
router.delete('/columns/:id', async (req, res) => {
  const { id } = req.params;
  const boardId = await getBoardIdForColumn(id);
  if (!boardId || !await checkBoardPermission(req.userId, req.userRole, boardId, ['admin', 'editor'])) {
    return res.status(403).json({ error: 'Permissão negada.' });
  }
  
  const { fallback_column_id } = req.body; // para mover tasks
  try {
    if (fallback_column_id) {
      await pool.query(`UPDATE kanban_tasks SET column_id = $1 WHERE column_id = $2`, [fallback_column_id, id]);
    }
    await pool.query(`DELETE FROM kanban_columns WHERE id = $1`, [id]);
    res.json({ message: 'Coluna deletada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar coluna.' });
  }
});

// Reordenar colunas em lote
router.post('/columns/reorder', async (req, res) => {
  const { columns } = req.body; // Array de { id, order_index }
  if (!columns || columns.length === 0) return res.json({ message: 'Sem colunas' });
  
  const boardId = await getBoardIdForColumn(columns[0].id);
  if (!boardId || !await checkBoardPermission(req.userId, req.userRole, boardId, ['admin', 'editor'])) {
    return res.status(403).json({ error: 'Permissão negada.' });
  }

  try {
    await pool.query('BEGIN');
    for (const col of columns) {
      await pool.query(`UPDATE kanban_columns SET order_index = $1 WHERE id = $2`, [col.order_index, col.id]);
    }
    await pool.query('COMMIT');
    res.json({ message: 'Colunas reordenadas' });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: 'Erro ao reordenar colunas.' });
  }
});

/* =========================================================
   TASKS
========================================================= */

// Criar tarefa
router.post('/tasks', async (req, res) => {
  const { column_id, title, description, priority, type, assignee, due_date, notes, checklist, tags, order_index } = req.body;
  const boardId = await getBoardIdForColumn(column_id);
  if (!boardId || !await checkBoardPermission(req.userId, req.userRole, boardId, ['admin', 'editor'])) {
    return res.status(403).json({ error: 'Permissão negada.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO kanban_tasks (column_id, title, description, priority, type, assignee, due_date, notes, checklist, tags, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [column_id, title, description, priority || 'medium', type, assignee, due_date || null, notes, checklist ? JSON.stringify(checklist) : '[]', tags ? JSON.stringify(tags) : '[]', order_index || 0]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar tarefa.' });
  }
});

// Atualizar tarefa
router.put('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const boardId = await getBoardIdForTask(id);
  if (!boardId || !await checkBoardPermission(req.userId, req.userRole, boardId, ['admin', 'editor'])) {
    return res.status(403).json({ error: 'Permissão negada.' });
  }

  const { column_id, title, description, priority, type, assignee, due_date, notes, checklist, tags, order_index } = req.body;
  
  try {
    const oldTaskRes = await pool.query(`SELECT column_id FROM kanban_tasks WHERE id = $1`, [id]);
    const oldColumnId = oldTaskRes.rows[0]?.column_id;

    const { rows } = await pool.query(
      `UPDATE kanban_tasks 
       SET column_id = COALESCE($1, column_id),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           priority = COALESCE($4, priority),
           type = COALESCE($5, type),
           assignee = COALESCE($6, assignee),
           due_date = $7,
           notes = COALESCE($8, notes),
           checklist = COALESCE($9, checklist),
           tags = COALESCE($10, tags),
           order_index = COALESCE($11, order_index),
           column_changed_at = CASE WHEN COALESCE($1, column_id) != $12 THEN CURRENT_TIMESTAMP ELSE column_changed_at END
       WHERE id = $13 RETURNING *`,
      [column_id, title, description, priority, type, assignee, due_date, notes, checklist ? JSON.stringify(checklist) : undefined, tags ? JSON.stringify(tags) : undefined, order_index, oldColumnId, id]
    );

    // Trigger automations if column changed
    if (column_id && oldColumnId !== column_id) {
      const automations = await pool.query(`SELECT * FROM kanban_automations WHERE board_id = $1 AND trigger_type = 'task_moved_to_column' AND is_active = true`, [boardId]);
      for (const auto of automations.rows) {
        if (auto.trigger_conditions?.column_id === column_id) {
          await executeAction(rows[0], auto.action_type, auto.action_data);
        }
      }
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar tarefa.' });
  }
});

// Deletar tarefa
router.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const boardId = await getBoardIdForTask(id);
  if (!boardId || !await checkBoardPermission(req.userId, req.userRole, boardId, ['admin', 'editor'])) {
    return res.status(403).json({ error: 'Permissão negada.' });
  }

  try {
    await pool.query(`DELETE FROM kanban_tasks WHERE id = $1`, [id]);
    res.json({ message: 'Tarefa deletada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar tarefa.' });
  }
});

// Arquivar/Desarquivar tarefa
router.put('/tasks/:id/archive', async (req, res) => {
  const { id } = req.params;
  const { is_archived } = req.body;
  const boardId = await getBoardIdForTask(id);
  if (!boardId || !await checkBoardPermission(req.userId, req.userRole, boardId, ['admin', 'editor'])) {
    return res.status(403).json({ error: 'Permissão negada.' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE kanban_tasks SET is_archived = $1, archived_at = ${is_archived ? 'CURRENT_TIMESTAMP' : 'NULL'} WHERE id = $2 RETURNING *`,
      [is_archived, id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao alterar status de arquivamento.' });
  }
});

// Reordenar tarefas em lote (drag drop)
router.post('/tasks/reorder', async (req, res) => {
  const { tasks } = req.body; // Array de { id, column_id, order_index }
  if (!tasks || tasks.length === 0) return res.json({ message: 'Sem tarefas' });

  const boardId = await getBoardIdForTask(tasks[0].id);
  if (!boardId || !await checkBoardPermission(req.userId, req.userRole, boardId, ['admin', 'editor'])) {
    return res.status(403).json({ error: 'Permissão negada.' });
  }

  try {
    for (const task of tasks) {
      const oldTaskRes = await pool.query(`SELECT column_id FROM kanban_tasks WHERE id = $1`, [task.id]);
      const oldColumnId = oldTaskRes.rows[0]?.column_id;

      const { rows } = await pool.query(
        `UPDATE kanban_tasks SET column_id = $1, order_index = $2, column_changed_at = CASE WHEN $1 != $3 THEN CURRENT_TIMESTAMP ELSE column_changed_at END WHERE id = $4 RETURNING *`,
        [task.column_id, task.order_index, oldColumnId, task.id]
      );

      // Trigger automations
      if (oldColumnId !== task.column_id) {
        const automations = await pool.query(`SELECT * FROM kanban_automations WHERE board_id = $1 AND trigger_type = 'task_moved_to_column' AND is_active = true`, [boardId]);
        for (const auto of automations.rows) {
          if (auto.trigger_conditions?.column_id === task.column_id) {
            await executeAction(rows[0], auto.action_type, auto.action_data);
          }
        }
      }
    }
    res.json({ message: 'Tarefas reordenadas' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao reordenar tarefas.' });
  }
});

/* =========================================================
   AUTOMATIONS
========================================================= */

// Listar automações
router.get('/boards/:boardId/automations', async (req, res) => {
  const { boardId } = req.params;
  if (!await checkBoardPermission(req.userId, req.userRole, boardId, ['admin', 'editor'])) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  try {
    const { rows } = await pool.query(`SELECT * FROM kanban_automations WHERE board_id = $1 ORDER BY created_at ASC`, [boardId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar automações.' });
  }
});

// Criar automação
router.post('/boards/:boardId/automations', async (req, res) => {
  const { boardId } = req.params;
  const { name, trigger_type, trigger_conditions, action_type, action_data } = req.body;
  if (!await checkBoardPermission(req.userId, req.userRole, boardId, ['admin'])) {
    return res.status(403).json({ error: 'Apenas Administradores podem criar automações.' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO kanban_automations (board_id, name, trigger_type, trigger_conditions, action_type, action_data)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [boardId, name, trigger_type, trigger_conditions, action_type, action_data]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar automação.' });
  }
});

// Deletar automação
router.delete('/automations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const autoRes = await pool.query(`SELECT board_id FROM kanban_automations WHERE id = $1`, [id]);
    if (autoRes.rowCount === 0) return res.status(404).json({ error: 'Automação não encontrada.' });
    if (!await checkBoardPermission(req.userId, req.userRole, autoRes.rows[0].board_id, ['admin'])) {
      return res.status(403).json({ error: 'Permissão negada.' });
    }
    await pool.query(`DELETE FROM kanban_automations WHERE id = $1`, [id]);
    res.json({ message: 'Automação deletada.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar automação.' });
  }
});

module.exports = router;
