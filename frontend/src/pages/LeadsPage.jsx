import React, { useEffect, useState, useCallback } from 'react';
import { leadsApi } from '../api/client';
import { formatDate, LEAD_STATUS } from '../utils/helpers';
import Modal from '../components/Modal';
import { Target, Plus, Pencil, Trash2, ArrowRightCircle, LayoutList, Columns3 } from 'lucide-react';
import { useSync } from '../hooks/useSync';
import { PhoneInput } from '../components/FormInputs';

const emptyForm = { name: '', phone: '', email: '', company: '', status: 'thinking', tzAuthor: '', prepayment: '', source: '', sourceDetail: '', notes: '', lastContactDate: '', followUpDate: '' };

const SOURCE_LABELS = { ads: '📣 Реклама', olx: '🛒 OLX', manager: '👤 Нашёл менеджер', referral: '🗣 Сарафанное радио' };

const toDateInput = (d) => d.toISOString().split('T')[0];

const LEAD_COLUMNS = [
  { key: 'thinking',       label: 'Обдумывает',     emoji: '🤔' },
  { key: 'needs_tz',       label: 'Нужно ТЗ',        emoji: '📋' },
  { key: 'waiting_prepay', label: 'Ждёт предоплату', emoji: '💳' },
  { key: 'rejected',       label: 'Отказ',           emoji: '❌' },
];

function LeadForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || emptyForm);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = async (e) => { e.preventDefault(); setSaving(true); try { await onSave(form); } catch { setSaving(false); } };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className="label">Имя / Название *</label><input className="input" required value={form.name} onChange={e => set('name', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">Телефон</label><PhoneInput value={form.phone} onChange={v => set('phone', v)} /></div>
        <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} /></div>
      </div>
      <div><label className="label">Компания</label><input className="input" value={form.company} onChange={e => set('company', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Статус</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(LEAD_STATUS).filter(([k]) => k !== 'converted').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Кто составляет ТЗ</label>
          <select className="input" value={form.tzAuthor} onChange={e => set('tzAuthor', e.target.value)}>
            <option value="">— не выбрано —</option>
            <option value="studio">Мы (студия)</option>
            <option value="client">Заказчик</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Предоплата</label>
          <input type="number" className="input" placeholder="0" value={form.prepayment} onChange={e => set('prepayment', e.target.value)} />
        </div>
        <div>
          <label className="label">Последний контакт</label>
          <div className="flex gap-1.5">
            <input type="date" className="input flex-1" value={form.lastContactDate} onChange={e => set('lastContactDate', e.target.value)} />
            <button type="button" onClick={() => set('lastContactDate', toDateInput(new Date()))} className="btn-secondary px-2.5 text-xs whitespace-nowrap">Сегодня</button>
            <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 1); set('lastContactDate', toDateInput(d)); }} className="btn-secondary px-2.5 text-xs whitespace-nowrap">Вчера</button>
          </div>
        </div>
      </div>
      <div>
        <label className="label">Откуда пришёл</label>
        <div className="flex gap-2">
          <select className="input flex-1" value={form.source} onChange={e => set('source', e.target.value)}>
            <option value="">— не выбрано —</option>
            <option value="ads">📣 Реклама</option>
            <option value="olx">🛒 OLX</option>
            <option value="manager">👤 Нашёл менеджер</option>
            <option value="referral">🗣 Сарафанное радио</option>
          </select>
          {form.source === 'manager' && (
            <select className="input w-36" value={form.sourceDetail} onChange={e => set('sourceDetail', e.target.value)}>
              <option value="">— кто —</option>
              <option value="Артур">Артур</option>
              <option value="Дмитрий">Дмитрий</option>
              <option value="Радион">Радион</option>
            </select>
          )}
          {form.source === 'referral' && (
            <input className="input w-40" placeholder="Имя заказчика" value={form.sourceDetail} onChange={e => set('sourceDetail', e.target.value)} />
          )}
        </div>
      </div>
      <div>
        <label className="label">Когда связаться</label>
        <div className="flex gap-1.5">
          <input type="date" className="input flex-1" value={form.followUpDate} onChange={e => set('followUpDate', e.target.value)} />
          {[1, 2, 3, 5, 10].map(n => (
            <button key={n} type="button"
              onClick={() => { const d = new Date(); d.setDate(d.getDate() + n); set('followUpDate', toDateInput(d)); }}
              className="btn-secondary px-2 text-xs whitespace-nowrap">+{n}</button>
          ))}
        </div>
      </div>
      <div><label className="label">Заметки</label><textarea className="input resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary">Отмена</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Сохранение...' : 'Сохранить'}</button>
      </div>
    </form>
  );
}

