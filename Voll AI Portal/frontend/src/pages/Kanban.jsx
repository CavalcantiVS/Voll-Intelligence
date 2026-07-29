import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { KanbanSquare, Plus, Inbox, Pencil, Trash2, ChevronLeft, ChevronRight, X, Check, Users, Shield, User, Loader2, Upload, Lock, AlertTriangle, Settings, Archive, ArchiveRestore, History, Zap } from 'lucide-react';
import { KanbanCard } from '../components/KanbanCard';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { io } from 'socket.io-client';
import styles from './Kanban.module.css';

const BACKEND = 'http://localhost:3001';
const dotColors = ['todo', 'inProgress', 'review', 'done', 'purple', 'pink', 'teal', 'orange'];

const bgPresets = [
  { id: 'grad1', value: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', label: 'Azul Escuro' },
  { id: 'grad2', value: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)', label: 'Roxo Crepúsculo' },
  { id: 'grad3', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', label: 'Verde Esmeralda' },
  { id: 'grad4', value: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)', label: 'Rosa Suave' },
  { id: 'grad5', value: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)', label: 'Noite' },
  { id: 'grad6', value: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)', label: 'Fogo' }
];

/* ------------------------------------------------------------------ */
/*  Column component                                                   */
/* ------------------------------------------------------------------ */
function Column({ id, title, dotClass, tasks, onArchive, onCardClick, onRename, onDeleteColumn, onMoveLeft, onMoveRight, isFirst, isLast, totalColumns, onAddTaskClick, boardTags, wipLimit, canEdit }) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !canEdit });
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editWipLimit, setEditWipLimit] = useState(wipLimit || '');

  const handleStartEdit = () => {
    if (!canEdit) return;
    setEditTitle(title);
    setEditing(true);
  };

  const handleConfirmEdit = () => {
    const trimmed = editTitle.trim();
    const wip = parseInt(editWipLimit, 10);
    const validWip = isNaN(wip) || wip <= 0 ? null : wip;

    if (trimmed && (trimmed !== title || validWip !== wipLimit)) {
      onRename(id, trimmed, validWip);
    }
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(title);
    setEditWipLimit(wipLimit || '');
    setEditing(false);
  };

  const isOverLimit = wipLimit > 0 && tasks.length > wipLimit;

  return (
    <div className={`${styles.kanbanColumn} ${isOver ? styles.columnOver : ''}`}>
      <div className={styles.columnHeader}>
        <div className={styles.columnTitleGroup}>
          <div className={`${styles.columnDot} ${styles[dotClass]}`} />
          {editing ? (
            <div className={styles.columnEditGroup}>
              <input
                className={styles.columnEditInput}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                autoFocus
                placeholder="Nome..."
              />
              <input
                className={styles.columnEditInput}
                type="number"
                min="0"
                style={{ width: '60px' }}
                value={editWipLimit}
                onChange={(e) => setEditWipLimit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                placeholder="WIP"
                title="Work in Progress (Limite de tarefas)"
              />
              <button className={styles.columnEditConfirm} onClick={handleConfirmEdit}><Check size={14} /></button>
              <button className={styles.columnEditCancel} onClick={handleCancelEdit}><X size={14} /></button>
            </div>
          ) : (
            <>
              <span className={styles.columnTitle} onClick={handleStartEdit} title={canEdit ? "Clique para editar configurações" : ""} style={{cursor: canEdit ? 'pointer' : 'default'}}>{title}</span>
              <div className={styles.taskCountWrapper} onClick={handleStartEdit} title={canEdit ? "Editar Limite WIP" : ""} style={{cursor: canEdit ? 'pointer' : 'default'}}>
                <span className={`${styles.taskCount} ${isOverLimit ? styles.taskCountOverLimit : ''}`}>
                  {wipLimit > 0 ? `${tasks.length}/${wipLimit}` : tasks.length}
                </span>
                {canEdit && <Settings size={14} className={styles.columnSettingsIcon} />}
              </div>
            </>
          )}
        </div>

        {canEdit && !editing && (
          <div className={styles.columnActions}>
            {!isFirst && (
              <button className={styles.colActionBtn} onClick={() => onMoveLeft(id)} title="Mover para esquerda">
                <ChevronLeft size={14} />
              </button>
            )}
            {!isLast && (
              <button className={styles.colActionBtn} onClick={() => onMoveRight(id)} title="Mover para direita">
                <ChevronRight size={14} />
              </button>
            )}
            {totalColumns > 1 && (
              <button className={`${styles.colActionBtn} ${styles.colActionDanger}`} onClick={() => onDeleteColumn(id)} title="Excluir coluna">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {isOverLimit && (
        <div className={styles.wipWarningBanner}>
          <AlertTriangle size={14} />
          Limite de tarefas excedido!
        </div>
      )}

      <SortableContext id={id} items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={styles.columnBody}>
          {tasks.length === 0 && (
            <div className={styles.emptyColumn}>
              <Inbox size={28} />
              <span>Nenhuma tarefa</span>
            </div>
          )}
          {tasks.map(task => (
            <KanbanCard key={task.id} task={task} onArchive={onArchive} onClick={onCardClick} boardTags={boardTags} canEdit={canEdit} />
          ))}
        </div>
      </SortableContext>
      {canEdit && (
        <button className={styles.columnAddTaskBtn} onClick={() => onAddTaskClick(id)}>
          <Plus size={14} /> Adicionar Tarefa
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Kanban Page                                                        */
/* ------------------------------------------------------------------ */
export default function Kanban() {
  const { user, token } = useAuth();
  const toast = useToast();
  
  // States para Sidebar e Boards
  const [boards, setBoards] = useState([]);
  const [discoverBoards, setDiscoverBoards] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  
  // Permissions
  const userRoleInBoard = user?.role === 'Administrador Geral' ? 'admin' : (activeBoard?.papel || 'leitor');
  const canEdit = ['admin', 'editor'].includes(userRoleInBoard);
  const canAdmin = userRoleInBoard === 'admin';

  // States para Kanban Data
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  
  // Modais de Criação
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardBg, setNewBoardBg] = useState(bgPresets[0].value);
  const [isCustomBg, setIsCustomBg] = useState(false);
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editBoardName, setEditBoardName] = useState('');
  const [editBoardBg, setEditBoardBg] = useState('');
  const [editBoardTags, setEditBoardTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const [showRequestAccessModal, setShowRequestAccessModal] = useState(false);
  const [boardToRequest, setBoardToRequest] = useState(null);

  // Manage Members
  const [showManageModal, setShowManageModal] = useState(false);
  const [boardMembers, setBoardMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');

  // Arquivo
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archivedTasks, setArchivedTasks] = useState([]);

  // Automações
  const [showAutomationsModal, setShowAutomationsModal] = useState(false);
  const [automations, setAutomations] = useState([]);
  const [newAutomation, setNewAutomation] = useState({
    name: '',
    trigger_type: 'task_moved_to_column',
    trigger_conditions: { column_id: '', days: 7 },
    action_type: 'archive_task',
    action_data: { priority: 'high' }
  });

  // Drag and Task Edit
  const [activeTask, setActiveTask] = useState(null);
  const [showModal, setShowModal] = useState(false); // Nova tarefa
  const [editingTask, setEditingTask] = useState(null); // Editando tarefa
  
  const [newTask, setNewTask] = useState({
    title: '', description: '', priority: 'medium', type: '', assignee: '', columnId: '', dueDate: '', notes: '', checklist: [], tags: []
  });
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [editChecklistItem, setEditChecklistItem] = useState('');

  // Socket
  const [socket, setSocket] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Inicializa Socket
  useEffect(() => {
    const newSocket = io(BACKEND, { transports: ['websocket', 'polling'] });
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (token) {
      loadBoards();
      loadInvitations();
      loadAccessRequests();
    }
  }, [token]);

  // Juntar à sala do socket ao selecionar um board
  useEffect(() => {
    if (!socket || !activeBoard) return;

    socket.emit('join_kanban', activeBoard.id);
    loadKanbanData(activeBoard.id);

    const handleKanbanUpdated = ({ type, data }) => {
      // Quando recebemos um broadcast, apenas recarregamos os dados do board para garantir consistência
      // Podemos otimizar isso no futuro para ser cirúrgico
      setIsSyncing(true);
      loadKanbanData(activeBoard.id).finally(() => setIsSyncing(false));
    };

    socket.on('kanban_updated', handleKanbanUpdated);

    return () => {
      socket.emit('leave_kanban', activeBoard.id);
      socket.off('kanban_updated', handleKanbanUpdated);
    };
  }, [socket, activeBoard]);

  const loadBoards = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/kanban/boards`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      
      const myBoards = data.filter(b => b.membership_status === 'aceito');
      const otherBoards = data.filter(b => b.membership_status !== 'aceito');
      
      setBoards(myBoards);
      setDiscoverBoards(otherBoards);
      
      if (myBoards.length === 0 && activeBoard) {
        setActiveBoard(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAccessRequests = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/kanban/boards/access-requests`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAccessRequests(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadInvitations = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/kanban/boards/invitations`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setInvitations(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadKanbanData = async (boardId) => {
    try {
      const res = await fetch(`${BACKEND}/api/kanban/boards/${boardId}/data`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setColumns(data.columns.map(c => ({ ...c, id: c.id })));
      setTasks(data.tasks.map(t => ({ ...t, id: t.id, columnId: t.column_id })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestAccess = async (board) => {
    try {
      const res = await fetch(`${BACKEND}/api/kanban/boards/${board.id}/request-access`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      loadBoards();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleApproveRequest = async (membershipId) => {
    try {
      const res = await fetch(`${BACKEND}/api/kanban/boards/requests/${membershipId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      loadAccessRequests();
      loadBoards();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const emitUpdate = (type, data = null) => {
    if (socket && activeBoard) {
      socket.emit('kanban_update', { boardId: activeBoard.id, type, data });
    }
  };

  /* --- MÉTODOS DE BOARD E MEMBROS --- */
  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;
    try {
      const payload = { 
        nome: newBoardName.trim(), 
        avatar: 'preset:Briefcase',
        background: newBoardBg
      };
      const res = await fetch(`${BACKEND}/api/kanban/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setBoards(prev => [...prev, data]);
      setActiveBoard(data);
      setShowCreateBoardModal(false);
      setNewBoardName('');
      setNewBoardBg(bgPresets[0].value);
      setIsCustomBg(false);
      toast.success('Quadro Kanban criado!');
    } catch (err) {
      toast.error('Erro ao criar quadro');
    }
  };

  const openSettingsModal = () => {
    if (!activeBoard) return;
    setEditBoardName(activeBoard.nome);
    setEditBoardBg(activeBoard.background || '');
    setEditBoardTags(Array.isArray(activeBoard.tags) ? activeBoard.tags : []);
    setShowSettingsModal(true);
  };

  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    const newTag = { id: crypto.randomUUID(), name: newTagName.trim(), color: newTagColor };
    setEditBoardTags(prev => [...prev, newTag]);
    setNewTagName('');
  };

  const handleRemoveTag = (tagId) => {
    setEditBoardTags(prev => prev.filter(t => t.id !== tagId));
  };

  const handleUpdateBoardSettings = async () => {
    if (!editBoardName.trim() || !activeBoard) return;
    try {
      const res = await fetch(`${BACKEND}/api/kanban/boards/${activeBoard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nome: editBoardName.trim(), background: editBoardBg, tags: editBoardTags })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setBoards(prev => prev.map(b => b.id === activeBoard.id ? { ...b, nome: data.nome, background: data.background, tags: data.tags } : b));
      setActiveBoard(prev => ({ ...prev, nome: data.nome, background: data.background, tags: data.tags }));
      setShowSettingsModal(false);
      toast.success('Configurações atualizadas!');
    } catch (err) {
      toast.error(err.message || 'Erro ao atualizar quadro');
    }
  };

  const handleDeleteBoard = async (boardId) => {
    if (!window.confirm('Tem certeza que deseja excluir este quadro? Todas as colunas e tarefas serão perdidas permanentemente!')) return;
    try {
      const res = await fetch(`${BACKEND}/api/kanban/boards/${boardId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success(data.message);
      if (activeBoard?.id === boardId) {
        setActiveBoard(null);
      }
      loadBoards();
    } catch (err) {
      toast.error(err.message || 'Erro ao excluir quadro');
    }
  };

  const handleFileUpload = (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAcceptInvite = async (inv) => {
    try {
      await fetch(`${BACKEND}/api/kanban/boards/invitations/${inv.membership_id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Convite aceito!');
      loadBoards();
      loadInvitations();
    } catch (err) {
      toast.error('Erro ao aceitar convite');
    }
  };

  const loadMembers = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/kanban/boards/${activeBoard.id}/members`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setBoardMembers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;
    try {
      const res = await fetch(`${BACKEND}/api/kanban/boards/${activeBoard.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Convite enviado com sucesso!');
      setInviteEmail('');
      loadMembers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await fetch(`${BACKEND}/api/kanban/boards/${activeBoard.id}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setBoardMembers(prev => prev.filter(m => m.id !== userId));
      toast.success('Membro removido');
    } catch (err) {
      toast.error('Erro ao remover membro');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`${BACKEND}/api/kanban/boards/${activeBoard.id}/members/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ papel: newRole })
      });
      if (res.ok) {
        setBoardMembers(prev => prev.map(m => m.id === userId ? { ...m, papel: newRole } : m));
        toast.success('Papel atualizado');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao alterar papel');
      }
    } catch (err) {
      toast.error('Erro de conexão ao alterar papel');
    }
  };

  const openManageModal = () => {
    loadMembers();
    setShowManageModal(true);
  };

  /* --- COLUMNS CRUD --- */
  const handleAddColumn = async () => {
    const trimmed = newColumnTitle.trim();
    if (!trimmed || !activeBoard) return;
    try {
      const res = await fetch(`${BACKEND}/api/kanban/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ board_id: activeBoard.id, title: trimmed, dot_class: dotColors[columns.length % dotColors.length], order_index: columns.length })
      });
      const col = await res.json();
      setColumns(prev => [...prev, col]);
      setNewColumnTitle('');
      setShowColumnModal(false);
      emitUpdate('column_added');
    } catch (err) {
      toast.error('Erro ao adicionar coluna');
    }
  };

  const handleRenameColumn = async (colId, newTitle, wipLimit) => {
    try {
      await fetch(`${BACKEND}/api/kanban/columns/${colId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newTitle, wip_limit: wipLimit })
      });
      setColumns(prev => prev.map(c => c.id === colId ? { ...c, title: newTitle, wip_limit: wipLimit } : c));
      emitUpdate('column_renamed');
    } catch (err) {
      toast.error('Erro ao renomear coluna');
    }
  };

  const handleDeleteColumn = async (colId) => {
    const remaining = columns.filter(c => c.id !== colId);
    if (remaining.length === 0) {
      toast.error('Não é possível excluir a última coluna');
      return;
    }
    const fallbackId = remaining[0].id;
    try {
      await fetch(`${BACKEND}/api/kanban/columns/${colId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fallback_column_id: fallbackId })
      });
      setTasks(prev => prev.map(t => t.columnId === colId ? { ...t, columnId: fallbackId } : t));
      setColumns(remaining);
      emitUpdate('column_deleted');
    } catch (err) {
      toast.error('Erro ao deletar coluna');
    }
  };

  const reorderColumnsInDb = async (newCols) => {
    try {
      const payload = newCols.map((c, i) => ({ id: c.id, order_index: i }));
      await fetch(`${BACKEND}/api/kanban/columns/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ columns: payload })
      });
      emitUpdate('columns_reordered');
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveColumnLeft = useCallback((colId) => {
    setColumns(prev => {
      const idx = prev.findIndex(c => c.id === colId);
      if (idx <= 0) return prev;
      const newCols = arrayMove(prev, idx, idx - 1);
      reorderColumnsInDb(newCols);
      return newCols;
    });
  }, [columns]);

  const handleMoveColumnRight = useCallback((colId) => {
    setColumns(prev => {
      const idx = prev.findIndex(c => c.id === colId);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const newCols = arrayMove(prev, idx, idx + 1);
      reorderColumnsInDb(newCols);
      return newCols;
    });
  }, [columns]);

  /* --- DRAG & DROP AND TASKS --- */
  const columnsWithTasks = useMemo(() => {
    return columns.map(col => ({
      ...col,
      tasks: tasks.filter(t => t.columnId === col.id).sort((a, b) => a.order_index - b.order_index),
    }));
  }, [columns, tasks]);

  const onDragStart = useCallback((event) => {
    if (!canEdit) return;
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  }, [tasks, canEdit]);

  const onDragOver = useCallback((event) => {
    if (!canEdit) return;
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = columns.some(c => c.id === overId);

    if (!isActiveTask) return;

    setTasks(prev => {
      const activeIndex = prev.findIndex(t => t.id === activeId);
      if (activeIndex === -1) return prev;

      if (isOverTask) {
        const overIndex = prev.findIndex(t => t.id === overId);
        const activeCol = prev[activeIndex].columnId;
        const overCol = prev[overIndex].columnId;

        if (activeCol !== overCol) {
          const updated = [...prev];
          updated[activeIndex] = { ...updated[activeIndex], columnId: overCol };
          return arrayMove(updated, activeIndex, overIndex);
        }
        return arrayMove(prev, activeIndex, overIndex);
      }

      if (isOverColumn && prev[activeIndex].columnId !== overId) {
        const updated = [...prev];
        updated[activeIndex] = { ...updated[activeIndex], columnId: overId };
        return updated;
      }
      return prev;
    });
  }, [columns, canEdit]);

  const onDragEnd = useCallback(async (event) => {
    if (!canEdit) return;
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    
    // As in onDragOver, the state was optimistically updated. 
    // Now we must persist the new positions of all tasks in the affected columns.
    const activeId = active.id;
    const overId = over.id;
    
    let affectedCols = new Set();
    const activeTaskFinal = tasks.find(t => t.id === activeId);
    if (activeTaskFinal) affectedCols.add(activeTaskFinal.columnId);
    
    const isOverColumn = columns.some(c => c.id === overId);
    if (isOverColumn) affectedCols.add(overId);
    
    const isOverTask = over.data.current?.type === 'Task';
    if (isOverTask) {
      const overTaskFinal = tasks.find(t => t.id === overId);
      if (overTaskFinal) affectedCols.add(overTaskFinal.columnId);
    }
    
    // We update order_index for all tasks in affected columns based on their index in state
    const payload = [];
    tasks.forEach(t => {
      if (affectedCols.has(t.columnId)) {
        // Find its new index in the derived column tasks array
        const colTasks = tasks.filter(x => x.columnId === t.columnId);
        const newOrder = colTasks.findIndex(x => x.id === t.id);
        payload.push({ id: t.id, column_id: t.columnId, order_index: newOrder });
      }
    });

    try {
      await fetch(`${BACKEND}/api/kanban/tasks/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tasks: payload })
      });
      emitUpdate('tasks_reordered');
    } catch (err) {
      console.error(err);
    }
  }, [tasks, columns, canEdit]);

  const handleAddTask = async () => {
    if (!newTask.title.trim() || !activeBoard) return;
    try {
      const colId = newTask.columnId || columns[0]?.id;
      if (!colId) return;

      const payload = {
        column_id: colId,
        title: newTask.title.trim(),
        description: newTask.description,
        priority: newTask.priority,
        type: newTask.type,
        assignee: newTask.assignee,
        due_date: newTask.dueDate || null,
        notes: newTask.notes,
        checklist: newTask.checklist,
        tags: newTask.tags
      };

      const res = await fetch(`${BACKEND}/api/kanban/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setTasks(prev => [...prev, { ...data, columnId: data.column_id }]);
      setNewTask({ title: '', description: '', priority: 'medium', type: '', assignee: '', columnId: '', dueDate: '', notes: '', checklist: [], tags: [] });
      setNewChecklistItem('');
      setShowModal(false);
      emitUpdate('task_added');
    } catch (err) {
      toast.error('Erro ao adicionar tarefa');
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !editingTask.title.trim()) return;
    try {
      const payload = {
        column_id: editingTask.columnId,
        title: editingTask.title.trim(),
        description: editingTask.description,
        priority: editingTask.priority,
        type: editingTask.type,
        assignee: editingTask.assignee,
        due_date: editingTask.dueDate || null,
        notes: editingTask.notes,
        checklist: editingTask.checklist,
        tags: editingTask.tags
      };

      await fetch(`${BACKEND}/api/kanban/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      
      setTasks(prev => prev.map(t => t.id === editingTask.id ? editingTask : t));
      setEditingTask(null);
      emitUpdate('task_updated');
    } catch (err) {
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await fetch(`${BACKEND}/api/kanban/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(prev => prev.filter(t => t.id !== taskId));
      emitUpdate('task_deleted');
    } catch (err) {
      toast.error('Erro ao deletar tarefa');
    }
  };

  const loadArchivedTasks = async () => {
    if (!activeBoard) return;
    try {
      const res = await fetch(`${BACKEND}/api/kanban/boards/${activeBoard.id}/archive`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setArchivedTasks(data);
      }
    } catch (err) {
      console.error('Erro ao carregar arquivo', err);
    }
  };

  const handleToggleArchiveTask = async (taskId, is_archived = true) => {
    try {
      const res = await fetch(`${BACKEND}/api/kanban/tasks/${taskId}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_archived })
      });
      if (res.ok) {
        if (is_archived) {
          setTasks(prev => prev.filter(t => t.id !== taskId));
          toast.success('Tarefa arquivada');
        } else {
          // Desarquivar (Restaurar)
          const restoredTask = await res.json();
          setTasks(prev => [...prev, restoredTask]);
          setArchivedTasks(prev => prev.filter(t => t.id !== taskId));
          toast.success('Tarefa restaurada');
        }
        emitUpdate('task_archived');
      }
    } catch (err) {
      toast.error('Erro ao arquivar tarefa');
    }
  };

  /* --- Automations --- */
  const loadAutomations = async () => {
    if (!activeBoard) return;
    try {
      const res = await fetch(`${BACKEND}/api/kanban/boards/${activeBoard.id}/automations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setAutomations(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAutomation = async () => {
    if (!newAutomation.name.trim() || !newAutomation.trigger_conditions.column_id) {
      toast.error('Preencha nome e coluna do gatilho.');
      return;
    }
    try {
      const payload = {
        ...newAutomation,
        trigger_conditions: {
          column_id: newAutomation.trigger_conditions.column_id,
          days: newAutomation.trigger_type === 'time_in_column' ? Number(newAutomation.trigger_conditions.days) : undefined
        }
      };
      const res = await fetch(`${BACKEND}/api/kanban/boards/${activeBoard.id}/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success('Automação criada!');
        loadAutomations();
        setNewAutomation({ name: '', trigger_type: 'task_moved_to_column', trigger_conditions: { column_id: '', days: 7 }, action_type: 'archive_task', action_data: { priority: 'high' } });
      } else {
        toast.error('Erro ao criar automação.');
      }
    } catch (err) {
      toast.error('Erro de conexão.');
    }
  };

  const handleDeleteAutomation = async (id) => {
    try {
      const res = await fetch(`${BACKEND}/api/kanban/automations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Automação deletada');
        setAutomations(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      toast.error('Erro ao deletar automação');
    }
  };

  /* --- Checklist Handlers --- */
  const addNewChecklist = () => {
    if (!newChecklistItem.trim()) return;
    setNewTask(prev => ({ ...prev, checklist: [...prev.checklist, { text: newChecklistItem.trim(), done: false }] }));
    setNewChecklistItem('');
  };
  const removeNewChecklist = (idx) => {
    setNewTask(prev => ({ ...prev, checklist: prev.checklist.filter((_, i) => i !== idx) }));
  };
  const addEditChecklist = () => {
    if (!editChecklistItem.trim()) return;
    setEditingTask(prev => ({ ...prev, checklist: [...(prev.checklist || []), { text: editChecklistItem.trim(), done: false }] }));
    setEditChecklistItem('');
  };
  const removeEditChecklist = (idx) => {
    setEditingTask(prev => ({ ...prev, checklist: (prev.checklist || []).filter((_, i) => i !== idx) }));
  };
  const toggleEditChecklist = (idx) => {
    setEditingTask(prev => ({ ...prev, checklist: (prev.checklist || []).map((item, i) => i === idx ? { ...item, done: !item.done } : item) }));
  };

  /* ========================================================= */
  /* RENDER */
  /* ========================================================= */
  return (
    <div className={styles.kanbanPage}>
      {/* SIDEBAR */}
      <div className={styles.kanbanSidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Navegação</span>
          {user?.role === 'Administrador Geral' && (
            <button className={styles.addBoardBtn} onClick={() => setShowCreateBoardModal(true)} title="Novo Quadro">
              <Plus size={16} />
            </button>
          )}
        </div>

        <div className={styles.boardList}>
          <div 
            className={`${styles.boardItem} ${!activeBoard ? styles.active : ''}`}
            onClick={() => setActiveBoard(null)}
          >
            <div className={styles.boardIcon}><KanbanSquare size={14} /></div>
            <span className={styles.boardName}>Hub de Quadros</span>
          </div>
          {user?.role === 'Administrador Geral' && (
            <div 
              className={styles.boardItem}
              onClick={() => setActiveBoard(null)}
              title="Ver solicitações no Hub"
            >
              <div className={styles.boardIcon}><User size={14} /></div>
              <span className={styles.boardName}>Solicitações</span>
              {accessRequests.length > 0 && (
                <span style={{background: 'var(--voll-red)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', marginLeft: 'auto'}}>
                  {accessRequests.length}
                </span>
              )}
            </div>
          )}
        </div>

        <div className={styles.sidebarHeader} style={{marginTop: '16px'}}>
          <span className={styles.sidebarTitle}>Meus Quadros</span>
        </div>
        
        <div className={styles.boardList}>
          {boards.map(board => (
            <div 
              key={board.id} 
              className={`${styles.boardItem} ${activeBoard?.id === board.id ? styles.active : ''}`}
              onClick={() => setActiveBoard(board)}
            >
              <div className={styles.boardIcon}><KanbanSquare size={14} /></div>
              <span className={styles.boardName}>{board.nome}</span>
            </div>
          ))}
        </div>


        {invitations.length > 0 && (
          <div className={styles.invitationSection}>
            <div className={styles.invitationTitle}>Convites Pendentes</div>
            {invitations.map(inv => (
              <div key={inv.membership_id} className={styles.invitationItem}>
                <div className={styles.invitationInfo}>
                  <div className={styles.boardIcon}><KanbanSquare size={14} /></div>
                  <div>
                    <div className={styles.invitationName}>{inv.board_name}</div>
                    <div className={styles.invitationCreator}>por {inv.creator_name}</div>
                  </div>
                </div>
                <div className={styles.invitationActions}>
                  <button className={`${styles.invitationBtn} ${styles.accept}`} onClick={() => handleAcceptInvite(inv)}>
                    <Check size={14} /> Aceitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* MODAL: SOLICITAR ACESSO */}
      {showRequestAccessModal && boardToRequest && (
        <div className={styles.modalOverlay} onClick={() => setShowRequestAccessModal(false)}>
          <div className={styles.modalSmall} onClick={(e) => e.stopPropagation()}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
              <div style={{background: 'rgba(224,8,46,0.1)', padding: '12px', borderRadius: '50%', color: 'var(--voll-red)'}}>
                <Lock size={24} />
              </div>
              <div>
                <h3 style={{margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)'}}>Quadro Restrito</h3>
                <p style={{margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)'}}>{boardToRequest.nome}</p>
              </div>
            </div>
            
            <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '24px'}}>
              Este quadro é protegido. Solicite acesso para colaborar, criar tarefas e acompanhar o andamento. O administrador será notificado.
            </p>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowRequestAccessModal(false)}>Cancelar</button>
              <button className={styles.submitBtn} onClick={() => {
                handleRequestAccess(boardToRequest);
                setShowRequestAccessModal(false);
              }}>
                Solicitar Acesso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div 
        className={styles.kanbanContainer} 
        style={activeBoard?.background ? { 
          background: (activeBoard.background.startsWith('http') || activeBoard.background.startsWith('data:image')) ? `url(${activeBoard.background}) center/cover no-repeat` : activeBoard.background 
        } : {}}
      >
        {activeBoard ? (
          <>
            <div className={styles.kanbanHeader}>
              <div className={styles.kanbanTitleArea}>
                <div className={styles.kanbanTitleIcon}>
                  <KanbanSquare size={20} />
                </div>
                <div>
                  <h1>{activeBoard.nome}</h1>
                  <div className={styles.kanbanSubtitle}>
                    {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'} no total {isSyncing && <Loader2 size={12} className="spin" style={{marginLeft: 6}}/>}
                  </div>
                </div>
              </div>
              <div className={styles.headerActions}>
                {canAdmin && (
                  <button className={styles.addColBtn} onClick={() => { loadAutomations(); setShowAutomationsModal(true); }} title="Automações">
                    <Zap size={16} color="#fbbf24" fill="#fbbf24" />
                    Automações
                  </button>
                )}
                <button className={styles.addColBtn} onClick={() => { loadArchivedTasks(); setShowArchiveModal(true); }} title="Ver Arquivo">
                  <Archive size={16} />
                  Arquivo
                </button>
                <button className={styles.addColBtn} onClick={openManageModal} title="Gerenciar Membros">
                  <Users size={16} />
                  Membros
                </button>
                {canEdit && (
                  <button className={styles.addColBtn} onClick={() => setShowColumnModal(true)}>
                    <Plus size={16} />
                    Nova Coluna
                  </button>
                )}
                {canEdit && (
                  <button className={styles.addTaskBtn} onClick={() => {
                    setNewTask(prev => ({...prev, columnId: columns[0]?.id || ''}));
                    setShowModal(true);
                  }}>
                    <Plus size={16} />
                    Nova Tarefa
                  </button>
                )}
              </div>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={rectIntersection}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
            >
              <div className={styles.kanbanBoard}>
                {columnsWithTasks.map((col, idx) => (
                  <Column
                    key={col.id}
                    id={col.id}
                    title={col.title}
                    dotClass={col.dot_class}
                    tasks={col.tasks}
                    onArchive={(id) => handleToggleArchiveTask(id, true)}
                    onCardClick={setEditingTask}
                    onRename={handleRenameColumn}
                    onDeleteColumn={handleDeleteColumn}
                    onMoveLeft={handleMoveColumnLeft}
                    onMoveRight={handleMoveColumnRight}
                    isFirst={idx === 0}
                    isLast={idx === columnsWithTasks.length - 1}
                    totalColumns={columnsWithTasks.length}
                    onAddTaskClick={(colId) => {
                      setNewTask(prev => ({...prev, columnId: colId}));
                      setShowModal(true);
                    }}
                    boardTags={Array.isArray(activeBoard?.tags) ? activeBoard.tags : []}
                    wipLimit={col.wip_limit}
                    canEdit={canEdit}
                  />
                ))}
              </div>

              <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                {activeTask ? (
                  <div className={styles.cardOverlay}>
                    <div className={styles.cardTitle}>{activeTask.title}</div>
                    {activeTask.description && <div className={styles.cardDescription}>{activeTask.description}</div>}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </>
        ) : (
          <div className={styles.hubContainer}>
            <div className={styles.hubHeader}>
              <KanbanSquare size={32} />
              <h2>Hub de Quadros Kanban</h2>
            </div>
            
            <div className={styles.hubSection}>
              <h3>Meus Quadros</h3>
              {boards.length === 0 ? (
                 <p className={styles.hubEmptyText}>Você ainda não possui acesso a nenhum quadro.</p>
              ) : (
                <div className={styles.hubGrid}>
                  {boards.map(board => (
                    <div key={board.id} className={styles.hubCard} onClick={() => setActiveBoard(board)}>
                      <div className={styles.hubCardBg} style={board.background ? { background: (board.background.startsWith('http') || board.background.startsWith('data:image')) ? `url(${board.background}) center/cover no-repeat` : board.background } : {}}>
                        {user?.role === 'Administrador Geral' && (
                          <button 
                            className={styles.hubDeleteBtn} 
                            onClick={(e) => { e.stopPropagation(); handleDeleteBoard(board.id); }}
                            title="Excluir Quadro"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <div className={styles.hubCardInfo}>
                        <KanbanSquare size={16} className={styles.hubCardIcon} />
                        <h4>{board.nome}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {discoverBoards.length > 0 && (
              <div className={styles.hubSection}>
                <h3>Descobrir Quadros</h3>
                <div className={styles.hubGrid}>
                  {discoverBoards.map(board => (
                    <div 
                      key={board.id} 
                      className={`${styles.hubCard} ${board.membership_status === 'solicitado' ? styles.hubCardDisabled : ''}`}
                      onClick={() => {
                        if (board.membership_status === 'solicitado') {
                          toast.info('Solicitação já enviada. Aguarde aprovação.');
                        } else {
                          setBoardToRequest(board);
                          setShowRequestAccessModal(true);
                        }
                      }}
                    >
                      <div className={styles.hubCardBg} style={board.background ? { background: (board.background.startsWith('http') || board.background.startsWith('data:image')) ? `url(${board.background}) center/cover no-repeat` : board.background } : {}}>
                        <div className={styles.hubLockOverlay}>
                          <Lock size={32} />
                        </div>
                      </div>
                      <div className={styles.hubCardInfo}>
                        <KanbanSquare size={16} className={styles.hubCardIcon} />
                        <h4>{board.nome}</h4>
                        {board.membership_status === 'solicitado' && (
                          <span className={styles.hubPendingBadge}>Pendente</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {user?.role === 'Administrador Geral' && (
              <div className={styles.hubSection}>
                <h3>Solicitações de Acesso</h3>
                {accessRequests.length === 0 ? (
                  <p className={styles.hubEmptyText}>Nenhuma solicitação de acesso pendente no momento.</p>
                ) : (
                  <div className={styles.hubRequestList}>
                    {accessRequests.map(req => (
                      <div key={req.membership_id} className={styles.hubRequestItem}>
                        <div className={styles.hubRequestInfo}>
                          <User size={18} />
                          <div>
                            <strong>{req.user_name}</strong> solicitou acesso a <strong>{req.board_name}</strong>
                            <div className={styles.hubRequestEmail}>{req.user_email}</div>
                          </div>
                        </div>
                        <button className={styles.hubApproveBtn} onClick={() => handleApproveRequest(req.membership_id)}>
                          <Check size={16} /> Aprovar Acesso
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MODAL: NOVA COLUNA */}
        {showColumnModal && (
          <div className={styles.modalOverlay} onClick={() => setShowColumnModal(false)}>
            <div className={styles.modalSmall} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalTitle}>Nova Coluna</div>
              <div className={styles.formGroup}>
                <label>Nome da coluna *</label>
                <input type="text" placeholder="Ex: Em Teste, Bloqueado..." value={newColumnTitle} onChange={(e) => setNewColumnTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddColumn(); }} autoFocus />
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowColumnModal(false)}>Cancelar</button>
                <button className={styles.submitBtn} onClick={handleAddColumn}>Criar Coluna</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: NOVO QUADRO */}
        {showCreateBoardModal && (
          <div className={styles.modalOverlay} onClick={() => setShowCreateBoardModal(false)}>
            <div className={styles.modalSmall} onClick={(e) => e.stopPropagation()} style={{maxWidth: '450px'}}>
              <div className={styles.modalTitle}>Criar Novo Quadro</div>
              <div className={styles.formGroup}>
                <label>Nome do Quadro *</label>
                <input type="text" placeholder="Ex: Projeto Alpha" value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBoard(); }} autoFocus />
              </div>
              <div className={styles.formGroup}>
                <label>Plano de Fundo</label>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px'}}>
                  {bgPresets.map(preset => (
                    <div 
                      key={preset.id} 
                      onClick={() => { setNewBoardBg(preset.value); setIsCustomBg(false); }}
                      style={{
                        width: '40px', height: '40px', borderRadius: '8px', cursor: 'pointer', background: preset.value,
                        border: newBoardBg === preset.value && !isCustomBg ? '3px solid var(--voll-red)' : '2px solid transparent'
                      }}
                      title={preset.label}
                    />
                  ))}
                </div>
                <label 
                  className={styles.customUploadZone}
                  style={isCustomBg && newBoardBg.startsWith('data:image') ? { 
                    borderColor: 'var(--voll-red)', 
                    background: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${newBoardBg}) center/cover no-repeat`,
                    color: 'white'
                  } : {}}
                >
                  <Upload size={22} color={(isCustomBg && newBoardBg.startsWith('data:image')) ? 'white' : undefined} style={{marginBottom: '4px'}} />
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'}}>
                    <span style={{ fontSize: '13.5px', fontWeight: '500' }}>
                      {(isCustomBg && newBoardBg.startsWith('data:image')) ? 'Trocar Imagem' : 'Enviar Imagem Local'}
                    </span>
                    <span style={{ fontSize: '11px', color: (isCustomBg && newBoardBg.startsWith('data:image')) ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>PNG, JPG até 5MB</span>
                  </div>
                  <input type="file" accept="image/*" style={{display: 'none'}} onChange={(e) => { setIsCustomBg(true); handleFileUpload(e, setNewBoardBg); }} />
                </label>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowCreateBoardModal(false)}>Cancelar</button>
                <button className={styles.submitBtn} onClick={handleCreateBoard}>Criar Quadro</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CONFIGURAÇÕES DO QUADRO */}
        {showSettingsModal && (
          <div className={styles.modalOverlay} onClick={() => setShowSettingsModal(false)}>
            <div className={styles.modalSmall} onClick={(e) => e.stopPropagation()} style={{maxWidth: '450px'}}>
              <div className={styles.modalTitle}>Configurações do Quadro</div>
              <div className={styles.formGroup}>
                <label>Nome do Quadro *</label>
                <input type="text" value={editBoardName} onChange={(e) => setEditBoardName(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Plano de Fundo</label>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px'}}>
                  {bgPresets.map(preset => (
                    <div 
                      key={preset.id} 
                      onClick={() => setEditBoardBg(preset.value)}
                      style={{
                        width: '40px', height: '40px', borderRadius: '8px', cursor: 'pointer', background: preset.value,
                        border: editBoardBg === preset.value ? '3px solid var(--voll-red)' : '2px solid transparent'
                      }}
                      title={preset.label}
                    />
                  ))}
                </div>
                <label 
                  className={styles.customUploadZone}
                  style={editBoardBg.startsWith('data:image') ? { 
                    borderColor: 'var(--voll-red)', 
                    background: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${editBoardBg}) center/cover no-repeat`,
                    color: 'white'
                  } : {}}
                >
                  <Upload size={22} color={editBoardBg.startsWith('data:image') ? 'white' : undefined} style={{marginBottom: '4px'}} />
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'}}>
                    <span style={{ fontSize: '13.5px', fontWeight: '500' }}>
                      {editBoardBg.startsWith('data:image') ? 'Trocar Imagem' : 'Enviar Nova Imagem'}
                    </span>
                    <span style={{ fontSize: '11px', color: editBoardBg.startsWith('data:image') ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>PNG, JPG até 5MB</span>
                  </div>
                  <input type="file" accept="image/*" style={{display: 'none'}} onChange={(e) => handleFileUpload(e, setEditBoardBg)} />
                </label>
              </div>
              <div className={styles.formGroup} style={{marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px'}}>
                <label>Etiquetas do Quadro</label>
                <div style={{display: 'flex', gap: '8px', marginBottom: '12px'}}>
                  <input type="text" placeholder="Nome da etiqueta" value={newTagName} onChange={e => setNewTagName(e.target.value)} style={{flex: 1, padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-primary)'}} />
                  <input type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)} style={{width: '36px', height: '36px', padding: '2px', cursor: 'pointer', borderRadius: '4px', border: '1px solid var(--border)'}} />
                  <button type="button" onClick={handleAddTag} className={styles.submitBtn} style={{padding: '0 16px', height: '36px'}}>Adicionar</button>
                </div>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                  {editBoardTags.map(tag => (
                    <div key={tag.id} style={{display: 'flex', alignItems: 'center', gap: '6px', background: `${tag.color}20`, color: tag.color, padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500'}}>
                      {tag.name}
                      <button type="button" onClick={() => handleRemoveTag(tag.id)} style={{background: 'none', border: 'none', color: tag.color, cursor: 'pointer', opacity: 0.7, padding: 0}}><X size={12} /></button>
                    </div>
                  ))}
                  {editBoardTags.length === 0 && <span style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Nenhuma etiqueta criada.</span>}
                </div>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowSettingsModal(false)}>Cancelar</button>
                <button className={styles.submitBtn} onClick={handleUpdateBoardSettings}>Salvar</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: NOVA TAREFA */}
        {showModal && (
          <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalTitle}>Nova Tarefa</div>
              <div className={styles.formGroup}>
                <label>Título *</label>
                <input type="text" value={newTask.title} onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))} autoFocus />
              </div>
              <div className={styles.formGroup}>
                <label>Descrição</label>
                <textarea value={newTask.description} onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))} />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Prioridade</label>
                  <select value={newTask.priority} onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}>
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Coluna</label>
                  <select value={newTask.columnId} onChange={(e) => setNewTask(prev => ({ ...prev, columnId: e.target.value }))}>
                    {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
              </div>
              {activeBoard?.tags && activeBoard.tags.length > 0 && (
                <div className={styles.formGroup}>
                  <label>Etiquetas</label>
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                    {activeBoard.tags.map(tag => {
                      const isSelected = newTask.tags.includes(tag.id);
                      return (
                        <div 
                          key={tag.id} 
                          onClick={() => {
                            setNewTask(prev => ({
                              ...prev,
                              tags: isSelected ? prev.tags.filter(t => t !== tag.id) : [...prev.tags, tag.id]
                            }))
                          }}
                          style={{
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', 
                            background: isSelected ? `${tag.color}30` : 'var(--bg-subtle)', 
                            color: isSelected ? tag.color : 'var(--text-muted)', 
                            border: `1px solid ${isSelected ? tag.color : 'transparent'}`,
                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '500',
                            transition: 'all 0.2s'
                          }}
                        >
                          {tag.name}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className={styles.formGroup}>
                <label>Prazo</label>
                <input type="date" value={newTask.dueDate} onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))} />
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancelar</button>
                <button className={styles.submitBtn} onClick={handleAddTask}>Criar Tarefa</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: EDITAR TAREFA */}
        {editingTask && (
          <div className={styles.modalOverlay} onClick={() => setEditingTask(null)}>
            <div className={styles.modalWide} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalTitle}>Editar Tarefa</div>
              <div className={styles.modalColumns}>
                <div className={styles.modalLeft}>
                  <div className={styles.formGroup}>
                    <label>Título *</label>
                    <input type="text" value={editingTask.title} onChange={(e) => setEditingTask(prev => ({ ...prev, title: e.target.value }))} autoFocus />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Descrição</label>
                    <textarea value={editingTask.description || ''} onChange={(e) => setEditingTask(prev => ({ ...prev, description: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Observações</label>
                    <textarea value={editingTask.notes || ''} onChange={(e) => setEditingTask(prev => ({ ...prev, notes: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Checklist</label>
                    {(editingTask.checklist || []).map((item, idx) => (
                      <div key={idx} className={styles.checklistRow}>
                        <input type="checkbox" checked={item.done} onChange={() => toggleEditChecklist(idx)} className={styles.checklistCheckbox} />
                        <span className={`${styles.checklistText} ${item.done ? styles.checklistDone : ''}`}>{item.text}</span>
                        <button type="button" className={styles.checklistRemove} onClick={() => removeEditChecklist(idx)}>✕</button>
                      </div>
                    ))}
                    <div className={styles.checklistAdd}>
                      <input type="text" placeholder="Adicionar item..." value={editChecklistItem} onChange={(e) => setEditChecklistItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addEditChecklist(); }} />
                      <button type="button" className={styles.checklistAddBtn} onClick={addEditChecklist}><Plus size={14} /></button>
                    </div>
                  </div>
                </div>
                <div className={styles.modalRight}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Prioridade</label>
                      <select value={editingTask.priority} onChange={(e) => setEditingTask(prev => ({ ...prev, priority: e.target.value }))}>
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Coluna</label>
                    <select value={editingTask.columnId} onChange={(e) => setEditingTask(prev => ({ ...prev, columnId: e.target.value }))}>
                      {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Prazo</label>
                    <input type="date" value={editingTask.dueDate ? editingTask.dueDate.split('T')[0] : ''} onChange={(e) => setEditingTask(prev => ({ ...prev, dueDate: e.target.value }))} />
                  </div>
                  {activeBoard?.tags && activeBoard.tags.length > 0 && (
                    <div className={styles.formGroup}>
                      <label>Etiquetas</label>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                        {activeBoard.tags.map(tag => {
                          const isSelected = (editingTask.tags || []).includes(tag.id);
                          return (
                            <div 
                              key={tag.id} 
                              onClick={() => {
                                setEditingTask(prev => ({
                                  ...prev,
                                  tags: isSelected ? (prev.tags || []).filter(t => t !== tag.id) : [...(prev.tags || []), tag.id]
                                }))
                              }}
                              style={{
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', 
                                background: isSelected ? `${tag.color}30` : 'var(--bg-subtle)', 
                                color: isSelected ? tag.color : 'var(--text-muted)', 
                                border: `1px solid ${isSelected ? tag.color : 'transparent'}`,
                                padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '500',
                                transition: 'all 0.2s'
                              }}
                            >
                              {tag.name}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.modalActions} style={{ justifyContent: 'space-between' }}>
                <button className={styles.deleteBtnModal} onClick={() => { handleDeleteTask(editingTask.id); setEditingTask(null); }}>Excluir</button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className={styles.cancelBtn} onClick={() => setEditingTask(null)}>Cancelar</button>
                  <button className={styles.submitBtn} onClick={handleUpdateTask}>Salvar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: GERENCIAR MEMBROS */}
        {showManageModal && (
          <div className={styles.modalOverlay} onClick={() => setShowManageModal(false)}>
            <div className={styles.modalWide} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalTitle}>Membros do Quadro: {activeBoard.nome}</div>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input 
                  type="email" 
                  placeholder="E-mail do novo membro..." 
                  value={inviteEmail} 
                  onChange={(e) => setInviteEmail(e.target.value)} 
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)' }}
                />
                <button onClick={handleInviteMember} className={styles.submitBtn}>
                  Convidar
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                {boardMembers.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-subtle)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {m.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {m.name} {m.id === user.id && '(Você)'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {m.email} • <span style={{ textTransform: 'capitalize' }}>{m.papel}</span> • {m.status === 'pendente' ? <span style={{ color: '#f59e0b' }}>Pendente</span> : <span style={{ color: '#10b981' }}>Aceito</span>}
                        </div>
                      </div>
                    </div>
                    {m.id !== user.id && canAdmin && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select 
                          value={m.papel}
                          onChange={(e) => handleRoleChange(m.id, e.target.value)}
                          style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}
                        >
                          <option value="leitor">Leitor</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button onClick={() => handleRemoveMember(m.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className={styles.modalActions}>
                <button className={styles.submitBtn} onClick={() => setShowManageModal(false)}>Concluir</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ARQUIVO */}
        {showArchiveModal && (
          <div className={styles.modalOverlay} onClick={() => setShowArchiveModal(false)}>
            <div className={styles.modalWide} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={20} /> Histórico de Arquivo
                </div>
                <button className={styles.closeBtn} onClick={() => setShowArchiveModal(false)}><X size={20} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto', marginTop: '20px' }}>
                {archivedTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Nenhuma tarefa arquivada.</div>
                ) : (
                  archivedTasks.map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{t.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Arquivado de: <strong>{t.column_name}</strong> • Em: {new Date(t.archived_at).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {canEdit && (
                          <button 
                            onClick={() => handleToggleArchiveTask(t.id, false)} 
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}
                          >
                            <ArchiveRestore size={16} /> Restaurar
                          </button>
                        )}
                        {canEdit && (
                          <button 
                            onClick={() => {
                              handleDeleteTask(t.id);
                              setArchivedTasks(prev => prev.filter(at => at.id !== t.id));
                            }} 
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', color: '#ef4444', border: '1px solid #fca5a5', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}
                          >
                            <Trash2 size={16} /> Excluir
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: AUTOMAÇÕES */}
        {showAutomationsModal && (
          <div className={styles.modalOverlay} onClick={() => setShowAutomationsModal(false)}>
            <div className={styles.modalWide} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={20} color="#fbbf24" fill="#fbbf24" /> Automações do Quadro
                </div>
                <button className={styles.closeBtn} onClick={() => setShowAutomationsModal(false)}><X size={20} /></button>
              </div>

              <div style={{ marginTop: '20px', background: 'var(--bg-subtle)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <h3 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>Criar Nova Regra</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>Nome da Regra</label>
                    <input type="text" value={newAutomation.name} onChange={e => setNewAutomation({...newAutomation, name: e.target.value})} placeholder="Ex: Arquivar ao concluir" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ padding: '15px', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>QUANDO (Gatilho)</label>
                      <select value={newAutomation.trigger_type} onChange={e => setNewAutomation({...newAutomation, trigger_type: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', marginBottom: '10px', background: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        <option value="task_moved_to_column">A tarefa entrar na coluna...</option>
                        <option value="time_in_column">A tarefa ficar X dias na coluna...</option>
                      </select>
                      
                      <select value={newAutomation.trigger_conditions.column_id} onChange={e => setNewAutomation({...newAutomation, trigger_conditions: {...newAutomation.trigger_conditions, column_id: e.target.value}})} style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        <option value="">-- Selecione a Coluna --</option>
                        {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>

                      {newAutomation.trigger_type === 'time_in_column' && (
                        <div style={{ marginTop: '10px' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Quantidade de dias parada:</label>
                          <input type="number" min="1" value={newAutomation.trigger_conditions.days} onChange={e => setNewAutomation({...newAutomation, trigger_conditions: {...newAutomation.trigger_conditions, days: e.target.value}})} style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)' }} />
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '15px', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>ENTÃO (Ação)</label>
                      <select value={newAutomation.action_type} onChange={e => setNewAutomation({...newAutomation, action_type: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', marginBottom: '10px', background: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        <option value="archive_task">Arquivar a tarefa</option>
                        <option value="set_priority">Alterar prioridade para...</option>
                      </select>

                      {newAutomation.action_type === 'set_priority' && (
                        <select value={newAutomation.action_data.priority} onChange={e => setNewAutomation({...newAutomation, action_data: {...newAutomation.action_data, priority: e.target.value}})} style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                          <option value="low">Baixa</option>
                          <option value="medium">Média</option>
                          <option value="high">Alta</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className={styles.submitBtn} onClick={handleCreateAutomation}>
                      <Plus size={16} /> Adicionar Regra
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '30px' }}>
                <h3 style={{ marginBottom: '15px', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Regras Ativas ({automations.length})</h3>
                {automations.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>Nenhuma automação configurada.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {automations.map(auto => (
                      <div key={auto.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{auto.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            <strong>Gatilho:</strong> {auto.trigger_type === 'task_moved_to_column' ? 'Ao entrar na coluna' : 'Tempo parada na coluna'} 
                            {' -> '} <strong>Ação:</strong> {auto.action_type === 'archive_task' ? 'Arquivar tarefa' : 'Mudar prioridade'}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteAutomation(auto.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
