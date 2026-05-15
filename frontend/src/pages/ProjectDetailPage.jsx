import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectsApi, financeApi } from '../api/client';
import { formatDate, formatDateShort, formatMoney, PROJECT_STATUS, PROJECT_PRIORITY, EMPLOYEE_ROLE, ROLE_COLOR } from '../utils/helpers';
import { ArrowLeft, ExternalLink, Receipt, Users2, Wallet, Plus, Trash2, CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import { MoneyInput } from '../components/FormInputs';

function AddPaymentForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ amount: '', description: '' });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await onSave(form); } catch { setSaving(false); }
  };
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-2 items-end">
      <div className="flex-1">
        <input className="input text-sm" placeholder="Описание (после дизайна, финал...)" value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
      </div>
      <div className="w-36">
        <MoneyInput required value={form.amount} onChange={v => setForm(p => ({ ...p, amount: v }))} placeholder="300 000" />
      </div>
      <button type="submit" disabled={saving} className="btn-primary py-2 px-3 text-sm whitespace-nowrap">
        {saving ? '...' : 'Добавить'}
      </button>
      <button type="button" onClick={onCancel} className="btn-secondary py-2 px-3 text-sm">✕</button>
    </form>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [salary, setSalary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingPayment, setAddingPayment] = useState(false);

  const load = () => Promise.all([projectsApi.getOne(id), financeApi.getSalary(id)])
    .then(([p, s]) => { setProject(p.data); setSalary(s.data); })
    .catch(console.error).finally(() => setLoading(false));

  useEffect(() => { load(); }, [id]);

  const handleAddPayment = async (form) => {
    await projectsApi.addPayment(id, form);
    setAddingPayment(false);
    load();
  };

  const handleTogglePayment = async (paymentId, currentStatus) => {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    if (newStatus === 'paid') {
      if (!confirm('Отметить как полученный? Деньги автоматически распределятся по команде.')) return;
    }
    await projectsApi.patchPayment(id, paymentId, { status: newStatus });
    load();
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm('Удалить этап? Связанные выплаты сотрудникам тоже удалятся.')) return;
    await projectsApi.deletePayment(id, paymentId);
    load();
  };

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!project)  return <div className="card text-center py-20 text-gray-600">Проект не найден</div>;

  const total = project.budget + (project.extraCost || 0);
  const balance = total - project.prepayment;
  const paidPayments   = project.payments?.filter(p => p.status === 'paid') || [];
  const pendingPayments = project.payments?.filter(p => p.status === 'pending') || [];
  const paymentsTotal  = project.payments?.reduce((s, p) => s + p.amount, 0) || 0;
  const paidTotal      = paidPayments.reduce((s, p) => s + p.amount, 0);
  const pendingTotal   = pendingPayments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div>
        <Link to="/projects" className="text-xs text-gray-600 hover:text-primary-400 flex items-center gap-1 mb-3 transition-colors">
          <ArrowLeft size={13} /> Назад к проектам
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="page-title">{project.name}</h1>
          <span className={`badge ${PROJECT_STATUS[project.status]?.color}`}>{PROJECT_STATUS[project.status]?.label}</span>
          <span className={`badge ${PROJECT_PRIORITY[project.priority]?.color}`}>{PROJECT_PRIORITY[project.priority]?.label}</span>
        </div>
        {project.client && <p className="text-gray-500 text-sm mt-1">👤 {project.client.name}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center bg-primary-600/20"><Receipt size={13} className="text-primary-400" /></div>
            Детали проекта
          </h2>
          <div className="space-y-2.5 text-sm">
            {[['Начало', project.startDate], ['Дедлайн', project.deadline]].map(([l, d]) => (
              <div key={l} className="flex justify-between items-center">
                <span className="text-gray-600">{l}</span>
                <div className="text-right">
                  <p className="text-gray-300 font-mono">{formatDate(d)}</p>
                  {d && <p className="text-xs text-gray-600">{formatDateShort(d)}</p>}
                </div>
              </div>
            ))}
            {project.docLink && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Документация</span>
                <a href={project.docLink} target="_blank" rel="noreferrer"
                  className="text-primary-400 hover:text-primary-300 flex items-center gap-1 text-xs">
                  Открыть ТЗ <ExternalLink size={11} />
                </a>
              </div>
            )}
            {project.notes && (
              <div className="pt-2" style={{ borderTop: '1px solid #212121' }}>
                <p className="text-gray-600 text-xs mb-1">Заметки</p>
                <p className="text-gray-400 text-sm">{project.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Finance summary */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center bg-green-500/20"><Wallet size={13} className="text-green-400" /></div>
            Финансы
          </h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Бюджет</span>
              <span className="text-white font-mono font-bold text-base">{formatMoney(project.budget)}</span>
            </div>
            {project.extraCost > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Доп. работы</span>
                <span className="text-primary-400 font-mono">+{formatMoney(project.extraCost)}</span>
              </div>
            )}
            {project.extraCost > 0 && (
              <div className="flex justify-between pt-1" style={{ borderTop: '1px solid #212121' }}>
                <span className="text-gray-400 font-medium">Итого контракт</span>
                <span className="text-white font-mono font-semibold">{formatMoney(total)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Получено</span>
              <span className="text-green-400 font-mono">{formatMoney(project.prepayment)}</span>
            </div>
            <div className="flex justify-between pt-2" style={{ borderTop: '1px solid #212121' }}>
              <span className="text-gray-300 font-medium">Остаток к оплате</span>
              <span className={`font-mono font-semibold ${balance > 0 ? 'text-orange-400' : 'text-green-400'}`}>{formatMoney(balance)}</span>
            </div>
          </div>
          {total > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Оплачено</span>
                <span className="font-mono">{((project.prepayment / total) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#0F0F0F' }}>
                <div className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all"
                  style={{ width: `${Math.min(100, (project.prepayment / total) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Payment schedule */}
        <div className="card md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center bg-blue-500/20"><Receipt size={13} className="text-blue-400" /></div>
              График платежей
              {project.payments?.length > 0 && (
                <span className="badge bg-white/5 text-gray-500 border border-white/10 font-mono">{project.payments.length}</span>
              )}
            </h2>
            {project.status !== 'completed' && (
              <button onClick={() => setAddingPayment(true)} className="text-xs text-primary-500 hover:text-primary-400 flex items-center gap-1">
                <Plus size={12} /> Добавить этап
              </button>
            )}
          </div>

          {project.status === 'completed' && (
            <p className="text-xs text-green-600 py-1">Проект завершён — этапы заблокированы</p>
          )}

          {project.payments?.length === 0 && !addingPayment && project.status !== 'completed' && (
            <p className="text-xs text-gray-700 py-2">Нет этапов — нажмите «Добавить этап» чтобы создать план оплаты</p>
          )}

          <div className="space-y-2">
            {project.payments?.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: '#0F0F0F', border: `1px solid ${p.status === 'paid' ? 'rgba(74,222,128,0.2)' : '#212121'}` }}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${p.status === 'paid' ? 'bg-green-500/20' : 'bg-yellow-500/10'}`}>
                  {p.status === 'paid'
                    ? <CheckCircle2 size={14} className="text-green-400" />
                    : <Clock size={14} className="text-yellow-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200">{p.description || 'Платёж'}</p>
                  {p.paidAt && <p className="text-xs text-gray-600">{formatDate(p.paidAt)} · {formatDateShort(p.paidAt)}</p>}
                </div>
                <span className="font-mono font-semibold text-sm text-white">{formatMoney(p.amount)}</span>
                <span className={`badge shrink-0 ${p.status === 'paid' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>
                  {p.status === 'paid' ? 'Получено' : 'Ожидает'}
                </span>
                {project.status !== 'completed' && (
                  <>
                    <button
                      onClick={() => handleTogglePayment(p.id, p.status)}
                      className={`shrink-0 py-1 px-2 rounded-lg text-xs font-medium transition-colors border ${p.status === 'paid' ? 'text-gray-500 border-white/10 hover:text-orange-400 hover:border-orange-500/30' : 'text-primary-400 border-primary-500/30 hover:bg-primary-600/10'}`}
                      style={{ background: '#0F0F0F' }}
                      title={p.status === 'paid' ? 'Отменить получение' : 'Отметить как полученный'}>
                      {p.status === 'paid' ? <RotateCcw size={13} /> : '✓ Получили'}
                    </button>
                    <button onClick={() => handleDeletePayment(p.id)} className="text-gray-700 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {addingPayment && <AddPaymentForm onSave={handleAddPayment} onCancel={() => setAddingPayment(false)} />}

          {project.payments?.length > 0 && (
            <div className="flex gap-6 pt-2 text-xs" style={{ borderTop: '1px solid #212121' }}>
              <span className="text-gray-600">Всего по этапам: <span className="text-gray-300 font-mono">{formatMoney(paymentsTotal)}</span></span>
              <span className="text-gray-600">Получено: <span className="text-green-400 font-mono">{formatMoney(paidTotal)}</span></span>
              {pendingTotal > 0 && <span className="text-gray-600">Ожидается: <span className="text-yellow-500 font-mono">{formatMoney(pendingTotal)}</span></span>}
            </div>
          )}
        </div>

        {/* Salary breakdown */}
        {salary && (
          <div className="card md:col-span-2 space-y-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center bg-purple-500/20"><Users2 size={13} className="text-purple-400" /></div>
              Распределение по команде
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                [salary.extraCost > 0 ? 'Итого' : 'Бюджет', formatMoney(salary.total ?? salary.budget), 'text-white', '#1A1A1A'],
                [`Налог ${salary.taxRate}%`, `−${formatMoney(salary.tax)}`, 'text-yellow-400', 'rgba(245,158,11,0.1)'],
                ['К распределению', formatMoney(salary.distributable), 'text-primary-400', 'rgba(118,185,0,0.1)'],
                ['Профит студии', formatMoney(salary.companyProfit), 'text-green-400', 'rgba(16,185,129,0.1)'],
              ].map(([l, v, c, bg]) => (
                <div key={l} className="rounded-xl p-3 text-center" style={{ background: bg, border: '1px solid #212121' }}>
                  <p className="text-xs text-gray-600 mb-1">{l}</p>
                  <p className={`font-mono font-bold text-sm ${c}`}>{v}</p>
                </div>
              ))}
            </div>

            {salary.breakdown.length > 0 ? (
              <div className="space-y-2">
                {salary.breakdown.map((b, i) => {
                  const paid = b.paid || 0;
                  const owed = b.amount - paid;
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#0F0F0F', border: '1px solid #212121' }}>
                      <img
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(b.employee.name)}&backgroundColor=76B900&fontFamily=Ubuntu&fontSize=38`}
                        alt={b.employee.name} className="w-9 h-9 rounded-lg shrink-0"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-white">{b.employee.name}</p>
                        <span className={`badge text-xs ${ROLE_COLOR[b.employee.role] || 'bg-gray-500/20 text-gray-400'}`}>{EMPLOYEE_ROLE[b.employee.role] || b.employee.role}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600 font-mono">{b.percent}% от {formatMoney(salary.distributable)}</p>
                        <p className="font-mono font-bold text-primary-400 text-sm">{formatMoney(b.amount)}</p>
                        <div className="flex gap-2 justify-end mt-0.5 text-xs font-mono">
                          <span className="text-green-400">{formatMoney(paid)} ✓</span>
                          {owed > 0.01 && <span className="text-orange-400">{formatMoney(owed)} ещё</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600 text-sm text-center py-4">Добавьте сотрудников в карточке проекта</p>
            )}
          </div>
        )}
      </div>

      {/* Transactions */}
      {project.transactions?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Wallet size={15} className="text-primary-400" /> Транзакции
          </h2>
          <div className="space-y-1.5">
            {project.transactions.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl text-sm"
                style={{ background: '#0F0F0F', border: '1px solid #212121' }}>
                <div className="flex items-center gap-2">
                  <span className={`badge ${t.type === 'income' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {t.type === 'income' ? 'Доход' : 'Расход'}
                  </span>
                  <span className="text-gray-400">{t.description || '—'}</span>
                </div>
                <div className="text-right">
                  <p className={`font-mono font-semibold ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}
                  </p>
                  <p className="text-xs text-gray-600 font-mono">{formatDate(t.date)}</p>
                  <p className="text-xs text-gray-700">{formatDateShort(t.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
