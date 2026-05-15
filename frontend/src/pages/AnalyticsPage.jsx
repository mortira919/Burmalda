import React, { useEffect, useState } from 'react';
import { analyticsApi } from '../api/client';
import { formatMoney } from '../utils/helpers';
import { BarChart3, TrendingUp, TrendingDown, Users2, FolderKanban, Target, Receipt } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const CHART_COLORS = ['#76B900','#f59e0b','#ef4444','#8b5cf6','#10b981'];

function KpiCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-600 uppercase tracking-wide">{label}</p>
          <p className={`text-xl font-bold font-mono mt-2 ${color}`}>{value}</p>
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
          <Icon size={18} className={color} />
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-sm" style={{ background: '#0F0F0F', border: '1px solid #2A2A2A' }}>
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill }} className="font-mono">{formatMoney(p.value)}</p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    analyticsApi.getMonthly(year, month).then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [year, month]);

  const barData = data ? [
    { name: 'Выручка',  amount: data.revenue,             fill: '#76B900' },
    { name: 'Налог',    amount: data.tax,                  fill: '#f59e0b' },
    { name: 'Расходы',  amount: data.expenses,             fill: '#ef4444' },
    { name: 'Зарплата', amount: data.salaryTotal,          fill: '#8b5cf6' },
    { name: 'Прибыль',  amount: Math.max(0, data.netProfit), fill: '#10b981' },
  ] : [];

  const pieData = data ? [
    { name: 'Налог',    value: data.tax },
    { name: 'Зарплата', value: data.salaryTotal },
    { name: 'Расходы',  value: data.expenses },
    { name: 'Прибыль',  value: Math.max(0, data.netProfit) },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2"><BarChart3 size={24} className="text-primary-500" /> Аналитика</h1>
          <p className="page-sub">Финансовый отчёт</p>
        </div>
        <div className="flex gap-2">
          <select className="input w-auto" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="input w-auto" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-32"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={TrendingUp}  label="Выручка"           value={formatMoney(data?.revenue ?? 0)}    color="text-primary-400" bg="rgba(118,185,0,0.1)" />
            <KpiCard icon={Receipt}     label={`Налог (${data?.taxRate ?? 0}%)`} value={formatMoney(data?.tax ?? 0)} color="text-yellow-400" bg="rgba(245,158,11,0.1)" />
            <KpiCard icon={Users2}      label="Зарплаты"          value={formatMoney(data?.salaryTotal ?? 0)} color="text-purple-400" bg="rgba(139,92,246,0.1)" />
            <KpiCard icon={TrendingDown} label="Чистая прибыль"   value={formatMoney(data?.netProfit ?? 0)}  color={(data?.netProfit ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'} bg="rgba(16,185,129,0.1)" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={TrendingDown} label="Расходы компании" value={formatMoney(data?.expenses ?? 0)}   color="text-red-400"   bg="rgba(239,68,68,0.1)" />
            <KpiCard icon={FolderKanban} label="Закрытых проектов" value={data?.closedProjects ?? 0}         color="text-white"     bg="rgba(255,255,255,0.05)" />
            <KpiCard icon={FolderKanban} label="Активных проектов" value={data?.activeProjects ?? 0}         color="text-primary-400" bg="rgba(118,185,0,0.1)" />
            <KpiCard icon={Target}       label="Новых лидов"       value={data?.newLeads ?? 0}               color="text-purple-400" bg="rgba(119,33,111,0.15)" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card">
              <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
                <BarChart3 size={16} className="text-primary-500" /> Разбивка по статьям
              </h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#212121" />
                  <XAxis dataKey="name" tick={{ fill: '#6B6B6B', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B6B6B', fontSize: 11 }} tickFormatter={v => (v/1000).toFixed(0)+'k'} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
                <TrendingUp size={16} className="text-primary-500" /> Распределение
              </h2>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={40}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#2A2A2A' }}>
                      {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-60 text-gray-700">Нет данных за период</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
