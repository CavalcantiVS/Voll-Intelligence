import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Search,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const BACKEND = 'http://localhost:3001';

const ROLES = [
  'Administrador Geral',
  'Administrador',
  'Colaborador',
  'Auditor de DLP',
];

const DEPARTMENTS = [
  'Todos',
  'Atendimento',
  'TI',
  'Financeiro',
  'RH',
  'Comercial',
  'Diretoria',
];

const DEPARTMENTS_NO_TODOS = DEPARTMENTS.filter((d) => d !== 'Todos');

/* ----------------------------------------------------------------
   Toast notification
---------------------------------------------------------------- */
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`um-toast um-toast--${type}`}>
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      <span>{message}</span>
    </div>
  );
};

/* ----------------------------------------------------------------
   Loading skeleton
---------------------------------------------------------------- */
const TableSkeleton = () => (
  <div className="um-table-wrapper">
    <table className="um-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>E-mail</th>
          <th>Departamento</th>
          <th>Nível de Acesso</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {[...Array(5)].map((_, i) => (
          <tr key={i}>
            {[...Array(6)].map((__, j) => (
              <td key={j}>
                <div className="sk sk-h-sm" style={{ width: j === 1 ? '80%' : j === 5 ? '60%' : '70%' }} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ----------------------------------------------------------------
   Create User Modal
---------------------------------------------------------------- */
const CreateUserModal = ({ onClose, onCreate, saving }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'Colaborador',
    department: 'Atendimento',
  });

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    onCreate(form);
  };

  return (
    <div className="um-modal-overlay" onClick={onClose}>
      <div className="um-modal" onClick={(e) => e.stopPropagation()}>
        <div className="um-modal-header">
          <h2>Cadastrar Colaborador</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="um-modal-body">
            <div className="form-group">
              <label htmlFor="new-user-name">Nome Completo</label>
              <input
                id="new-user-name"
                type="text"
                className="form-control"
                placeholder="Ex: Maria da Silva"
                value={form.name}
                onChange={handleChange('name')}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-user-email">E-mail Corporativo</label>
              <input
                id="new-user-email"
                type="email"
                className="form-control"
                placeholder="Ex: maria.silva@vollsolutions.com.br"
                value={form.email}
                onChange={handleChange('email')}
                required
              />
            </div>

            <div className="um-modal-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="new-user-dept">Departamento</label>
                <select
                  id="new-user-dept"
                  className="form-control"
                  value={form.department}
                  onChange={handleChange('department')}
                >
                  {DEPARTMENTS_NO_TODOS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="new-user-role">Nível de Acesso</label>
                <select
                  id="new-user-role"
                  className="form-control"
                  value={form.role}
                  onChange={handleChange('role')}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="um-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !form.name.trim() || !form.email.trim()}>
              <UserPlus size={16} />
              {saving ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------
   Main component
---------------------------------------------------------------- */
const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('Todos');
  const [toast, setToast] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/users?userId=${user?.id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao carregar colaboradores');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
      setToast({ message: err.message || 'Erro ao carregar colaboradores', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Update user
  const updateUser = async (targetId, payload) => {
    setUpdatingId(targetId);
    try {
      const res = await fetch(`${BACKEND}/api/users/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, userId: user?.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao atualizar');
      }

      const updated = await res.json();

      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u))
      );

      setToast({ message: 'Colaborador atualizado com sucesso', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: err.message, type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Create user
  const createUser = async (form) => {
    setCreating(true);
    try {
      const res = await fetch(`${BACKEND}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, userId: user?.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao cadastrar');
      }

      const created = await res.json();
      setUsers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setShowCreateModal(false);
      setToast({ message: `${created.name} cadastrado com sucesso`, type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: err.message, type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  // Filtered users
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchesDept =
        deptFilter === 'Todos' || u.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [users, searchQuery, deptFilter]);

  // Stats
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'Ativo').length;
  const suspendedUsers = users.filter((u) => u.status === 'Suspenso').length;

  return (
    <div className="generator-page">
      {/* Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Controle de Acesso</h1>
          <p>Gerencie os colaboradores, permissões e status de acesso ao Portal Voll.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} id="btn-add-user">
          <UserPlus size={16} />
          Cadastrar Colaborador
        </button>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary"><Users size={22} /></div>
          <div className="stat-info">
            <h3>Colaboradores</h3>
            <p>{loading ? '—' : totalUsers}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon secondary" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }}>
            <UserCheck size={22} />
          </div>
          <div className="stat-info">
            <h3>Ativos</h3>
            <p>{loading ? '—' : activeUsers}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon secondary" style={{ backgroundColor: 'rgba(220, 38, 38, 0.08)', color: '#dc2626' }}>
            <UserX size={22} />
          </div>
          <div className="stat-info">
            <h3>Suspensos</h3>
            <p>{loading ? '—' : suspendedUsers}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="um-toolbar">
        <div className="um-search">
          <Search size={16} />
          <input
            id="um-search-input"
            type="text"
            placeholder="Buscar por nome ou e-mail…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="um-filter">
          <select
            id="um-dept-filter"
            className="form-control"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d === 'Todos' ? 'Todos os Departamentos' : d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="um-table-wrapper">
          <table className="um-table" id="um-collaborators-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Departamento</th>
                <th>Nível de Acesso</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="um-empty">
                    <AlertCircle size={20} />
                    <span>Nenhum colaborador encontrado</span>
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const isSelf = u.id === user?.id;
                  const isUpdating = updatingId === u.id;

                  return (
                    <tr key={u.id} className={isUpdating ? 'um-row-updating' : ''}>
                      <td>
                        <div className="um-user-cell">
                          <div className="um-user-avatar">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="um-user-name">{u.name}</span>
                        </div>
                      </td>
                      <td className="um-email">{u.email}</td>
                      <td>{u.department}</td>
                      <td>
                        <div className="um-select-wrapper">
                          <select
                            className="um-select"
                            value={u.role}
                            disabled={isSelf || isUpdating}
                            onChange={(e) => updateUser(u.id, { role: e.target.value })}
                            title={isSelf ? 'Você não pode alterar seu próprio nível' : 'Alterar nível de acesso'}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="um-select-chevron" />
                        </div>
                      </td>
                      <td>
                        <span className={`um-badge ${u.status === 'Ativo' ? 'um-badge--active' : 'um-badge--suspended'}`}>
                          <span className="um-badge-dot" />
                          {u.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`um-toggle-btn ${u.status === 'Ativo' ? 'um-toggle-btn--suspend' : 'um-toggle-btn--activate'}`}
                          disabled={isSelf || isUpdating}
                          onClick={() =>
                            updateUser(u.id, {
                              status: u.status === 'Ativo' ? 'Suspenso' : 'Ativo',
                            })
                          }
                          title={
                            isSelf
                              ? 'Você não pode suspender sua própria conta'
                              : u.status === 'Ativo'
                                ? 'Suspender acesso'
                                : 'Reativar acesso'
                          }
                        >
                          {isUpdating ? '...' : u.status === 'Ativo' ? 'Suspender' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Result count */}
      {!loading && (
        <div className="um-footer">
          Exibindo {filtered.length} de {totalUsers} colaborador{totalUsers !== 1 ? 'es' : ''}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createUser}
          saving={creating}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default UserManagement;
