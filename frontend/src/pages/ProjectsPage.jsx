import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { projectsApi, clientsApi, employeesApi } from '../api/client';
import { formatDate, formatDateShort, formatMoney, daysUntil, PROJECT_STATUS, PROJECT_PRIORITY, PROJECT_STAGE } from '../utils/helpers';
import Modal from '../components/Modal';
import { Plus, Pencil, Trash2, FolderKanban, Search, Wallet, X } from 'lucide-react';
import { useSync } from '../hooks/useSync';
import { MoneyInput } from '../components/FormInputs';

const emptyForm = {
  name: '', clientId: '', status: 'development', priority: 'medium',
  startDate: '', deadline: '', budget: '', extraCost: '', prepayment: '', marketingCost: '', docLink: '', notes: '', stage: 'design', members: [],
  paymentStages: [
    { description: 'Дизайн в Figma', amount: '' },
    { description: 'Готовый UI (APK)', amount: '' },
    { description: 'Полноценное приложение с бекендом', amount: '' },
  ],
};


function QuickSelect({ value, options, colorMap, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`badge cursor-pointer hover:opacity-80 transition-opacity select-none ${colorMap[value]?.color || 'bg-gray-700 text-gray-300'}`}>
        {colorMap[value]?.label || value} ▾
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 rounded-xl shadow-2xl py-1 min-w-max"
          style={{ background: '#0F0F0F', border: '1px solid #2A2A2A' }}>
          {Object.entries(options).map(([k, v]) => (
            <button key={k} type="button" onClick={() => { onSelect(k); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 flex items-center gap-2 transition-colors">
              <span className={`badge ${v.color}`}>{v.label}</span>
              {k === value && <span className="text-primary-500">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StageProgress({ stage, completed }) {
  const stages = ['design', 'frontend', 'fullstack'];
  const labels = ['Дизайн', 'UI', 'Бэкенд'];
  const current = completed ? 3 : stages.indexOf(stage);
  return (
    <div className="flex items-center gap-1">
      {stages.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`text-xs px-2 py-0.5 rounded-full font-medium transition-all ${
            completed || i < current  ? 'bg-green-500/20 text-green-400' :
            i === current ? 'bg-primary-600/30 text-primary-400 ring-1 ring-primary-500/50' :
            'bg-white/5 text-gray-600'
          }`}>{i + 1} {labels[i]}</div>
          {i < 2 && <div className={`w-3 h-px ${completed || i < current ? 'bg-green-500/50' : 'bg-white/10'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function ProjectForm({ initial, clients, employees, onSave, onCancel }) {
  const [form, setForm] = useState(initial || emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addMember = () => {
    const emp = employees.find(e => !form.members.some(m => m.employeeId === e.id));
    if (!emp) return;
    setForm(p => ({ ...p, members: [...p.members, { employeeId: emp.id, percent: emp.defaultPercent }] }));
  };
  const updateMember = (idx, k, v) => {
    const upd = [...form.members]; upd[idx] = { ...upd[idx], [k]: v };
    setForm(p => ({ ...p, members: upd }));
  };
  const removeMember = (idx) => setForm(p => ({ ...p, members: p.members.filter((_, i) => i !== idx) }));
  const totalPercent = form.members.reduce((s, m) => s + parseFloat(m.percent || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try { await onSave(form); } catch (err) { setError(err.response?.data?.error || 'Ошибка'); setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="label">Название проекта *</label>
          <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Клиент</label>
          <select className="input" value={form.clientId} onChange={e => set('clientId', e.target.value)}>
            <option value="">Без клиента</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Статус</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Приоритет</label>
          <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
            {Object.entries(PROJECT_PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Дата начала</label>
          <input type="date" className="input" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        </div>
        <div>
          <label className="label">Дедлайн</label>
          <input type="date" className="input" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
        </div>
        <div>
          <label className="label">Бюджет (₸)</label>
          <MoneyInput value={form.budget} onChange={v => set('budget', v)} placeholder="1 500 000" />
        </div>
        <div>
          <label className="label">Предоплата (₸)</label>
          <MoneyInput value={form.prepayment} onChange={v => set('prepayment', v)} placeholder="500 000" />
        </div>
        <div>
          <label className="label">Доп. работы (₸)</label>
          <MoneyInput value={form.extraCost} onChange={v => set('extraCost', v)} placeholder="0" />
          <p className="text-xs text-gray-600 mt-1">Сверх бюджета — суммируются при расчёте зарплат</p>
        </div>
        <div>
          <label className="label">Затраты на привлечение (₸)</label>
          <MoneyInput value={form.marketingCost} onChange={v => set('marketingCost', v)} placeholder="0" />
          <p className="text-xs text-gray-600 mt-1">Реклама, OLX, другие каналы — для расчёта ROMI</p>
        </div>
        <div className="md:col-span-2">
          <label className="label">Этап разработки</label>
          <div className="flex gap-2 flex-wrap">
            {[['design','🎨','UI Дизайн'],['frontend','💻','Реализация UI'],['fullstack','🚀','Полная разработка']].map(([k,em,lb]) => (
              <button key={k} type="button" onClick={() => set('stage', k)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  form.stage === k
                    ? 'bg-primary-600/20 border border-primary-500/50 text-primary-400'
                    : 'border border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300'
                }`} style={form.stage !== k ? { background: '#0F0F0F' } : {}}>
                <span>{em}</span> {lb}
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="label">Ссылка на ТЗ</label>
          <input type="url" className="input" value={form.docLink} onChange={e => set('docLink', e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="label">Заметки</label>
          <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">
            Команда {totalPercent > 0 && <span className={`ml-2 font-mono ${totalPercent > 100 ? 'text-red-400' : 'text-gray-500'}`}>({totalPercent}%)</span>}
          </label>
          <button type="button" onClick={addMember} className="text-primary-500 text-xs hover:text-primary-400 flex items-center gap-1">
            <Plus size={12} /> Добавить
          </button>
        </div>
        <div className="space-y-2">
          {form.members.map((m, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: '#0F0F0F', border: '1px solid #2A2A2A' }}>
              <select className="input flex-1" value={m.employeeId} onChange={e => updateMember(idx, 'employeeId', Number(e.target.value))}>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <div className="flex items-center gap-1 w-20">
                <input type="number" min="0" max="100" className="input text-center font-mono"
                  value={m.percent} onChange={e => updateMember(idx, 'percent', e.target.value)} />
                <span className="text-gray-500 text-sm">%</span>
              </div>
              <button type="button" onClick={() => removeMember(idx)} className="text-gray-600 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment stages */}
      <div>
        <label className="label">График платежей (необязательно)</label>
        <div className="space-y-2">
          {form.paymentStages.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-xs text-gray-600 w-14 shrink-0">Этап {i + 1}</span>
              <input className="input flex-1 text-sm" placeholder={s.description}
                value={s.description}
                onChange={e => {
                  const stages = [...form.paymentStages];
                  stages[i] = { ...stages[i], description: e.target.value };
                  set('paymentStages', stages);
                }} />
              <div className="w-36">
                <MoneyInput value={s.amount} placeholder="0"
                  onChange={v => {
                    const stages = [...form.paymentStages];
                    stages[i] = { ...stages[i], amount: v };
                    set('paymentStages', stages);
                  }} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-700 mt-1.5">Заполни суммы — этапы появятся в карточке проекта</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary">Отмена</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Сохранение...' : 'Сохранить'}</button>
      </div>
    </form>
  );
}

function QuickPaymentForm({ projectId, projectName, onSave, onCancel }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!parseFloat(amount)) return;
    setSaving(true);
    try {
      await projectsApi.addPayment(projectId, {
        amount,
        description: description || `Платёж ${new Date(date).toLocaleDateString('ru')}`,
        status: 'paid',
        paidAt: new Date(date).toISOString(),
      });
      onSave();
    } catch {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} onClick={e => e.stopPropagation()}
      className="mt-3 p-3 rounded-xl space-y-2.5"
      style={{ background: '#0F0F0F', border: '1px solid #2A2A2A' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
          <Wallet size={12} className="text-primary-500" /> Платёж в проект «{projectName}»
        </p>
        <button type="button" onClick={onCancel} className="text-gray-600 hover:text-white"><X size={13} /></button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Сумма</label>
          <MoneyInput value={amount} onChange={setAmount} placeholder="500 000" required />
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Дата</label>
          <input type="date" className="input text-sm py-1.5" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Описание</label>
          <input className="input text-sm py-1.5" placeholder="(необязательно)" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary py-1 px-3 text-xs">Отмена</button>
        <button type="submit" disabled={saving || !parseFloat(amount)} className="btn-primary py-1 px-3 text-xs">
          {saving ? 'Сохранение...' : 'Зафиксировать'}
        </button>
      </div>
    </form>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [tick, setTick] = useState(0);
  const [quickPayId, setQuickPayId] = useState(null);

  const load = () => {
    Promise.all([projectsApi.getAll(), clientsApi.getAll(), employeesApi.getAll()])
      .then(([p, c, e]) => { setProjects(p.data); setClients(c.data); setEmployees(e.data); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [tick]);
  useSync(useCallback(() => setTick(t => t + 1), []));

  const handleCreate = async (form) => { await projectsApi.create(form); load(); setModal(null); };
  const handleEdit   = async (form) => { await projectsApi.update(modal.project.id, form); load(); setModal(null); };
  const handleDelete = async (id)  => { if (!confirm('Удалить проект?')) return; await projectsApi.delete(id); load(); };
  const handleQuickPatch = async (id, data) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    await projectsApi.patch(id, data);
  };

  const filtered = projects.filter(p => {
    const q = search.toLowerCase();
    return (!q || p.name.toLowerCase().includes(q) || p.client?.name?.toLowerCase().includes(q))
      && (!filterStatus || p.status === filterStatus);
  });

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><FolderKanban size={24} className="text-primary-500" /> Проекты</h1>
          <p className="page-sub">{projects.length} проектов в базе</p>
        </div>
        <button onClick={() => setModal({ type: 'create' })} className="btn-primary"><Plus size={16} /> Новый проект</button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input className="input pl-8 w-64" placeholder="Поиск проектов..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Все статусы</option>
          {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && (
          <div className="card text-center py-16">
            <FolderKanban size={40} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">Проектов не найдено</p>
            <button onClick={() => setModal({ type: 'create' })} className="btn-primary mt-4 mx-auto"><Plus size={15} /> Создать первый</button>
          </div>
        )}
        {filtered.map(p => {
          const days = daysUntil(p.deadline);
          const balance = (p.budget + (p.extraCost || 0)) - p.prepayment;
          const isOverdue = days !== null && days < 0 && p.status !== 'completed';
          const leftColor = isOverdue ? '#ef4444' : p.priority === 'urgent' ? '#f97316' : p.priority === 'high' ? '#fb923c' : '#76B900';
          return (
            <div key={p.id} className="card p-0 overflow-hidden">
              <div className="flex" style={{ borderLeft: `3px solid ${leftColor}` }}>
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link to={`/projects/${p.id}`} className="font-semibold text-white hover:text-primary-400 transition-colors">
                          {p.name}
                        </Link>
                        <QuickSelect value={p.status} options={PROJECT_STATUS} colorMap={PROJECT_STATUS}
                          onSelect={v => handleQuickPatch(p.id, { status: v })} />
                        <span className={`badge ${PROJECT_PRIORITY[p.priority]?.color}`}>{PROJECT_PRIORITY[p.priority]?.label}</span>
                      </div>
                      {p.client && <p className="text-xs text-gray-600 mt-0.5">👤 {p.client.name}</p>}

                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        <span>Контракт: <span className="text-gray-300 font-mono font-medium">{formatMoney(p.budget + (p.extraCost || 0))}</span></span>
                        {p.prepayment > 0 && <span>Получено: <span className="text-green-400 font-mono font-medium">{formatMoney(p.prepayment)}</span></span>}
                        {balance > 0 && <span>Остаток: <span className="text-orange-400 font-mono font-medium">{formatMoney(balance)}</span></span>}
                      </div>

                      {(p.startDate || p.deadline) && (
                        <div className="flex gap-4 mt-1 text-xs text-gray-600">
                          {p.startDate && (
                            <span>
                              <span className="font-mono">{formatDate(p.startDate)}</span>
                              <span className="text-gray-700"> · {formatDateShort(p.startDate)}</span>
                            </span>
                          )}
                          {p.deadline && (
                            <span className={isOverdue ? 'text-red-400 font-bold' : ''}>
                              → <span className="font-mono">{formatDate(p.deadline)}</span>
                              <span className={isOverdue ? 'text-red-300 font-normal' : 'text-gray-700'}> · {formatDateShort(p.deadline)}</span>
                              {days !== null && p.status !== 'completed' && ` (${days >= 0 ? days + 'д' : 'просрочен ' + Math.abs(days) + 'д'})`}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <StageProgress stage={p.stage || 'design'} completed={p.status === 'completed'} />
                        {p.status !== 'completed' && (
                          <QuickSelect value={p.stage || 'design'} options={PROJECT_STAGE} colorMap={PROJECT_STAGE}
                            onSelect={v => handleQuickPatch(p.id, { stage: v })} />
                        )}
                      </div>

                      {p.members?.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {p.members.map(m => (
                            <span key={m.id} className="badge bg-white/5 text-gray-400 border border-white/10 font-mono text-xs">
                              {m.employee.name} {m.percent}%
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      {p.status !== 'completed' && (
                        <button
                          onClick={() => setQuickPayId(quickPayId === p.id ? null : p.id)}
                          title="Зафиксировать поступление"
                          className="py-1 px-2.5 rounded-xl text-sm flex items-center gap-1 transition-all"
                          style={quickPayId === p.id
                            ? { background: '#76B900', color: '#000' }
                            : { background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#76B900' }}>
                          <Wallet size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => setModal({ type: 'edit', project: p, form: { ...p, clientId: p.clientId || '',
                          startDate: p.startDate ? p.startDate.split('T')[0] : '',
                          deadline: p.deadline ? p.deadline.split('T')[0] : '',
                          stage: p.stage || 'design',
                          extraCost: p.extraCost || '',
                          marketingCost: p.marketingCost || '',
                          members: p.members?.map(m => ({ employeeId: m.employeeId, percent: m.percent })) || [],
                          paymentStages: p.payments?.length
                            ? p.payments.map(pay => ({ description: pay.description || '', amount: pay.amount || '' }))
                            : [{ description: 'Дизайн в Figma', amount: '' }, { description: 'Готовый UI (APK)', amount: '' }, { description: 'Полноценное приложение с бекендом', amount: '' }],
                        }})}
                        className="btn-secondary py-1 px-2.5"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(p.id)} className="btn-danger py-1 px-2.5"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  {quickPayId === p.id && (
                    <QuickPaymentForm
                      projectId={p.id}
                      projectName={p.name}
                      onSave={() => { setQuickPayId(null); load(); }}
                      onCancel={() => setQuickPayId(null)}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={modal?.type === 'create'} onClose={() => setModal(null)} title="Новый проект" size="lg">
        <ProjectForm clients={clients} employees={employees} onSave={handleCreate} onCancel={() => setModal(null)} />
      </Modal>
      <Modal open={modal?.type === 'edit'} onClose={() => setModal(null)} title="Редактировать проект" size="lg">
        {modal?.type === 'edit' && <ProjectForm initial={modal.form} clients={clients} employees={employees} onSave={handleEdit} onCancel={() => setModal(null)} />}
      </Modal>
    </div>
  );
}
