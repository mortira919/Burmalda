import React, { useEffect, useState, useCallback } from 'react';
import { clientsApi } from '../api/client';
import { formatMoney } from '../utils/helpers';
import Modal from '../components/Modal';
import { Users2, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useSync } from '../hooks/useSync';
import { PhoneInput } from '../components/FormInputs';

const emptyForm = { name: '', phone: '', email: '', company: '', notes: '' };

function ClientForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || emptyForm);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = async (e) => { e.preventDefault(); setSaving(true); try { await onSave(form); } catch { setSaving(false); } };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className="label">Имя / Компания *</label><input className="input" required value={form.name} onChange={e => set('name', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">Телефон</label><PhoneInput value={form.phone} onChange={v => set('phone', v)} /></div>
        <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} /></div>
      </div>
      <div><label className="label">Компания</label><input className="input" value={form.company} onChange={e => set('company', e.target.value)} /></div>
      <div><label className="label">Заметки</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary">Отмена</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Сохранение...' : 'Сохранить'}</button>
      </div>
    </form>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const [tick, setTick] = useState(0);

  const load = () => clientsApi.getAll().then(r => setClients(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, [tick]);
  useSync(useCallback(() => setTick(t => t + 1), []));

  const handleCreate = async (form) => { await clientsApi.create(form); load(); setModal(null); };
  const handleEdit   = async (form) => { await clientsApi.update(modal.client.id, form); load(); setModal(null); };
  const handleDelete = async (id)  => { if (!confirm('Удалить клиента?')) return; await clientsApi.delete(id); load(); };

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q);
  });

  const AVATAR_COLORS = ['#76B900','#77216F','#0E8420','#006EAF'];
  const getColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><Users2 size={24} className="text-primary-500" /> Клиенты</h1>
          <p className="page-sub">{clients.length} клиентов</p>
        </div>
        <button onClick={() => setModal({ type: 'create' })} className="btn-primary"><Plus size={16} /> Новый клиент</button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
        <input className="input pl-8 max-w-sm" placeholder="Поиск клиентов..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && (
          <div className="card text-center py-16">
            <Users2 size={40} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">Клиентов не найдено</p>
          </div>
        )}
        {filtered.map(c => {
          const totalBudget = c.projects?.reduce((s, p) => s + p.budget, 0) || 0;
          const totalDebt   = c.projects?.reduce((s, p) => s + Math.max(0, p.budget - p.prepayment), 0) || 0;
          const isExp = expanded === c.id;
          return (
            <div key={c.id} className="card p-0 overflow-hidden">
              <div className="flex items-start gap-4 p-4">
                <img
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}&backgroundColor=${getColor(c.name).replace('#','')}&fontFamily=Ubuntu&fontSize=38`}
                  alt={c.name} className="w-11 h-11 rounded-xl shrink-0"
                />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(isExp ? null : c.id)}>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{c.name}</p>
                    {c.company && <span className="badge bg-white/5 text-gray-500 border border-white/10">{c.company}</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                    {c.phone && <span>📞 {c.phone}</span>}
                    {c.email && <span>✉️ {c.email}</span>}
                    <span>Проектов: <strong className="text-gray-300">{c.projects?.length || 0}</strong></span>
                    <span>Принёс: <strong className="text-green-400 font-mono">{formatMoney(totalBudget)}</strong></span>
                    {totalDebt > 0 && <span>Долг: <strong className="text-red-400 font-mono">{formatMoney(totalDebt)}</strong></span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => setExpanded(isExp ? null : c.id)} className="text-gray-600 hover:text-gray-300 transition-colors">
                    {isExp ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <button onClick={() => setModal({ type: 'edit', client: c, form: c })} className="btn-secondary py-1 px-2"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(c.id)} className="btn-danger py-1 px-2"><Trash2 size={13} /></button>
                </div>
              </div>
              {isExp && c.projects?.length > 0 && (
                <div className="px-4 pb-4" style={{ borderTop: '1px solid #212121' }}>
                  <p className="text-xs text-gray-600 uppercase tracking-wide mt-3 mb-2">История проектов</p>
                  <div className="space-y-1.5">
                    {c.projects.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg text-sm"
                        style={{ background: '#0F0F0F', border: '1px solid #212121' }}>
                        <span className="text-gray-300">{p.name}</span>
                        <span className="text-gray-500 font-mono">{formatMoney(p.budget)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal open={modal?.type === 'create'} onClose={() => setModal(null)} title="Новый клиент">
        <ClientForm onSave={handleCreate} onCancel={() => setModal(null)} />
      </Modal>
      <Modal open={modal?.type === 'edit'} onClose={() => setModal(null)} title="Редактировать клиента">
        {modal?.type === 'edit' && <ClientForm initial={modal.form} onSave={handleEdit} onCancel={() => setModal(null)} />}
      </Modal>
    </div>
  );
}
