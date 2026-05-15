import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectsApi, financeApi } from '../api/client';
import { formatDate, formatMoney, PROJECT_STATUS, PROJECT_PRIORITY, EMPLOYEE_ROLE, ROLE_COLOR } from '../utils/helpers';
import { ArrowLeft, ExternalLink, Receipt, Users2, Wallet } from 'lucide-react';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [salary, setSalary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([projectsApi.getOne(id), financeApi.getSalary(id)])
      .then(([p, s]) => { setProject(p.data); setSalary(s.data); })
      .catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!project)  return <div className="card text-center py-20 text-gray-600">Проект не найден</div>;

  const balance = project.budget - project.prepayment;

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
            {[
              ['Начало', formatDate(project.startDate)],
              ['Дедлайн', formatDate(project.deadline)],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between items-center">
                <span className="text-gray-600">{l}</span>
                <span className="text-gray-300 font-mono">{v}</span>
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
              <div className="pt-2" style={{ borderTop: '1px solid #1E2A1E' }}>
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
            <div className="flex justify-between">
              <span className="text-gray-600">Предоплата</span>
              <span className="text-green-400 font-mono">{formatMoney(project.prepayment)}</span>
            </div>
            <div className="flex justify-between pt-2" style={{ borderTop: '1px solid #1E2A1E' }}>
              <span className="text-gray-300 font-medium">Остаток к оплате</span>
              <span className={`font-mono font-semibold ${balance > 0 ? 'text-orange-400' : 'text-green-400'}`}>{formatMoney(balance)}</span>
            </div>
          </div>

          {/* Prepayment bar */}
          {project.budget > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Оплачено</span>
                <span className="font-mono">{((project.prepayment / project.budget) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#111A14' }}>
                <div className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all"
                  style={{ width: `${Math.min(100, (project.prepayment / project.budget) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Salary breakdown */}
        {salary && (
          <div className="card md:col-span-2 space-y-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center bg-purple-500/20"><Users2 size={13} className="text-purple-400" /></div>
              Распределение выплат
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['Бюджет', formatMoney(salary.budget), 'text-white', '#182118'],
                [`Налог ${salary.taxRate}%`, `−${formatMoney(salary.tax)}`, 'text-yellow-400', 'rgba(245,158,11,0.1)'],
                ['К распределению', formatMoney(salary.distributable), 'text-primary-400', 'rgba(22,163,74,0.1)'],
                ['Профит студии', formatMoney(salary.companyProfit), 'text-green-400', 'rgba(16,185,129,0.1)'],
              ].map(([l, v, c, bg]) => (
                <div key={l} className="rounded-xl p-3 text-center" style={{ background: bg, border: '1px solid #1E2A1E' }}>
                  <p className="text-xs text-gray-600 mb-1">{l}</p>
                  <p className={`font-mono font-bold text-sm ${c}`}>{v}</p>
                </div>
              ))}
            </div>

            {salary.breakdown.length > 0 ? (
              <div className="space-y-2">
                {salary.breakdown.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#111A14', border: '1px solid #1E2A1E' }}>
                    <img
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(b.employee.name)}&backgroundColor=16a34a&fontFamily=Ubuntu&fontSize=38`}
                      alt={b.employee.name} className="w-9 h-9 rounded-lg shrink-0"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-white">{b.employee.name}</p>
                      <span className={`badge text-xs ${ROLE_COLOR[b.employee.role] || 'bg-gray-500/20 text-gray-400'}`}>{EMPLOYEE_ROLE[b.employee.role] || b.employee.role}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-primary-400">{formatMoney(b.amount)}</p>
                      <p className="text-xs text-gray-600 font-mono">{b.percent}%</p>
                    </div>
                  </div>
                ))}
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
                style={{ background: '#111A14', border: '1px solid #1E2A1E' }}>
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
