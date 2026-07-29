import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Archive, Clock, CheckSquare, StickyNote } from 'lucide-react';
import styles from '../pages/Kanban.module.css';

export function KanbanCard({ task, onArchive, onClick, boardTags = [], canEdit = true }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'Task', task }, disabled: !canEdit });

  const style = {
    transform: isDragging ? undefined : CSS.Translate.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.18, 0.67, 0.6, 1.22)',
  };

  const priorityLabel = {
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
  };

  const checklistTotal = task.checklist?.length || 0;
  const checklistDone = task.checklist?.filter(i => i.done).length || 0;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${styles.card} ${isDragging ? styles.dragging : ''}`}
      onClick={(e) => {
        if (e.target.closest('button')) return;
        onClick?.(task);
      }}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>{task.title}</div>
        {canEdit && onArchive && (
          <button
            className={styles.deleteBtn}
            onClick={(e) => { e.stopPropagation(); onArchive(task.id); }}
            title="Arquivar tarefa"
          >
            <Archive size={14} />
          </button>
        )}
      </div>

      {task.description && (
        <div className={styles.cardDescription}>{task.description}</div>
      )}

      {/* Meta indicators row */}
      {(task.dueDate || checklistTotal > 0 || task.notes) && (
        <div className={styles.cardMeta}>
          {task.dueDate && (
            <span className={`${styles.cardMetaItem} ${isOverdue ? styles.overdue : ''}`} title={`Prazo: ${new Date(task.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}`}>
              <Clock size={12} />
              {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
          )}
          {checklistTotal > 0 && (
            <span className={`${styles.cardMetaItem} ${checklistDone === checklistTotal ? styles.checklistComplete : ''}`} title={`${checklistDone}/${checklistTotal} itens concluídos`}>
              <CheckSquare size={12} />
              {checklistDone}/{checklistTotal}
            </span>
          )}
          {task.notes && (
            <span className={styles.cardMetaItem} title="Tem observações">
              <StickyNote size={12} />
            </span>
          )}
        </div>
      )}

      {/* Custom Fields row removed */}

      <div className={styles.cardFooter}>
        <div className={styles.cardTags} style={{display: 'flex', flexWrap: 'wrap', gap: '4px'}}>
          {task.priority && (
            <span className={`${styles.tag} ${styles[task.priority]}`}>
              {priorityLabel[task.priority] || task.priority}
            </span>
          )}
          {task.type && (
            <span className={`${styles.tag} ${styles.type}`}>{task.type}</span>
          )}
          {(task.tags || []).map(tagId => {
            const tagInfo = boardTags.find(t => t.id === tagId);
            if (!tagInfo) return null;
            return (
              <span key={tagId} style={{
                background: `${tagInfo.color}20`,
                color: tagInfo.color,
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: '600'
              }}>
                {tagInfo.name}
              </span>
            );
          })}
        </div>

        {task.assignee && (
          <div className={styles.assignee} title={task.assignee}>
            {task.assignee.substring(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
