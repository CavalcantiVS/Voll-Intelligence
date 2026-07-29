const pool = require('./db/dbConfig');

async function executeAction(task, action_type, action_data) {
  try {
    if (action_type === 'archive_task') {
      await pool.query(
        `UPDATE kanban_tasks SET is_archived = true, archived_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [task.id]
      );
      console.log(`[Automation] Archived task ${task.id}`);
    } else if (action_type === 'set_priority') {
      // Evita atualização infinita checando a prioridade atual se disponível
      if (task.priority === action_data.priority) return; 
      
      await pool.query(
        `UPDATE kanban_tasks SET priority = $1 WHERE id = $2`,
        [action_data.priority, task.id]
      );
      console.log(`[Automation] Set priority to ${action_data.priority} for task ${task.id}`);
    }
    return true; // Indicador de que houve alteração
  } catch (err) {
    console.error(`[Automation] Error executing action for task ${task.id}:`, err);
    return false;
  }
}

async function runTimeBasedAutomations(io) {
  try {
    const automationsRes = await pool.query(`SELECT * FROM kanban_automations WHERE trigger_type = 'time_in_column' AND is_active = true`);
    for (const auto of automationsRes.rows) {
      const { column_id, days } = auto.trigger_conditions;
      if (!column_id || days == null) continue;
      
      const tasksRes = await pool.query(
        `SELECT id, priority FROM kanban_tasks 
         WHERE column_id = $1 
         AND is_archived = false 
         AND column_changed_at < NOW() - INTERVAL '${days} days'`,
        [column_id]
      );
      
      let boardUpdated = false;
      const boardId = auto.board_id;

      for (const task of tasksRes.rows) {
        const changed = await executeAction(task, auto.action_type, auto.action_data);
        if (changed) boardUpdated = true;
      }

      if (boardUpdated && io) {
        io.emit('board_updated', { boardId });
      }
    }
  } catch (err) {
    console.error('[Automation Runner] Error running time-based automations:', err);
  }
}

function startAutomationRunner(io) {
  console.log('[Automation Runner] Started time-based watcher (1 min interval)');
  setInterval(() => runTimeBasedAutomations(io), 60000);
}

module.exports = { startAutomationRunner, executeAction };