function LeadCard({ lead, onEdit, onDelete, onConvert }) {
  return (
    <div className="rounded-xl p-3 group" style={{ background: '#1C1C1C', border: '1px solid #212121' }}>
      <p className="font-medium text-sm text-white">{lead.name}</p>
      {lead.company && <p className="text-xs text-gray-600 mt-0.5">{lead.company}</p>}
      {lead.phone && <p className="text-xs text-gray-600 mt-1">📞 {lead.phone}</p>}
      {lead.lastContactDate && <p className="text-xs text-gray-600 mt-0.5">🕐 {formatDate(lead.lastContactDate)}</p>}
      {lead.followUpDate && (() => {
        const due = new Date(lead.followUpDate);
        const overdue = due < new Date();
        return <p className={`text-xs mt-0.5 font-medium ${overdue ? 'text-red-400' : 'text-yellow-500'}`}>📅 {overdue ? 'Просрочено: ' : 'Связаться: '}{formatDate(lead.followUpDate)}</p>;
      })()}
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {lead.source && <span className="badge bg-white/5 text-gray-500 border border-white/10 text-xs">{SOURCE_LABELS[lead.source]}{lead.sourceDetail ? `: ${lead.sourceDetail}` : ''}</span>}
        {lead.tzAuthor && <span className="badge bg-white/5 text-gray-500 border border-white/10 text-xs">📋 ТЗ: {lead.tzAuthor === 'studio' ? 'Мы' : 'Заказчик'}</span>}
        {lead.prepayment > 0 && <span className="badge bg-white/5 text-gray-500 border border-white/10 text-xs">💰 {lead.prepayment.toLocaleString('ru')} ₸</span>}
      </div>
      {lead.notes && <p className="text-xs text-gray-600 mt-1 line-clamp-2 italic">{lead.notes}</p>}
      <div className="flex gap-2 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="text-xs text-gray-500 hover:text-primary-400 flex items-center gap-1"><Pencil size={11} /> Изменить</button>
        <span className="text-gray-700">·</span>
        <button onClick={onConvert} className="text-xs text-green-500 hover:text-green-400 flex items-center gap-1"><ArrowRightCircle size={11} /> В клиенты</button>
        <span className="text-gray-700">·</span>
        <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1"><Trash2 size={11} /></button>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [view, setView] = useState('kanban');
  const [tick, setTick] = useState(0);

  const load = () => leadsApi.getAll().then(r => setLeads(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, [tick]);
  useSync(useCallback(() => setTick(t => t + 1), []));

  const handleCreate  = async (form) => { await leadsApi.create(form); load(); setModal(null); };
  const handleEdit    = async (form) => { await leadsApi.update(modal.lead.id, form); load(); setModal(null); };
  const handleDelete  = async (id)  => { if (!confirm('Удалить лид?')) return; await leadsApi.delete(id); load(); };
  const handleConvert = async (lead) => {
    if (!confirm(`Перевести "${lead.name}" в клиенты?`)) return;
    await leadsApi.convert(lead.id); load();
  };

  const active = leads.filter(l => l.status !== 'converted');

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><Target size={24} className="text-primary-500" /> Лиды</h1>
          <p className="page-sub">{active.length} активных</p>
        </div>
        <div className="flex gap-3">
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #2A2A2A' }}>
            <button onClick={() => setView('kanban')} className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${view === 'kanban' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-300'}`} style={view !== 'kanban' ? { background: '#0F0F0F' } : {}}>
              <Columns3 size={14} /> Канбан
            </button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${view === 'list' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-300'}`} style={view !== 'list' ? { background: '#0F0F0F' } : {}}>
              <LayoutList size={14} /> Список
            </button>
          </div>
          <button onClick={() => setModal({ type: 'create' })} className="btn-primary"><Plus size={16} /> Новый лид</button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {LEAD_COLUMNS.map(col => {
            const cols = leads.filter(l => l.status === col.key);
            return (
              <div key={col.key} className="rounded-xl p-3" style={{ background: '#0F0F0F', border: '1px solid #212121' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                    <span>{col.emoji}</span> {col.label}
                  </h3>
                  <span className="badge bg-white/5 text-gray-500 border border-white/10 font-mono">{cols.length}</span>
                </div>
                <div className="space-y-2">
                  {cols.map(lead => (
                    <LeadCard key={lead.id} lead={lead}
                      onEdit={() => setModal({ type: 'edit', lead, form: { ...lead, lastContactDate: lead.lastContactDate?.split('T')[0] || '' } })}
                      onDelete={() => handleDelete(lead.id)}
                      onConvert={() => handleConvert(lead)}
                    />
                  ))}
                  {cols.length === 0 && <p className="text-xs text-gray-700 text-center py-3">Пусто</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full table-dark">
            <thead><tr>
              <th>Имя / Компания</th><th>Контакты</th><th>Статус</th><th>Контакт</th><th className="text-right">Действия</th>
            </tr></thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id}>
                  <td><p className="font-medium text-white">{lead.name}</p>{lead.company && <p className="text-xs text-gray-600">{lead.company}</p>}</td>
                  <td>{lead.phone && <p>{lead.phone}</p>}{lead.email && <p className="text-gray-500">{lead.email}</p>}</td>
                  <td><span className={`badge ${LEAD_STATUS[lead.status]?.color}`}>{LEAD_STATUS[lead.status]?.label}</span></td>
                  <td className="font-mono">{formatDate(lead.lastContactDate)}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => setModal({ type: 'edit', lead, form: { ...lead, lastContactDate: lead.lastContactDate?.split('T')[0] || '' } })} className="btn-secondary py-1 px-2 text-xs"><Pencil size={12} /></button>
                      {lead.status !== 'converted' && (
                        <button onClick={() => handleConvert(lead)} className="btn-primary py-1 px-2 text-xs"><ArrowRightCircle size={12} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal?.type === 'create'} onClose={() => setModal(null)} title="Новый лид">
        <LeadForm onSave={handleCreate} onCancel={() => setModal(null)} />
      </Modal>
      <Modal open={modal?.type === 'edit'} onClose={() => setModal(null)} title="Редактировать лид">
        {modal?.type === 'edit' && <LeadForm initial={modal.form} onSave={handleEdit} onCancel={() => setModal(null)} />}
      </Modal>
    </div>
  );
}
