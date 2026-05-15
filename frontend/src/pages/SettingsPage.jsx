import React, { useEffect, useState } from 'react';
import { settingsApi } from '../api/client';
import { Settings2, Save, CheckCircle2, Percent, Building2, Coins } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({ tax_rate: '', company_name: '', currency: '₸' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { settingsApi.get().then(r => setSettings(r.data)).finally(() => setLoading(false)); }, []);

  const set = (k, v) => setSettings(p => ({ ...p, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await settingsApi.update(settings); setSaved(true); setTimeout(() => setSaved(false), 2500); }
    catch { alert('Ошибка сохранения'); }
    finally { setSaving(false); }
  };

  const taxRate = parseFloat(settings.tax_rate) || 0;
  const exBudget = 1500000;
  const exTax = (exBudget * taxRate) / 100;
  const exDistrib = exBudget - exTax;

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="page-title flex items-center gap-2"><Settings2 size={24} className="text-primary-500" /> Настройки</h1>
        <p className="page-sub">Конфигурация студии</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Company */}
        <div className="card space-y-5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary-600/20">
              <Building2 size={14} className="text-primary-400" />
            </div>
            Информация о компании
          </h2>
          <div>
            <label className="label">Название студии</label>
            <input className="input" value={settings.company_name || ''} onChange={e => set('company_name', e.target.value)} />
          </div>
          <div>
            <label className="label">Валюта</label>
            <div className="flex gap-2 flex-wrap">
              {[['₸','Тенге'],['₽','Рубль'],['$','Доллар'],['€','Евро']].map(([sym, name]) => (
                <button key={sym} type="button" onClick={() => set('currency', sym)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    settings.currency === sym
                      ? 'bg-primary-600/20 border-primary-500/50 text-primary-400'
                      : 'border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300'}`}
                  style={settings.currency !== sym ? { background: '#1A1A1A' } : {}}>
                  <span className="text-lg">{sym}</span> {name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tax */}
        <div className="card space-y-5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-yellow-500/20">
              <Percent size={14} className="text-yellow-400" />
            </div>
            Налоговые настройки
          </h2>
          <div>
            <label className="label">Процент налога</label>
            <div className="flex items-center gap-3 max-w-xs">
              <input type="number" min="0" max="100" step="0.1" className="input font-mono"
                value={settings.tax_rate || ''} onChange={e => set('tax_rate', e.target.value)} />
              <span className="text-gray-500 text-xl font-light">%</span>
            </div>
            <p className="text-xs text-gray-600 mt-1.5">Вычитается из бюджета перед распределением между командой</p>
          </div>

          {taxRate > 0 && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: '#1A1A1A', border: '1px solid #2E2E2E' }}>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Coins size={12} /> Пример расчёта для 1 500 000 {settings.currency}
              </p>
              {[
                ['Бюджет проекта', `${(1500000).toLocaleString('ru-RU')} ${settings.currency}`, 'text-white'],
                [`Налог (${taxRate}%)`, `−${exTax.toLocaleString('ru-RU')} ${settings.currency}`, 'text-yellow-400'],
              ].map(([l, v, c]) => (
                <div key={l} className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">{l}</span>
                  <span className={`font-mono font-medium ${c}`}>{v}</span>
                </div>
              ))}
              <div className="flex justify-between items-center text-sm pt-2" style={{ borderTop: '1px solid #2E2E2E' }}>
                <span className="text-white font-medium">К распределению</span>
                <span className="font-mono font-bold text-primary-400">{exDistrib.toLocaleString('ru-RU')} {settings.currency}</span>
              </div>
              <p className="text-xs text-gray-700 mt-1">Далее от этой суммы считается % каждого сотрудника</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5">
            <Save size={16} /> {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-green-400 text-sm">
              <CheckCircle2 size={16} /> Сохранено!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
