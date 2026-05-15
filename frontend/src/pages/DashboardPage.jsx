import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi, projectsApi } from '../api/client';
import { formatDate, formatMoney, daysUntil, PROJECT_STATUS, PROJECT_STAGE } from '../utils/helpers';
import { FolderKanban, Clock, Banknote, Target, TrendingUp, Plus, AlertTriangle } from 'lucide-react';
import { useSync } from '../hooks/useSync';

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
        className={`badge cursor-pointer hover:opacity-80 transition-opacity ${colorMap[value]?.color || 'bg-gray-700 text-gray-300'}`}>
        {colorMap[value]?.label || value} ▾
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 rounded-xl shadow-2xl py-1 min-w-max"
          style={{ background: '#111A14', border: '1px solid #2D3D2D' }}>
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

function StatCard({ icon: Icon, title, value, sub, color, bg }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide">{title}</p>
          <p className={`text-2xl font-bold mt-2 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
          <Icon size={20} className={color} />
        </div>
      </div>
    </div>
  );
}

function DeadlineBadge({ deadline }) {
  const days = daysUntil(deadline);
  if (days === null) return null;
  if (days < 0)   return <span className="badge bg-red-500/20 text-red-400 border border-red-500/30">Просрочен {Math.abs(days)}д</span>;
  if (days === 0) return <span className="badge bg-red-500/20 text-red-400 border border-red-500/30">Сегодня!</span>;
  if (days <= 2)  return <span className="badge bg-red-500/20 text-red-400 border border-red-500/30">{days}д</span>;
  return <span className="badge bg-orange-500/20 text-orange-400 border border-orange-500/30">{days}д</span>;
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const load = () => analyticsApi.getDashboard().then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, [tick]);
  useSync(useCallback(() => setTick(t => t + 1), []));

  const handleQuickPatch = async (id, patch) => {
    setData(prev => ({
      ...prev,
      urgentDeadlines: prev.urgentDeadlines.map(p => p.id === id ? { ...p, ...patch } : p),
    }));
    await projectsApi.patch(id, patch);
  };

  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Дашборд</h1>
          <p className="page-sub">Обзор студии разработки</p>
        </div>
        <Link to="/projects" className="btn-primary">
          <Plus size={16} /> Новый проект
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} title="Активных проектов" value={data?.activeProjects ?? 0}
          sub="В работе прямо сейчас" color="text-primary-500" bg="rgba(22,163,74,0.1)" />
        <StatCard icon={Banknote} title="Ожидаем оплату" value={formatMoney(data?.expectedPayments ?? 0)}
          sub="Дебиторская задолженность" color="text-orange-400" bg="rgba(251,146,60,0.1)" />
        <StatCard icon={Target} title="Лидов в работе" value={data?.newLeads ?? 0}
          sub="Потенциальных клиентов" color="text-purple-400" bg="rgba(119,33,111,0.2)" />
        <StatCard icon={TrendingUp} title="Общий доход" value={formatMoney(data?.totalRevenue ?? 0)}
          sub="По всем транзакциям" color="text-green-400" bg="rgba(74,222,128,0.1)" />
      </div>

      {/* Urgent deadlines */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/20">
              <AlertTriangle size={15} className="text-red-400" />
            </div>
            Горящие дедлайны
            {data?.urgentDeadlines?.length > 0 && (
              <span className="badge bg-red-500/20 text-red-400 border border-red-500/30">
                {data.urgentDeadlines.length}
              </span>
            )}
          </h2>
          <Link to="/projects" className="text-primary-500 text-xs hover:text-primary-400 flex items-center gap-1">
            Все проекты →
          </Link>
        </div>

        {!data?.urgentDeadlines?.length ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-gray-500 text-sm">Горящих дедлайнов нет — отличная работа!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.urgentDeadlines.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl transition-colors"
                style={{ background: '#111A14', border: '1px solid #1E2A1E' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(22,163,74,0.15)' }}>
                  <Clock size={16} className="text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/projects/${p.id}`} className="font-medium text-white text-sm hover:text-primary-400 transition-colors">
                    {p.name}
                  </Link>
                  <p className="text-xs text-gray-600 mt-0.5">{p.client?.name || 'Без клиента'}</p>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    <QuickSelect value={p.status} options={PROJECT_STATUS} colorMap={PROJECT_STATUS}
                      onSelect={v => handleQuickPatch(p.id, { status: v })} />
                    <QuickSelect value={p.stage || 'design'} options={PROJECT_STAGE} colorMap={PROJECT_STAGE}
                      onSelect={v => handleQuickPatch(p.id, { stage: v })} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-600">Дедлайн</p>
                  <p className="text-sm font-medium text-gray-300">{formatDate(p.deadline)}</p>
                  <div className="mt-1"><DeadlineBadge deadline={p.deadline} /></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4">Быстрые действия</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/projects" className="btn-primary"><Plus size={15} /> Новый проект</Link>
          <Link to="/clients" className="btn-secondary"><Plus size={15} /> Новый клиент</Link>
          <Link to="/leads" className="btn-secondary"><Plus size={15} /> Новый лид</Link>
          <Link to="/finance" className="btn-secondary"><Plus size={15} /> Платёж</Link>
        </div>
      </div>
    </div>
  );
}
