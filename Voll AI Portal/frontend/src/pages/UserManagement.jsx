import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck, Users, UserCheck, UserX, UserPlus, Search, ChevronDown, CheckCircle2, AlertCircle, X,
  Pencil, Trash2, Download, Building, ArrowUp, ArrowDown, Camera
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const BACKEND = 'http://localhost:3001';

const ROLES = [
  'Administrador Geral',
  'Administrador',
  'Colaborador',
  'Auditor de DLP',
];

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
   Modals
---------------------------------------------------------------- */
const UserFormModal = ({ onClose, onSubmit, saving, initialData, departments, isEdit }) => {
  const [form, setForm] = useState(
    initialData || { name: '', email: '', role: 'Colaborador', department: departments[0]?.name || '', avatar: null }
  );

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 120;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setForm(prev => ({ ...prev, avatar: dataUrl }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    onSubmit(form);
  };

  return (
    <div className="um-modal-overlay" onClick={onClose}>
      <div className="um-modal" onClick={(e) => e.stopPropagation()}>
        <div className="um-modal-header">
          <h2>{isEdit ? 'Editar Colaborador' : 'Cadastrar Colaborador'}</h2>
          <button className="btn btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="um-modal-body">
            <div className="um-avatar-upload">
              <input type="file" id="avatarUpload" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              <label htmlFor="avatarUpload" className="um-avatar-preview">
                {form.avatar ? (
                  <img src={form.avatar} alt="Avatar" />
                ) : (
                  <div className="um-avatar-placeholder">
                    <Camera size={24} />
                  </div>
                )}
                <div className="um-avatar-overlay">
                  <span>Trocar</span>
                </div>
              </label>
            </div>
            <div className="form-group">
              <label>Nome Completo</label>
              <input type="text" className="form-control" value={form.name} onChange={handleChange('name')} required autoFocus={!isEdit} />
            </div>
            <div className="form-group">
              <label>E-mail Corporativo</label>
              <input type="email" className="form-control" value={form.email} onChange={handleChange('email')} required disabled={isEdit} />
            </div>
            <div className="um-modal-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Departamento</label>
                <select className="form-control" value={form.department} onChange={handleChange('department')} required>
                  {departments.map((d) => (<option key={d.id} value={d.name}>{d.name}</option>))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Nível de Acesso</label>
                <select className="form-control" value={form.role} onChange={handleChange('role')} required>
                  {ROLES.map((r) => (<option key={r} value={r}>{r}</option>))}
                </select>
              </div>
            </div>
          </div>
          <div className="um-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !form.name.trim() || !form.email.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ConfirmDeleteModal = ({ onClose, onConfirm, user, saving }) => (
  <div className="um-modal-overlay" onClick={onClose}>
    <div className="um-modal" onClick={(e) => e.stopPropagation()}>
      <div className="um-modal-header">
        <h2>Excluir Colaborador</h2>
        <button className="btn btn-ghost" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="um-modal-body">
        <p>Tem certeza que deseja excluir permanentemente o colaborador <strong>{user?.name}</strong>?</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>Esta ação não poderá ser desfeita.</p>
      </div>
      <div className="um-modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
        <button type="button" className="btn btn-primary" style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }} onClick={onConfirm} disabled={saving}>
          {saving ? 'Excluindo...' : 'Sim, Excluir'}
        </button>
      </div>
    </div>
  </div>
);

const ManageDepartmentsModal = ({ onClose, departments, onCreate, onDelete, onReorder }) => {
  const [newDept, setNewDept] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleAdd = async () => {
    if (!newDept.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await onCreate(newDept.trim());
      setNewDept('');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const move = async (index, dir) => {
    if (saving) return;
    if (dir === -1 && index === 0) return;
    if (dir === 1 && index === departments.length - 1) return;

    const newDepts = [...departments];
    const temp = newDepts[index];
    newDepts[index] = newDepts[index + dir];
    newDepts[index + dir] = temp;

    setSaving(true);
    try {
      await onReorder(newDepts);
    } catch (err) {
      setErrorMsg('Falha ao reordenar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="um-modal-overlay" onClick={onClose}>
      <div className="um-modal" onClick={(e) => e.stopPropagation()}>
        <div className="um-modal-header">
          <h2>Gerenciar Departamentos</h2>
          <button className="btn btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="um-modal-body">
          {errorMsg && (
            <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '12px', padding: '8px', backgroundColor: 'rgba(220,38,38,0.1)', borderRadius: '4px' }}>
              {errorMsg}
            </div>
          )}
          <div className="um-dept-list">
            {departments.map((d, i) => (
              <div key={d.id} className="um-dept-item">
                <span className="um-dept-item-name">{d.name}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="um-action-btn" onClick={() => move(i, -1)} disabled={i === 0 || saving} title="Mover para cima">
                    <ArrowUp size={14} />
                  </button>
                  <button className="um-action-btn" onClick={() => move(i, 1)} disabled={i === departments.length - 1 || saving} title="Mover para baixo">
                    <ArrowDown size={14} />
                  </button>
                  <button className="um-action-btn um-action-btn--delete" onClick={() => onDelete(d.id, d.name)} title="Excluir" disabled={saving}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="um-dept-add">
            <input type="text" className="form-control" placeholder="Novo departamento..." value={newDept} onChange={e => setNewDept(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving || !newDept.trim()}>Adicionar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------
   Main component
---------------------------------------------------------------- */
const UserManagement = () => {
  const { user, updateUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('Todos');
  const [toast, setToast] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [usersRes, deptsRes] = await Promise.all([
        fetch(`${BACKEND}/api/users?userId=${user?.id}`),
        fetch(`${BACKEND}/api/departments?userId=${user?.id}`)
      ]);

      if (!usersRes.ok || !deptsRes.ok) throw new Error('Falha ao carregar dados');

      const [usersData, deptsData] = await Promise.all([usersRes.json(), deptsRes.json()]);
      setUsers(usersData);
      setDepartments(deptsData);
    } catch (err) {
      console.error(err);
      setToast({ message: err.message || 'Erro de conexão', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const apiCall = async (url, method, payload = null) => {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (payload) opts.body = JSON.stringify({ ...payload, userId: user?.id });
    else if (method !== 'GET') opts.body = JSON.stringify({ userId: user?.id });

    const res = await fetch(`${BACKEND}${url}`, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro na requisição');
    }
    return res.status !== 204 ? await res.json() : null;
  };

  // User Actions
  const handleSaveUser = async (form, id = null) => {
    setModalSaving(true);
    try {
      if (id) {
        const updated = await apiCall(`/api/users/${id}`, 'PUT', form);
        setUsers(prev => prev.map(u => (u.id === id ? updated : u)));
        if (id === user?.id) updateUser(updated);
        setToast({ message: 'Colaborador atualizado com sucesso', type: 'success' });
      } else {
        const created = await apiCall(`/api/users`, 'POST', form);
        setUsers(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setToast({ message: `${created.name} cadastrado com sucesso`, type: 'success' });
      }
      setShowCreateModal(false);
      setShowEditModal(null);
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setModalSaving(false);
    }
  };

  const handleInlineStatus = async (targetId, currentStatus) => {
    setUpdatingId(targetId);
    try {
      const status = currentStatus === 'Ativo' ? 'Suspenso' : 'Ativo';
      const updated = await apiCall(`/api/users/${targetId}`, 'PUT', { status });
      setUsers(prev => prev.map(u => (u.id === targetId ? updated : u)));
      setToast({ message: `Acesso ${status.toLowerCase()} com sucesso`, type: 'success' });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!showDeleteModal) return;
    setModalSaving(true);
    try {
      await apiCall(`/api/users/${showDeleteModal.id}`, 'DELETE');
      setUsers(prev => prev.filter(u => u.id !== showDeleteModal.id));
      setToast({ message: 'Colaborador excluído com sucesso', type: 'success' });
      setShowDeleteModal(null);
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setModalSaving(false);
    }
  };

  // Department Actions
  const handleCreateDept = async (name) => {
    const created = await apiCall(`/api/departments`, 'POST', { name });
    setDepartments(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setToast({ message: 'Departamento criado', type: 'success' });
  };

  const handleDeleteDept = async (id, name) => {
    try {
      await apiCall(`/api/departments/${id}`, 'DELETE');
      setDepartments(prev => prev.filter(d => d.id !== id));
      if (deptFilter === name) setDeptFilter('Todos');
      setToast({ message: 'Departamento excluído', type: 'success' });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const handleReorderDept = async (newDepts) => {
    // Generate new order payloads mapping id -> order_index based on index in array
    const orderPayload = newDepts.map((d, i) => ({ id: d.id, order_index: i }));
    await apiCall(`/api/departments/reorder`, 'PUT', { order: orderPayload });
    setDepartments(newDepts);
  };

  // Export CSV
  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Nome', 'E-mail', 'Departamento', 'Nível de Acesso', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filtered.map(u => `"${u.name}","${u.email}","${u.department}","${u.role}","${u.status}"`)
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `colaboradores_voll_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = useMemo(() => {
    return users.filter(u => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesDept = deptFilter === 'Todos' || u.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [users, searchQuery, deptFilter]);

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'Ativo').length;
  const suspendedUsers = users.filter(u => u.status === 'Suspenso').length;

  return (
    <div className="generator-page">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Controle de Acesso</h1>
          <p>Gerencie os colaboradores, permissões e departamentos do Portal Voll.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => setShowDeptModal(true)}>
            <Building size={16} /> Departamentos
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <UserPlus size={16} /> Cadastrar Colaborador
          </button>
        </div>
      </div>

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

      <div className="um-toolbar">
        <div className="um-search">
          <Search size={16} />
          <input type="text" placeholder="Buscar por nome ou e-mail…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="um-filter" style={{ display: 'flex', gap: '10px' }}>
          <select className="form-control" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="Todos">Todos os Departamentos</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={exportCSV} title="Exportar para CSV">
            <Download size={16} /> Exportar
          </button>
        </div>
      </div>

      {loading ? <TableSkeleton /> : (
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="um-empty">
                    <AlertCircle size={20} /><span>Nenhum colaborador encontrado</span>
                  </td>
                </tr>
              ) : (
                filtered.map(u => {
                  const isSelf = u.id === user?.id;
                  const isUpdating = updatingId === u.id;
                  return (
                    <tr key={u.id} className={isUpdating ? 'um-row-updating' : ''}>
                      <td>
                        <div className="um-user-cell">
                          <div className="um-user-avatar">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              u.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <span className="um-user-name">{u.name}</span>
                        </div>
                      </td>
                      <td className="um-email">{u.email}</td>
                      <td>{u.department}</td>
                      <td>{u.role}</td>
                      <td>
                        <span className={`um-badge ${u.status === 'Ativo' ? 'um-badge--active' : 'um-badge--suspended'}`}>
                          <span className="um-badge-dot" />{u.status}
                        </span>
                      </td>
                      <td>
                        <div className="um-actions-cell">
                          <button
                            className={`um-toggle-btn ${u.status === 'Ativo' ? 'um-toggle-btn--suspend' : 'um-toggle-btn--activate'}`}
                            disabled={isSelf || isUpdating}
                            onClick={() => handleInlineStatus(u.id, u.status)}
                            title={isSelf ? 'Você não pode suspender sua própria conta' : (u.status === 'Ativo' ? 'Suspender' : 'Ativar')}
                          >
                            {u.status === 'Ativo' ? 'Suspender' : 'Ativar'}
                          </button>
                          <button className="um-action-btn um-action-btn--edit" disabled={isUpdating} onClick={() => setShowEditModal(u)} title="Editar Colaborador">
                            <Pencil size={14} />
                          </button>
                          <button className="um-action-btn um-action-btn--delete" disabled={isSelf || isUpdating} onClick={() => setShowDeleteModal(u)} title="Excluir Colaborador">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && <div className="um-footer">Exibindo {filtered.length} de {totalUsers} colaborador{totalUsers !== 1 ? 'es' : ''}</div>}

      {showCreateModal && <UserFormModal onClose={() => setShowCreateModal(false)} onSubmit={(f) => handleSaveUser(f)} saving={modalSaving} departments={departments} isEdit={false} />}
      {showEditModal && <UserFormModal onClose={() => setShowEditModal(null)} onSubmit={(f) => handleSaveUser(f, showEditModal.id)} saving={modalSaving} initialData={showEditModal} departments={departments} isEdit={true} />}
      {showDeleteModal && <ConfirmDeleteModal onClose={() => setShowDeleteModal(null)} onConfirm={handleDeleteUser} user={showDeleteModal} saving={modalSaving} />}
      {showDeptModal && <ManageDepartmentsModal onClose={() => setShowDeptModal(false)} departments={departments} onCreate={handleCreateDept} onDelete={handleDeleteDept} onReorder={handleReorderDept} authId={user?.id} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default UserManagement;
