import React, { useEffect, useState, useCallback } from 'react';
import { financeApi, projectsApi } from '../api/client';
import { formatDate, formatDateShort, formatMoney, EXPENSE_CATEGORY } from '../utils/helpers';
import Modal from '../components/Modal';
import { Wallet, Plus, Trash2, TrendingUp, TrendingDown, Scale, ShieldAlert, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useSync } from '../hooks/useSync';
import { MoneyInput } from '../components/FormInputs';

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function TransactionForm({ projects, onSave, onCancel }) {
  const [form, setForm] = useState({ projectId: '', type: 'income', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = async (e) => { e.preventDefault(); setSaving(true); try { await onSave(form); } catch { setSaving(false); } };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Тип</label>
        <div className="flex gap-2">
          {[['income','💰 Доход'],['expense','💸 Расход']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => set('type', v)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${form.type === v
                ? (v === 'income' ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-red-500/20 border-red-500/50 text-red-400')
                : 'border-white/10 text-gray-500 hover:border-white/20'}`}
              style={form.type !== v ? { background: '#0F0F0F' } : {}}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Проект</label>
        <select className="input" value={form.projectId} onChange={e => set('projectId', e.target.value)}>
          <option value="">Без проекта</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div><label className="label">Сумма (₸) *</label><MoneyInput required value={form.amount} onChange={v => set('amount', v)} placeholder="100 000" /></div>
      <div><label className="label">Описание</label><input className="input" value={form.description} onChange={e => set('description', e.target.value)} /></div>
      <div><label className="label">Дата</label><input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} /></div>
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary">Отмена</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Сохранение...' : 'Добавить'}</button>
      </div>
    </form>
  );
}

function ExpenseForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ category: 'ads', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = async (e) => { e.preventDefault(); setSaving(true); try { await onSave(form); } catch { setSaving(false); } };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Категория</label>
        <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
          {Object.entries(EXPENSE_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div><label className="label">Сумма (₸) *</label><MoneyInput required value={form.amount} onChange={v => set('amount', v)} placeholder="100 000" /></div>
      <div><label className="label">Описание</label><input className="input" value={form.description} onChange={e => set('description', e.target.value)} /></div>
      <div><label className="label">Дата</label><input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} /></div>
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary">Отмена</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Сохранение...' : 'Добавить'}</button>
      </div>
    </form>
  );
}

function PayTaxForm({ tax, onSave, onCancel }) {
  const [form, setForm] = useState({ paid: String(tax.amount), paidAt: new Date().toISOString().split('T')[0], notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await onSave({ ...form, status: 'paid' }); } catch { setSaving(false); }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-400">Период: <span className="text-white font-medium">{tax.label}</span></p>
      <p className="text-sm text-gray-400">Начислено: <span className="text-yellow-400 font-mono font-semibold">{formatMoney(tax.amount)}</span></p>
      <div><label className="label">Оплачено (₸)</label><MoneyInput required value={form.paid} onChange={v => set('paid', v)} /></div>
      <div><label className="label">Дата оплаты</label><input type="date" className="input" value={form.paidAt} onChange={e => set('paidAt', e.target.value)} /></div>
      <div><label className="label">Заметка</label><input className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Чек, реквизиты..." /></div>
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary">Отмена</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? '...' : 'Отметить оплаченным'}</button>
      </div>
    </form>
  );
}

function TaxCard({ tax, onPay, onDelete }) {
  const now = new Date();
  const due = new Date(tax.dueDate);
  const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  const isOverdue = daysLeft < 0 && tax.status !== 'paid';
  const isUrgent  = daysLeft >= 0 && daysLeft <= 14 && tax.status !== 'paid';

  let borderColor = '#212121';
  if (tax.status === 'paid') borderColor = 'rgba(74,222,128,0.25)';
  else if (isOverdue) borderColor = 'rgba(239,68,68,0.4)';
  else if (isUrgent)  borderColor = 'rgba(245,158,11,0.4)';

  return (
    <div className="p-4 rounded-xl flex items-center gap-4" style={{ background: '#0F0F0F', border: `1px solid ${borderColor}` }}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        tax.status === 'paid' ? 'bg-green-500/20' : isOverdue ? 'bg-red-500/20' : isUrgent ? 'bg-yellow-500/20' : 'bg-white/5'
      }`}>
        {tax.status === 'paid'
          ? <CheckCircle2 size={18} className="text-green-400" />
          : isOverdue ? <AlertTriangle size={18} className="text-red-400" />
          : <Clock size={18} className="text-yellow-400" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-white text-sm">{tax.label}</p>
          <span className={`badge ${tax.status === 'paid'
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : isOverdue ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
            {tax.status === 'paid' ? 'Оплачен' : isOverdue ? 'Просрочен' : 'Не оплачен'}
          </span>
        </div>
        <div className="flex gap-3 mt-1 text-xs flex-wrap">
          <span className="text-gray-600">Дедлайн: <span className="text-gray-400 font-mono">{formatDate(tax.dueDate)}</span></span>
          {tax.status !== 'paid' && (
            <span className={isOverdue ? 'text-red-400 font-mono' : isUrgent ? 'text-yellow-400 font-mono' : 'text-gray-600 font-mono'}>
              {isOverdue ? `просрочен на ${Math.abs(daysLeft)}д` : `осталось ${daysLeft}д`}
            </span>
          )}
          {tax.status === 'paid' && tax.paidAt && (
            <span className="text-green-400">Оплачен {formatDate(tax.paidAt)}</span>
          )}
          {tax.notes && <span className="text-gray-700 italic">{tax.notes}</span>}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="font-mono font-bold text-sm text-white">{formatMoney(tax.amount)}</p>
        {tax.status === 'paid' && tax.paid > 0 && (
          <p className="text-xs text-green-400 font-mono">оплачено {formatMoney(tax.paid)}</p>
        )}
      </div>

      <div className="flex gap-1.5 shrink-0">
        {tax.status !== 'paid' && (
          <button onClick={() => onPay(tax)} className="btn-primary py-1 px-2 text-xs">✓ Оплатить</button>
        )}
        {tax.status === 'paid' && (
          <button onClick={() => onDelete(tax.id)} className="text-gray-700 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
        )}
        {tax.status !== 'paid' && (
          <button onClick={() => onDelete(tax.id)} className="text-gray-700 hover:text-red-400 transition-colors ml-1"><Trash2 size={13} /></button>
        )}
      </div>
    </div>
  );
}

export default function FinancePage() {
  const now = new Date();
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('transactions');
  const [modal, setModal] = useState(null);
  const [tick, setTick] = useState(0);
  const [genYear, setGenYear] = useState(now.getFullYear());
  const [genHalf, setGenHalf] = useState(now.getMonth() < 6 ? 1 : 2);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');

  const load = () => {
    Promise.all([financeApi.getTransactions(), financeApi.getExpenses(), projectsApi.getAll(), financeApi.getTaxes()])
      .then(([t, e, p, tx]) => { setTransactions(t.data); setExpenses(e.data); setProjects(p.data); setTaxes(tx.data); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [tick]);
  useSync(useCallback(() => setTick(t => t + 1), []));

  const handleAddTx   = async (form) => { await financeApi.createTransaction(form); load(); setModal(null); };
  const handleDelTx   = async (id)  => { if (!confirm('Удалить?')) return; await financeApi.deleteTransaction(id); load(); };
  const handleAddExp  = async (form) => { await financeApi.createExpense(form); load(); setModal(null); };
  const handleDelExp  = async (id)  => { if (!confirm('Удалить?')) return; await financeApi.deleteExpense(id); load(); };
  const handlePayTax  = async (form) => { await financeApi.patchTax(modal.tax.id, form); load(); setModal(null); };
  const handleDelTax  = async (id)  => { if (!confirm('Удалить запись о налоге?')) return; await financeApi.deleteTax(id); load(); };

  const handleGenerate = async () => {
    setGenLoading(true); setGenError('');
    try {
      await financeApi.generateTax({ year: genYear, half: genHalf });
      load();
    } catch (e) {
      setGenError(e.response?.data?.error || 'Ошибка');
    } finally {
      setGenLoading(false);
    }
  };

  const totalTxIncome    = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalPrepayments = projects.reduce((s, p) => s + (p.prepayment || 0), 0);
  const totalIncome      = totalTxIncome + totalPrepayments;
  const totalExpTx       = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalExpenses    = expenses.reduce((s, e) => s + e.amount, 0);
  const balance          = totalIncome - totalExpenses - totalExpTx;
  const unpaidTaxTotal   = taxes.filter(t => t.status !== 'paid').reduce((s, t) => s + t.amount, 0);

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><Wallet size={24} className="text-primary-500" /> Финансы</h1>
          <p className="page-sub">Транзакции, расходы и налоги</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setModal({ type: 'expense' })} className="btn-secondary"><Plus size={15} /> Расход</button>
          <button onClick={() => setModal({ type: 'transaction' })} className="btn-primary"><Plus size={15} /> Транзакция</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: TrendingUp,   label: 'Общий доход',    value: formatMoney(totalIncome),  sub: `Транзакции ${formatMoney(totalTxIncome)} + предоплаты ${formatMoney(totalPrepayments)}`, color: 'text-green-400', bg: 'rgba(74,222,128,0.1)' },
          { icon: TrendingDown, label: 'Расходы',         value: formatMoney(totalExpenses + totalExpTx), color: 'text-red-400', bg: 'rgba(239,68,68,0.1)' },
          { icon: ShieldAlert,  label: 'Налоги к уплате', value: formatMoney(unpaidTaxTotal), sub: unpaidTaxTotal > 0 ? 'Не забудь оплатить!' : 'Всё уплачено ✓', color: unpaidTaxTotal > 0 ? 'text-yellow-400' : 'text-green-400', bg: 'rgba(245,158,11,0.1)' },
          { icon: Scale,        label: 'Баланс',           value: formatMoney(balance), color: balance >= 0 ? 'text-white' : 'text-red-400', bg: 'rgba(118,185,0,0.1)' },
        ].map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                <p className={`text-2xl font-bold font-mono mt-2 ${color}`}>{value}</p>
                {sub && <p className="text-xs text-gray-700 mt-1">{sub}</p>}
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={20} className={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#0F0F0F', border: '1px solid #212121' }}>
        {[
          ['transactions', `Транзакции (${transactions.length})`],
          ['expenses',     `Расходы (${expenses.length})`],
          ['taxes',        `Налоги${taxes.filter(t=>t.status!=='paid').length > 0 ? ` 🔴 ${taxes.filter(t=>t.status!=='paid').length}` : ` (${taxes.length})`}`],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === k ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'transactions' && (
        <div className="card p-0 overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-16 text-center text-gray-600">Транзакций пока нет</div>
          ) : (
            <table className="w-full table-dark">
              <thead><tr><th>Тип</th><th>Описание</th><th>Проект</th><th>Дата</th><th className="text-right">Сумма</th><th></th></tr></thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td><span className={`badge ${t.type === 'income' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>{t.type === 'income' ? 'Доход' : 'Расход'}</span></td>
                    <td className="text-gray-300">{t.description || '—'}</td>
                    <td className="text-gray-500">{t.project?.name || '—'}</td>
                    <td>
                      <p className="font-mono text-gray-500">{formatDate(t.date)}</p>
                      <p className="text-xs text-gray-700">{formatDateShort(t.date)}</p>
                    </td>
                    <td className={`text-right font-mono font-semibold ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}
                    </td>
                    <td><button onClick={() => handleDelTx(t.id)} className="text-gray-700 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'expenses' && (
        <div className="card p-0 overflow-hidden">
          {expenses.length === 0 ? (
            <div className="p-16 text-center text-gray-600">Расходов пока нет</div>
          ) : (
            <table className="w-full table-dark">
              <thead><tr><th>Категория</th><th>Описание</th><th>Дата</th><th className="text-right">Сумма</th><th></th></tr></thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td><span className="badge bg-white/5 text-gray-400 border border-white/10">{EXPENSE_CATEGORY[e.category] || e.category}</span></td>
                    <td className="text-gray-300">{e.description || '—'}</td>
                    <td>
                      <p className="font-mono text-gray-500">{formatDate(e.date)}</p>
                      <p className="text-xs text-gray-700">{formatDateShort(e.date)}</p>
                    </td>
                    <td className="text-right font-mono font-semibold text-red-400">−{formatMoney(e.amount)}</td>
                    <td><button onClick={() => handleDelExp(e.id)} className="text-gray-700 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'taxes' && (
        <div className="space-y-4">
          {/* Generate block */}
          <div className="card space-y-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <ShieldAlert size={15} className="text-yellow-400" /> Начислить налог за период
            </h3>
            <p className="text-xs text-gray-600">Упрощённая декларация: Н1 (янв–июн) → срок 25 августа · Н2 (июл–дек) → срок 25 февраля</p>
            <div className="flex gap-3 items-end flex-wrap">
              <div>
                <label className="label">Год</label>
                <select className="input w-24" value={genYear} onChange={e => setGenYear(Number(e.target.value))}>
                  {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Полугодие</label>
                <select className="input w-44" value={genHalf} onChange={e => setGenHalf(Number(e.target.value))}>
                  <option value={1}>Н1 — Январь–Июнь</option>
                  <option value={2}>Н2 — Июль–Декабрь</option>
                </select>
              </div>
              <button onClick={handleGenerate} disabled={genLoading} className="btn-primary">
                {genLoading ? 'Считаю...' : '⚡ Рассчитать'}
              </button>
            </div>
            {genError && <p className="text-xs text-red-400">{genError}</p>}
            <p className="text-xs text-gray-700">Сумма считается автоматически: (доход за период) × ставка налога из настроек</p>
          </div>

          {taxes.length === 0 ? (
            <div className="card text-center py-12 text-gray-600">
              <ShieldAlert size={36} className="text-gray-700 mx-auto mb-3" />
              <p>Нет записей о налогах — нажми «Рассчитать» выше</p>
            </div>
          ) : (
            <div className="space-y-2">
              {taxes.map(t => (
                <TaxCard key={t.id} tax={t}
                  onPay={tax => setModal({ type: 'pay-tax', tax })}
                  onDelete={handleDelTax}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={modal?.type === 'transaction'} onClose={() => setModal(null)} title="Новая транзакция">
        <TransactionForm projects={projects} onSave={handleAddTx} onCancel={() => setModal(null)} />
      </Modal>
      <Modal open={modal?.type === 'expense'} onClose={() => setModal(null)} title="Новый расход">
        <ExpenseForm onSave={handleAddExp} onCancel={() => setModal(null)} />
      </Modal>
      <Modal open={modal?.type === 'pay-tax'} onClose={() => setModal(null)} title="Оплата налога">
        {modal?.type === 'pay-tax' && <PayTaxForm tax={modal.tax} onSave={handlePayTax} onCancel={() => setModal(null)} />}
      </Modal>
    </div>
  );
}
